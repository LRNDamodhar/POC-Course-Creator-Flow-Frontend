import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

export interface ActionButton {
  type: string;
  label: string;
  description: string;
  templateName?: string;
  templateData?: {
    templateName: string;
    template: any;
    filledTemplate?: any;  // Add filled template JSON
  };
  score?: number;
  category?: string;
  usage?: string;
  reason?: string;
  lessonInfo?: TemplateLessonInfo;
  index?: number;
}

export interface TemplateRecommendation {
  templateName: string;
  template: any;
  score: number;
  reason: string;
  category: string;
  usage: string;
}

export interface TemplateLessonInfo {
  topic: string;
  module: string;
  lesson: string;
  complexity: string;
  learningObjective?: string;
}

export interface TemplateData {
  recommendations: TemplateRecommendation[];
  actions: ActionButton[];
  lessonInfo: TemplateLessonInfo;
}

export interface LessonData {
  lessonNumber: number;
  title: string;
  objectives: string[];
  duration: string;
  accepted?: boolean;
  template?: {
    templateName: string;        // Technical name (e.g., "saq")
    displayName?: string;        // User-friendly name (e.g., "Quiz - Multiple Choice")
    templateType?: string;
    category?: string;
    messageId?: string;
    linkedAt?: Date;
    // Complete filled template JSON
    templateJson?: any;
    // Raw template with placeholders
    rawTemplate?: any;
    // Metadata about the template
    metadata?: {
      score?: number;
      reason?: string;
      usage?: string;
    };
  };
}

export interface ModuleData {
  moduleNumber: number;
  title: string;
  description: string;
  lessonsCount: number;
  lessons: LessonData[];
  accepted?: boolean;
}

export interface CourseOutlineData {
  title: string;
  description: string;
  targetAudience: string;
  duration: string;
  totalModules: number;
  totalLessons: number;
  modules: ModuleData[];
  created_at: string;
  status: string;
}

export interface CMSResponseData {
  systemId?: string;
  siteId?: string;
  catId?: string;
  baseCatId?: string;
  coursePath?: string;
  courseStatus?: string;
  courseTitle?: string;
  accepted_at?: string;
  cmsResponse?: any;
}

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'assistant';
  status?: 'sending' | 'sent' | 'error' | 'accepted' | 'rejected';
  isStreaming?: boolean;
  actions?: ActionButton[];
  courseData?: any;
  courseOutline?: CourseOutlineData;
  templateData?: TemplateData;
  cmsData?: CMSResponseData;
  recommendations?: RecommendationItem[];
  toolCalled?: boolean;
  toolType?: 'create_course' | 'create_course_outline' | 'recommend_templates';
  // Quick start prompt chips shown inside the welcome greeting message
  quickStartPrompts?: Array<{ id: string; title: string; prompt: string; icon: string }>;
  // User feedback on assistant response
  feedback?: 'like' | 'dislike' | null;
}

export interface RecommendationItem {
  id: string;
  text: string;
  description: string;
  icon: string;
  priority: number;
  type: 'recommendation';
}

@Injectable({
  providedIn: 'root',
})
export class Chat {
  private messagesSignal = signal<ChatMessage[]>([]);
  private selectedMessageSignal = signal<ChatMessage | null>(null);
  private isLoadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  private sessionIdSignal = signal<string | null>(null);

  messages = this.messagesSignal.asReadonly();
  selectedMessage = this.selectedMessageSignal.asReadonly();
  isLoading = this.isLoadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();
  sessionId = this.sessionIdSignal.asReadonly();

  // Use relative URL to leverage proxy configuration
  private apiUrl = '';

  constructor(private http: HttpClient, private authService: AuthService) {
    // Session is created only when user clicks "New Chat" or sends the first message
  }

  /**
   * Get auth token via AuthService (single source of truth)
   * @returns Auth token or empty string if not found
   */
  private getAuthToken(): string {
    return this.authService.getToken();
  }

  /**
   * Get headers with auth token
   * @returns Headers object with Content-Type and Authorization
   */
  private getAuthHeaders(): HeadersInit {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  addMessage(content: string, sender: 'user' | 'assistant' = 'user', status: 'sending' | 'sent' | 'error' = 'sent') {
    const message: ChatMessage = {
      id: `${sender}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      timestamp: new Date(),
      sender,
      status
    };
    this.messagesSignal.update(messages => [...messages, message]);
    return message;
  }

  /**
   * Add the welcome greeting message with quick-start prompt chips.
   * Called when starting a fresh session with no history.
   */
  addWelcomeMessage(): void {
    const welcome: ChatMessage = {
      id: `assistant-welcome-${Date.now()}`,
      content: "👋 **Welcome to AI Course Creator!**\n\nI can help you build engaging courses in minutes. Describe what you'd like to create, or pick a quick-start template below:",
      timestamp: new Date(),
      sender: 'assistant',
      status: 'sent',
      quickStartPrompts: [
        {
          id: 'anti-bribery',
          title: 'Anti-Bribery & Corruption',
          prompt: 'Create a 2-lesson course on Anti-Bribery and Corruption',
          icon: '⚖️'
        },
        {
          id: 'harassment',
          title: 'Harassment Prevention',
          prompt: 'Create a 10-lesson course on Workplace Harassment Prevention',
          icon: '🛡️'
        }
      ]
    };
    this.messagesSignal.update(messages => [...messages, welcome]);
  }

  updateMessage(messageId: string, updates: Partial<ChatMessage>) {
    this.messagesSignal.update(messages => 
      messages.map(msg => msg.id === messageId ? { ...msg, ...updates } : msg)
    );
    
    // Update selected message if it's the one being updated
    if (this.selectedMessage()?.id === messageId) {
      const updatedMessage = this.messages().find(m => m.id === messageId);
      if (updatedMessage) {
        this.selectMessage(updatedMessage);
      }
    }
  }

  selectMessage(message: ChatMessage | null) {
    this.selectedMessageSignal.set(message);
  }

  async createNewSession(): Promise<string | null> {
    try {
      console.log('[Chat Service] Creating new session...');
      const response = await fetch(`${this.apiUrl}/api/session/create`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const newSessionId = data.sessionId;
      
      console.log('[Chat Service] New session created:', newSessionId);
      this.sessionIdSignal.set(newSessionId);
      
      return newSessionId;
    } catch (error) {
      console.error('[Chat Service] Error creating session:', error);
      this.errorSignal.set('Failed to create session');
      return null;
    }
  }

  async clearMessages() {
    this.messagesSignal.set([]);
    this.selectedMessageSignal.set(null);
    this.sessionIdSignal.set(null); // Clear session ID — new session created by newChat()
  }

  clearError() {
    this.errorSignal.set(null);
  }

  async sendMessageToBackend(content: string): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    // Ensure we have a session before sending message
    if (!this.sessionId()) {
      console.log('[Chat Service] No session found, creating one before sending message...');
      await this.createNewSession();
    }

    // Add user message
    const userMessage = this.addMessage(content, 'user', 'sent');
    this.selectMessage(userMessage);
    
    try {
      // Small delay to ensure user message is rendered first
      await new Promise(resolve => setTimeout(resolve, 50));

      // Create assistant message placeholder
      const assistantMessage = this.addMessage('', 'assistant', 'sending');
      this.updateMessage(assistantMessage.id, { isStreaming: true });
      this.selectMessage(assistantMessage);

      // Call streaming API
      await this.streamResponse(content, assistantMessage.id);

    } catch (error: any) {
      console.error('Error sending message:', error);
      this.errorSignal.set(error.message || 'Failed to send message');
      this.updateMessage(userMessage.id, { status: 'error' });
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  private async streamResponse(input: string, messageId: string): Promise<void> {
    try {
      // Get accepted items to send as context
      const acceptedItems = this.getAcceptedItems();
      
      // Extract the most recently accepted lesson/module for context
      let selectedTopic: string | undefined;
      let selectedLesson: string | undefined;
      let selectedModule: string | undefined;
      
      // Use the most recent accepted lesson if available
      if (acceptedItems.acceptedLessons.length > 0) {
        const recentLesson = acceptedItems.acceptedLessons[acceptedItems.acceptedLessons.length - 1];
        selectedLesson = recentLesson.lesson.title;
        selectedModule = recentLesson.module.title;
        selectedTopic = recentLesson.module.title; // Use module title as topic
      } 
      // Otherwise use the most recent accepted module
      else if (acceptedItems.acceptedModules.length > 0) {
        const recentModule = acceptedItems.acceptedModules[acceptedItems.acceptedModules.length - 1];
        selectedModule = recentModule.module.title;
        selectedTopic = recentModule.module.title; // Use module title as topic
      }
      
      console.log('[Chat Service] Sending context:', { selectedTopic, selectedLesson, selectedModule });
      
      const response = await fetch(`${this.apiUrl}/api/turn/stream`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          input,
          sessionId: this.sessionId(), // Send current session ID
          selectedTopic,
          selectedLesson,
          selectedModule
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';
      let backendAssistantMessageId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'connected') {
                // Store session ID from backend
                console.log('Session connected:', parsed.sessionId);
                this.sessionIdSignal.set(parsed.sessionId);
              } else if (parsed.type === 'content' && parsed.data) {
                accumulatedContent += parsed.data;
                this.updateMessage(messageId, { 
                  content: accumulatedContent,
                  status: 'sending'
                });
              } else if (parsed.type === 'template_recommendations') {
                // Handle template recommendations event
                console.log('Received template recommendations:', parsed);
                if (parsed.recommendations && parsed.recommendations.length > 0) {
                  this.updateMessage(messageId, { 
                    templateData: {
                      recommendations: parsed.recommendations,
                      actions: parsed.actions || [],
                      lessonInfo: parsed.lessonInfo || {}
                    },
                    actions: parsed.actions || [],  // Set actions on the message
                    toolCalled: true,
                    toolType: 'recommend_templates'
                  });
                }
              } else if (parsed.type === 'course_data' && parsed.data) {
                // Handle course data event - determine if it's outline or simple course
                console.log('Received course data:', parsed.data);
                const isOutline = parsed.data.modules && parsed.data.totalModules;
                if (isOutline) {
                  this.updateMessage(messageId, { 
                    courseOutline: parsed.data,
                    toolCalled: true,
                    toolType: 'create_course_outline'
                  });
                } else {
                  this.updateMessage(messageId, { 
                    courseData: parsed.data,
                    toolCalled: true,
                    toolType: 'create_course'
                  });
                }
              } else if (parsed.type === 'recommendations') {
                // Handle smart recommendations
                console.log('[Chat Service] Received recommendations:', parsed.data);
                this.updateMessage(messageId, { 
                  recommendations: parsed.data
                });
              } else if (parsed.type === 'done') {
                // Capture backend message IDs
                if (parsed.assistantMessageId) {
                  backendAssistantMessageId = parsed.assistantMessageId;
                  console.log('[Chat Service] Captured backend assistant message ID:', backendAssistantMessageId);
                }
                
                // Determine tool type from course data
                const courseData = parsed.courseData;
                const isOutline = courseData?.modules && courseData?.totalModules;
                
                // Get current message to preserve templateData and existing actions
                const currentMessage = this.messages().find(m => m.id === messageId);
                const hasTemplateData = currentMessage?.templateData;
                
                this.updateMessage(messageId, { 
                  status: 'sent',
                  isStreaming: false,
                  // Preserve existing actions if they exist (e.g., from template_recommendations)
                  // Otherwise use actions from parsed
                  actions: currentMessage?.actions?.length ? currentMessage.actions : (parsed.actions || []),
                  courseData: isOutline ? undefined : courseData,
                  courseOutline: isOutline ? courseData : undefined,
                  toolCalled: !!(courseData || parsed.actions?.length || hasTemplateData),
                  toolType: hasTemplateData ? 'recommend_templates' : (isOutline ? 'create_course_outline' : (courseData ? 'create_course' : undefined))
                });
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message || 'Streaming error');
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }

      // Update message with backend ID if we received one
      if (backendAssistantMessageId) {
        console.log('[Chat Service] Updating message ID from', messageId, 'to', backendAssistantMessageId);
        // Create a new message with the backend ID
        const currentMessage = this.messages().find(m => m.id === messageId);
        if (currentMessage) {
          // Remove old message
          this.messagesSignal.update(messages => messages.filter(m => m.id !== messageId));
          // Add new message with backend ID
          const updatedMessage = { ...currentMessage, id: backendAssistantMessageId };
          this.messagesSignal.update(messages => [...messages, updatedMessage]);
          // Select the updated message
          this.selectMessage(updatedMessage);
        }
      } else {
        // Ensure final status is set
        this.updateMessage(messageId, { 
          status: 'sent',
          isStreaming: false
        });
      }

    } catch (error: any) {
      console.error('Streaming error:', error);
      this.updateMessage(messageId, { 
        content: 'Error: Failed to get response from server',
        status: 'error',
        isStreaming: false
      });
      throw error;
    }
  }

  // Non-streaming fallback method
  async sendMessageToBackendNonStreaming(content: string): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    const userMessage = this.addMessage(content, 'user', 'sent');
    this.selectMessage(userMessage);
    
    try {
      const response = await fetch(`${this.apiUrl}/api/turn`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ input: content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.output) {
        const assistantMessage = this.addMessage(data.output, 'assistant', 'sent');
        this.updateMessage(assistantMessage.id, { 
          actions: data.actions || [],
          courseData: data.course
        });
        this.selectMessage(assistantMessage);
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      this.errorSignal.set(error.message || 'Failed to send message');
      this.updateMessage(userMessage.id, { status: 'error' });
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Update message status in database (accept/reject)
   */
  private async updateMessageStatusInDB(
    messageId: string, 
    type: 'accept' | 'reject',
    lessonInfo?: { moduleNumber?: number; module?: string; lessonNumber?: number; lesson?: string },
    templateData?: any
  ): Promise<void> {
    const sessionId = this.sessionId();
    
    if (!sessionId) {
      console.warn('[Chat Service] No session ID available for message status update');
      return;
    }

    try {
      // Build request body with optional lesson and template data
      const requestBody: any = {
        sessionId,
        messageId,
        type
      };

      // If lessonInfo and templateData are provided, include them for template acceptance
      if (lessonInfo && templateData) {
        requestBody.lessonInfo = lessonInfo;
        requestBody.templateData = {
          templateName: templateData.recommendations?.[0]?.templateName || templateData.templateName,
          category: templateData.recommendations?.[0]?.category || templateData.category,
          filledTemplate: templateData.recommendations?.[0]?.template || templateData.filledTemplate,
          ...templateData
        };
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('[Chat Service] 📤 TEMPLATE ACCEPTANCE DATA BEING SENT:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Lesson Info:', JSON.stringify(lessonInfo, null, 2));
        console.log('Template Data:', JSON.stringify({
          templateName: requestBody.templateData.templateName,
          category: requestBody.templateData.category,
          hasFilledTemplate: !!requestBody.templateData.filledTemplate
        }, null, 2));
        console.log('Full Request Body:', JSON.stringify(requestBody, null, 2));
        console.log('═══════════════════════════════════════════════════════════');
      } else {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('[Chat Service] 📤 REGULAR MESSAGE ACCEPTANCE:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Request Body:', JSON.stringify(requestBody, null, 2));
        console.log('═══════════════════════════════════════════════════════════');
      }

      const response = await fetch(`${this.apiUrl}/api/message/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log(`[Chat Service] Message status updated in DB to '${type}ed':`, data.data);
        if (lessonInfo && templateData) {
          console.log('[Chat Service] Template linked to lesson successfully');
        }
      } else {
        console.warn('[Chat Service] Failed to update message status in DB:', data);
      }

    } catch (error: any) {
      console.error('[Chat Service] Error updating message status in DB:', error);
      // Don't throw error - this is a background operation
    }
  }

  async acceptMessage(
    messageId: string,
    lessonInfo?: { moduleNumber?: number; module?: string; lessonNumber?: number; lesson?: string },
    templateData?: any
  ): Promise<void> {
    const message = this.messages().find(m => m.id === messageId);
    if (!message) return;

    try {
      // Update the message status to accepted
      this.updateMessage(message.id, { 
        status: 'accepted',
        actions: [] // Remove actions after accept
      });
      
      // Keep the same message selected to show the green border
      this.selectMessage(message);

      // Update message status in database using the message's current ID
      // If lessonInfo and templateData are provided, this is a template acceptance for a lesson
      await this.updateMessageStatusInDB(message.id, 'accept', lessonInfo, templateData);

      console.log('[Chat Service] Message accepted:', message.id);
      if (lessonInfo && templateData) {
        console.log('[Chat Service] Template accepted for lesson:', lessonInfo, templateData.templateName);
        
        // Reload session to get updated course outline with template information
        console.log('[Chat Service] Reloading session to update course outline...');
        await this.reloadCurrentSession();
        console.log('[Chat Service] ✓ Course outline updated with template information');
      }

    } catch (error: any) {
      console.error('Error accepting message:', error);
      this.errorSignal.set(error.message || 'Failed to accept message');
    }
  }

  async rejectMessage(messageId: string, feedback?: string): Promise<void> {
    const message = this.messages().find(m => m.id === messageId);
    if (!message) return;

    try {
      const response = await fetch(`${this.apiUrl}/api/action/reject`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ 
          data: message.courseData || { output: message.content },
          feedback: feedback || 'Content needs revision',
          context: { messageId: message.id, timestamp: message.timestamp }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update the message status to rejected and remove actions
        this.updateMessage(message.id, { 
          status: 'rejected',
          actions: [] // Remove actions after reject
        });
        
        // Keep the same message selected to show the red border
        this.selectMessage(message);

        // Update message status in database using the message's current ID
        await this.updateMessageStatusInDB(message.id, 'reject');
      }

    } catch (error: any) {
      console.error('Error rejecting message:', error);
      this.errorSignal.set(error.message || 'Failed to reject message');
    }
  }

  /**
   * Restore a session from historical data
   */
  restoreSession(sessionData: any): void {
    try {
      console.log('[Chat Service] Restoring session:', sessionData.sessionId);

      // Set session ID
      this.sessionIdSignal.set(sessionData.sessionId);

      // Restore messages — keep any welcome message already in the list,
      // then append the historical messages after it.
      if (sessionData.messages && Array.isArray(sessionData.messages)) {
        const restoredMessages: ChatMessage[] = sessionData.messages.map((msg: any) => ({
          id: msg.messageId || `${msg.sender}-${Date.now()}`,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          sender: msg.sender as 'user' | 'assistant',
          status: (msg.status || 'sent') as 'sending' | 'sent' | 'error' | 'accepted' | 'rejected',
          courseData: msg.courseData || null,
          courseOutline: msg.courseOutline || null,
          templateData: msg.templateData || null,
          toolCalled: msg.toolCalled || false,
          toolType: msg.toolType,
          actions: []
        }));

        this.messagesSignal.set(restoredMessages);

        console.log('[Chat Service] Restored', restoredMessages.length, 'messages');

        // Select the last message
        if (restoredMessages.length > 0) {
          this.selectMessage(restoredMessages[restoredMessages.length - 1]);
        }
      }

      console.log('[Chat Service] Session restored successfully');
    } catch (error) {
      console.error('[Chat Service] Error restoring session:', error);
      this.errorSignal.set('Failed to restore session');
    }
  }

  /**
   * Reload current session from database to get updated data
   */
  async reloadCurrentSession(): Promise<boolean> {
    try {
      const sessionId = this.sessionId();
      if (!sessionId) {
        console.log('[Chat Service] No active session to reload');
        return false;
      }

      console.log('[Chat Service] Reloading session:', sessionId);

      const response = await fetch(`${this.apiUrl}/api/session/${sessionId}/history`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        console.error('[Chat Service] Failed to reload session');
        return false;
      }

      const data = await response.json();
      
      if (data.success && data.history) {
        // Store currently selected message ID
        const currentlySelectedId = this.selectedMessage()?.id;

        // Restore the session with updated data
        this.restoreSession({
          sessionId: sessionId,
          messages: data.history
        });

        // Re-select the same message if it still exists
        if (currentlySelectedId) {
          const message = this.messages().find(m => m.id === currentlySelectedId);
          if (message) {
            this.selectMessage(message);
          }
        }
        
        console.log('[Chat Service] ✓ Session reloaded successfully with updated data');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Chat Service] Error reloading session:', error);
      return false;
    }
  }

  /**
   * Load the most recent session from the database
   */
  async loadLastSession(): Promise<boolean> {
    try {
      console.log('[Chat Service] Loading last session...');

      const response = await fetch(`${this.apiUrl}/api/sessions/all?limit=1&sortBy=lastActivity&order=desc`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        console.log('[Chat Service] Failed to fetch sessions');
        return false;
      }

      const data = await response.json();
      
      if (data.success && data.sessions && data.sessions.length > 0) {
        const lastSession = data.sessions[0];
        console.log('[Chat Service] Found last session:', lastSession.sessionId);
        
        // Load the session history
        const historyResponse = await fetch(`${this.apiUrl}/api/session/${lastSession.sessionId}/history`, {
          method: 'GET',
          headers: this.getAuthHeaders()
        });

        if (!historyResponse.ok) {
          console.log('[Chat Service] Failed to fetch session history');
          return false;
        }

        const historyData = await historyResponse.json();
        
        if (historyData.success) {
          // Restore the session
          this.restoreSession({
            sessionId: lastSession.sessionId,
            messages: historyData.history
          });
          
          console.log('[Chat Service] Last session loaded successfully');
          return true;
        }
      } else {
        console.log('[Chat Service] No previous sessions found');
        return false;
      }

      return false;
    } catch (error) {
      console.error('[Chat Service] Error loading last session:', error);
      return false;
    }
  }

  // Get all accepted modules and lessons from course outlines
  getAcceptedItems() {
    const acceptedModules: Array<{type: 'module', module: ModuleData, messageId: string}> = [];
    const acceptedLessons: Array<{type: 'lesson', lesson: LessonData, module: ModuleData, messageId: string}> = [];

    // Access the signal directly to ensure computed signals track changes
    const messages = this.messagesSignal();
    console.log('[Chat Service] getAcceptedItems - checking messages:', messages.length);
    
    messages.forEach(msg => {
      if (msg.courseOutline) {
        console.log('[Chat Service] Message has courseOutline:', msg.id);
        msg.courseOutline.modules.forEach(module => {
          console.log(`[Chat Service] Module ${module.moduleNumber} accepted status:`, module.accepted);
          if (module.accepted === true) {
            acceptedModules.push({
              type: 'module',
              module: module,
              messageId: msg.id
            });
            console.log(`[Chat Service] Added accepted module: ${module.title}`);
          }
          module.lessons.forEach(lesson => {
            console.log(`[Chat Service] Lesson ${lesson.lessonNumber} accepted status:`, lesson.accepted);
            if (lesson.accepted === true) {
              acceptedLessons.push({
                type: 'lesson',
                lesson: lesson,
                module: module,
                messageId: msg.id
              });
              console.log(`[Chat Service] Added accepted lesson: ${lesson.title}`);
            }
          });
        });
      }
    });

    console.log('[Chat Service] Total accepted modules:', acceptedModules.length);
    console.log('[Chat Service] Total accepted lessons:', acceptedLessons.length);
    return { acceptedModules, acceptedLessons };
  }

  // Remove an accepted item
  removeAcceptedItem(messageId: string, moduleNumber: number, lessonNumber?: number) {
    const currentMessages = this.messagesSignal();
    const updatedMessages = currentMessages.map(msg => {
      if (msg.id === messageId && msg.courseOutline) {
        const updatedModules = msg.courseOutline.modules.map(module => {
          if (module.moduleNumber === moduleNumber) {
            if (lessonNumber !== undefined) {
              // Reset lesson
              const updatedLessons = module.lessons.map(lesson => 
                lesson.lessonNumber === lessonNumber 
                  ? { ...lesson, accepted: undefined }
                  : lesson
              );
              return { ...module, lessons: updatedLessons };
            } else {
              // Reset module
              return { ...module, accepted: undefined };
            }
          }
          return module;
        });
        return {
          ...msg,
          courseOutline: {
            ...msg.courseOutline,
            modules: updatedModules
          }
        };
      }
      return msg;
    });
    this.messagesSignal.set(updatedMessages);
    
    // Update selected message if it's the one being modified
    const selectedMsg = this.selectedMessageSignal();
    if (selectedMsg && selectedMsg.id === messageId) {
      const updatedSelected = updatedMessages.find(m => m.id === messageId);
      if (updatedSelected) {
        this.selectedMessageSignal.set(updatedSelected);
      }
    }
  }

  // Update course outline for a message
  updateMessageCourseOutline(messageId: string, courseOutline: CourseOutlineData) {
    console.log('[Chat Service] updateMessageCourseOutline called for message:', messageId);
    console.log('[Chat Service] New courseOutline:', courseOutline);
    
    const currentMessages = this.messagesSignal();
    const updatedMessages = currentMessages.map(msg => {
      if (msg.id === messageId) {
        console.log('[Chat Service] Found message to update:', msg.id);
        return {
          ...msg,
          courseOutline: courseOutline
        };
      }
      return msg;
    });
    
    console.log('[Chat Service] Setting updated messages, count:', updatedMessages.length);
    this.messagesSignal.set(updatedMessages);
    
    // Update selected message if it's the one being modified
    const selectedMsg = this.selectedMessageSignal();
    if (selectedMsg && selectedMsg.id === messageId) {
      this.selectedMessageSignal.set({
        ...selectedMsg,
        courseOutline: courseOutline
      });
      console.log('[Chat Service] Also updated selectedMessage');
    }
    
    console.log('[Chat Service] Updated course outline for message:', messageId);
  }

  // Update course outline status in database (accept/reject modules and lessons)
  async updateCourseOutlineStatusInDB(messageId: string, courseOutline: CourseOutlineData): Promise<void> {
    const sessionId = this.sessionId();
    
    if (!sessionId) {
      console.warn('[Chat Service] Cannot update outline status - no session ID');
      return;
    }

    try {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('[Chat Service] 📤 SENDING COURSE OUTLINE STATUS UPDATE');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('Session ID:', sessionId);
      console.log('Message ID:', messageId);
      console.log('Outline:', courseOutline.title);
      
      // Count accepted/rejected for logging
      if (courseOutline.modules) {
        const acceptedModules = courseOutline.modules.filter(m => m.accepted === true).length;
        const rejectedModules = courseOutline.modules.filter(m => m.accepted === false).length;
        let acceptedLessons = 0;
        let rejectedLessons = 0;
        
        courseOutline.modules.forEach(module => {
          if (module.lessons) {
            acceptedLessons += module.lessons.filter(l => l.accepted === true).length;
            rejectedLessons += module.lessons.filter(l => l.accepted === false).length;
          }
        });
        
        console.log(`Accepted: ${acceptedModules} modules, ${acceptedLessons} lessons`);
        console.log(`Rejected: ${rejectedModules} modules, ${rejectedLessons} lessons`);
      }
      console.log('═══════════════════════════════════════════════════════════');

      const response = await fetch(`${this.apiUrl}/api/course-outline/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          messageId,
          outline: courseOutline
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Chat Service] Failed to update outline status:', errorData);
        throw new Error(errorData.message || 'Failed to update course outline status');
      }

      const result = await response.json();
      console.log('[Chat Service] ✓ Course outline status updated in database:', result);

    } catch (error) {
      console.error('[Chat Service] Error updating course outline status in DB:', error);
      // Don't throw - we want UI updates to work even if DB update fails
    }
  }
}
