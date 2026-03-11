import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';
export interface CourseGenerationResponse {
  success: boolean;
  message: string;
  data: {
    course: any;
  };
}

export interface CMSCreateCoursePayload {
  course_title: string;
  description: string;
  topic_area: string;
  long_description?: string;
  short_description?: string;
  duration?: number;
  author?: string;
  [key: string]: any;
}

export interface CMSCreateCourseResult {
  systemId: string;
  catId: string;
  baseCatId: string;
  coursePath: string;
  siteId: string;
  courseStatus?: string;
  courseTitle?: string;
  accepted_at?: string;
  cmsResponse?: any;
}

export interface PublishCourseResult {
  cmsResult: CMSCreateCourseResult;
  processId: string;
}

@Injectable({
  providedIn: 'root'
})
export class CourseCreatorService {
  // General AI API — proxied via /ai → https://authoring.qa4.lrn.com (avoids CORS in dev)
  private readonly API_BASE = '/ai/ai-course-creator/api';

  // embed-existing is on https://authoring.qa4.lrn.com.
  // In dev: proxied via /ai (proxy.conf.json). In prod: absolute URL from environment.
  private readonly EMBED_API_BASE = environment.production
    ? `${environment.aiccUrl}/ai/ai-course-creator/api`
    : `${environment.aiccUrl}/ai/ai-course-creator/api`;

  // Base URL for Backend chat/CMS API (Node backend on :3001)
  private readonly BACKEND_API_BASE = '';

  // Loading state
  isGenerating = signal<boolean>(false);

  // Publishing state
  isPublishing = signal<boolean>(false);

  // Last generated course
  lastGeneratedCourse = signal<any>(null);

  // Error state
  error = signal<string | null>(null);

  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Get auth token via AuthService (single source of truth)
   */
  private getAuthToken(): string {
    return this.authService.getToken();
  }

  /**
   * Get username from localStorage
   */
  getUsername(): string {
    if (typeof localStorage !== 'undefined') {
      const user = localStorage.getItem('user');
      if (user) {
        try {
          return JSON.parse(user)?.username || 'ai-creator';
        } catch {
          return 'ai-creator';
        }
      }
    }
    return 'ai-creator';
  }

  /**
   * Generate a course directly from a prompt
   * @param userPrompt - The course creation prompt
   * @returns Promise with the generated course data
   */
  async generateCourse(userPrompt: string): Promise<any> {
    this.isGenerating.set(true);
    this.error.set(null);

    try {
      console.log('[Course Creator] Generating course with prompt:', userPrompt);
      const token = this.getAuthToken();

      const response = await firstValueFrom(
        this.http.post<CourseGenerationResponse>(
          `${this.API_BASE}/promptCourse/generate-direct`,
          { userPrompt },
          {
            headers: new HttpHeaders({
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            })
          }
        )
      );

      if (response.success && response.data?.course) {
        console.log('[Course Creator] Course generated successfully');
        this.lastGeneratedCourse.set(response.data.course);
        return response.data.course;
      } else {
        throw new Error('Invalid response from course creator API');
      }

    } catch (error: any) {
      console.error('[Course Creator] Error generating course:', error);
      const errorMessage = error.error?.message || error.message || 'Failed to generate course';
      this.error.set(errorMessage);
      throw error;
    } finally {
      this.isGenerating.set(false);
    }
  }

  /**
   * Step 1 – Create the course shell in CMS via the backend /api/action/accept endpoint.
   * Returns the CMS identifiers needed for step 2.
   */
  async createCourseInCMS(
    payload: CMSCreateCoursePayload,
    sessionId?: string
  ): Promise<CMSCreateCourseResult> {
    const token = this.getAuthToken();

    console.log('[Course Creator] Step 1 – Creating course shell in CMS...');

    const response = await fetch(`${this.BACKEND_API_BASE}/api/action/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        data: payload,
        context: sessionId ? { sessionId } : undefined
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      const message = result.message || result.error || `CMS error ${response.status}`;
      console.error('[Course Creator] CMS creation failed:', result);
      throw new Error(message);
    }

    console.log('[Course Creator] CMS course shell created:', result.data?.systemId);

    const data = result.data;
    return {
      systemId: data.systemId,
      catId: data.catId,
      baseCatId: data.baseCatId,
      coursePath: data.coursePath,
      siteId: data.siteId,
      courseStatus: data.courseStatus,
      courseTitle: data.courseTitle || payload.course_title,
      accepted_at: data.accepted_at,
      cmsResponse: result
    };
  }

  /**
   * Step 2 – Embed the already-generated course JSON into CMS.
   * Skips AI re-generation — uses courseJson produced by the chat agent.
   * Runs asynchronously in the background; returns a processId to track progress.
   */
  async embedCourseContent(
    courseJson: any,
    cmsIds: CMSCreateCourseResult
  ): Promise<string> {
    const username = this.getUsername();
    const token = this.getAuthToken();

    console.log('[Course Creator] Step 2 – Embedding existing course JSON into CMS...');
    console.log('[Course Creator] Using CMS IDs:', {
      systemId: cmsIds.systemId,
      coursePath: cmsIds.coursePath,
      catId: cmsIds.catId
    });

    const response = await firstValueFrom(
      this.http.post<any>(
        `${this.EMBED_API_BASE}/promptCourse/embed-existing`,
        {
          courseJson,
          systemId: cmsIds.systemId,
          coursePath: cmsIds.coursePath,
          catId: cmsIds.catId,
          username
        },
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          })
        }
      )
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to start course embedding');
    }

    console.log('[Course Creator] Embedding started, processId:', response.data?.processId);
    return response.data?.processId || '';
  }

  /**
   * Full publish flow:
   *   1. Create course shell in CMS  → get systemId, coursePath, catId
   *   2. Embed full content           → returns processId (runs in background)
   */
  async publishCourse(
    coursePayload: CMSCreateCoursePayload,
    courseJson: any,
    sessionId?: string
  ): Promise<PublishCourseResult> {
    this.isPublishing.set(true);
    this.error.set(null);

    try {
      // Step 1 – Create shell in CMS
      const cmsResult = await this.createCourseInCMS(coursePayload, sessionId);

      // Step 2 – Embed existing course JSON into CMS (no AI re-generation)
      const processId = await this.embedCourseContent(courseJson, cmsResult);

      console.log('[Course Creator] ✅ Course published successfully');
      return { cmsResult, processId };

    } catch (error: any) {
      console.error('[Course Creator] Publish failed:', error);
      const errorMessage = error.error?.message || error.message || 'Failed to publish course';
      this.error.set(errorMessage);
      throw error;
    } finally {
      this.isPublishing.set(false);
    }
  }

  /**
   * Clear the last generated course
   */
  clearCourse(): void {
    this.lastGeneratedCourse.set(null);
    this.error.set(null);
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.error.set(null);
  }
}
