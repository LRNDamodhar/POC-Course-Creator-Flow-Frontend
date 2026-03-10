import { Component, computed, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chat, CourseOutlineData, TemplateData, CMSResponseData } from '../../services/chat';
import { CourseCreatorService, CMSCreateCoursePayload, PublishCourseResult } from '../../services/course-creator';
import { CourseOutlinePreview } from '../course-outline-preview/course-outline-preview';
import { CourseDataPreview } from '../course-data-preview/course-data-preview';

@Component({
  selector: 'app-chat-preview',
  imports: [CommonModule, CourseOutlinePreview, CourseDataPreview],
  templateUrl: './chat-preview.html',
  styleUrl: './chat-preview.css',
})
export class ChatPreview {
  selectedMessage = computed(() => this.chatService.selectedMessage());

  // Show latest course outline from any message (not just selected)
  courseOutline = computed<CourseOutlineData | null>(() => {
    const selected = this.selectedMessage();
    if (selected && selected.courseOutline) {
      return selected.courseOutline;
    }
    const messages = this.chatService.messages();
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg && msg.courseOutline) {
        return msg.courseOutline;
      }
    }
    return null;
  });

  // Show latest course data from any message (not just selected)
  courseData = computed<any | null>(() => {
    const selected = this.selectedMessage();
    if (selected && selected.courseData) {
      return selected.courseData;
    }
    const messages = this.chatService.messages();
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg && msg.courseData) {
        return msg.courseData;
      }
    }
    return null;
  });

  cmsData = computed<CMSResponseData | null>(() => {
    const selected = this.selectedMessage();
    return selected?.cmsData || null;
  });

  // Signal to control showing only accepted items
  @Output() collapse = new EventEmitter<void>();

  showOnlyAccepted = signal(false);

  // Publish state signals
  isPublishing = signal<boolean>(false);
  publishError = signal<string | null>(null);
  publishSuccess = signal<PublishCourseResult | null>(null);

  constructor(
    private chatService: Chat,
    private courseCreatorService: CourseCreatorService
  ) {}

  toggleShowOnlyAccepted() {
    this.showOnlyAccepted.set(!this.showOnlyAccepted());
  }

  saveDraft() {
    const message = this.selectedMessage();
    if (!message) {
      alert('No content to save');
      return;
    }
    console.log('[Preview] Saving draft...');
    const draftData = {
      courseData: message.courseData,
      courseOutline: message.courseOutline,
      templateData: message.templateData,
      savedAt: new Date().toISOString()
    };
    console.log('[Preview] Draft data:', draftData);
    alert('Draft saved successfully! (Implementation pending)');
  }

  /**
   * Derive a CMS-ready payload from whatever course data exists in the preview.
   * Handles both simple courseData (create_course tool) and full courseOutline.
   */
  private buildCMSPayload(): CMSCreateCoursePayload | null {
    const outline = this.courseOutline();
    const data = this.courseData();

    if (outline) {
      return {
        course_title: outline.title || 'Untitled Course',
        description: outline.description || '',
        long_description: outline.description || '',
        short_description: outline.description
          ? outline.description.substring(0, 200)
          : '',
        topic_area: outline.targetAudience || outline.title || '',
        duration: 0
      };
    }

    if (data) {
      return {
        course_title: data.title || data.course_title || 'Untitled Course',
        description: data.description || data.short_description || '',
        long_description: data.description || '',
        short_description: (data.description || data.short_description || '').substring(0, 200),
        topic_area: data.topicArea || data.topic_area || data.title || '',
        duration: 0
      };
    }

    return null;
  }

  /**
   * Derive the original user prompt that generated the course.
   * Walks back through chat messages to find the last user message
   * before the message that contains course data/outline.
   */
  private deriveUserPrompt(): string {
    const messages = this.chatService.messages();

    // Find the assistant message that has the course outline/data
    let targetIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.courseOutline || msg.courseData) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex > 0) {
      // Walk back to find the last user message before it
      for (let i = targetIndex - 1; i >= 0; i--) {
        if (messages[i].sender === 'user') {
          return messages[i].content;
        }
      }
    }

    // Fallback: last user message in the whole conversation
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        return messages[i].content;
      }
    }

    return '';
  }

  async publishCourse(): Promise<void> {
    // Reset previous publish state
    this.publishError.set(null);
    this.publishSuccess.set(null);

    const cmsPayload = this.buildCMSPayload();
    if (!cmsPayload) {
      this.publishError.set('No course data available to publish. Please generate a course first.');
      return;
    }

    // Use the already-generated course JSON — no re-generation needed
    const courseJson = this.courseOutline() || this.courseData();
    if (!courseJson) {
      this.publishError.set('No course data found to embed. Please generate a course first.');
      return;
    }

    const sessionId = this.chatService.sessionId() || undefined;

    this.isPublishing.set(true);
    console.log('[Preview] Publishing course...', { cmsPayload, sessionId });

    try {
      const result = await this.courseCreatorService.publishCourse(
        cmsPayload,
        courseJson,
        sessionId
      );

      console.log('[Preview] Publish successful:', result);
      this.publishSuccess.set(result);

      // Persist CMS data onto the message so the CMS info panel appears
      const selected = this.selectedMessage();
      if (selected) {
        const targetMsg = selected.courseOutline
          ? selected
          : this.chatService.messages().find(m => m.courseOutline || m.courseData);

        if (targetMsg) {
          this.chatService.updateMessage(targetMsg.id, {
            cmsData: result.cmsResult
          });
        }
      }

    } catch (error: any) {
      console.error('[Preview] Publish failed:', error);
      this.publishError.set(error.message || 'Failed to publish course. Please try again.');
    } finally {
      this.isPublishing.set(false);
    }
  }

  dismissPublishError(): void {
    this.publishError.set(null);
  }

  dismissPublishSuccess(): void {
    this.publishSuccess.set(null);
  }

  copyToClipboard(text: string) {
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy content');
      });
    }
  }

  copyCMSResponse(cmsResponse: any) {
    if (cmsResponse) {
      const jsonString = JSON.stringify(cmsResponse, null, 2);
      navigator.clipboard.writeText(jsonString).then(() => {
        alert('CMS response copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy CMS response');
      });
    }
  }

  exportMessage() {
    const message = this.selectedMessage();
    if (message) {
      const data = {
        id: message.id,
        sender: message.sender,
        content: message.content,
        timestamp: message.timestamp,
        status: message.status,
        courseData: message.courseData,
        courseOutline: message.courseOutline
      };
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `message-${message.id}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  }
}
