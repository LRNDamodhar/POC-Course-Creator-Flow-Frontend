import { Component, computed, effect, ElementRef, signal, ViewChild, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat, ChatMessage, ActionButton } from '../../services/chat';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

interface SessionSummary {
  sessionId: string;
  title: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  hasCourseData: boolean;
  hasCourseOutline: boolean;
  status: 'active' | 'archived';
}

@Component({
  selector: 'app-chat-list',
  imports: [CommonModule, FormsModule, MarkdownPipe],
  templateUrl: './chat-list.html',
  styleUrl: './chat-list.css',
})
export class ChatList {
  @ViewChild('chatListContainer', { static: false }) chatListContainer?: ElementRef;
  @Input() showHistoryFromParent: boolean = false;
  
  messages = computed(() => this.chatService.messages());
  selectedMessage = computed(() => this.chatService.selectedMessage());

  // History panel state - controlled by parent
  showHistory = signal<boolean>(false);
  sessions = signal<SessionSummary[]>([]);
  searchQuery = signal<string>('');
  isLoadingHistory = signal<boolean>(false);
  historyError = signal<string | null>(null);

  // Watch for parent changes
  ngOnChanges() {
    this.showHistory.set(this.showHistoryFromParent);
    if (this.showHistoryFromParent && this.sessions().length === 0) {
      this.loadSessions();
    }
  }

  // Computed filtered sessions
  filteredSessions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const allSessions = this.sessions();

    if (!query) {
      return allSessions;
    }

    return allSessions.filter(session =>
      session.title.toLowerCase().includes(query) ||
      session.sessionId.toLowerCase().includes(query) ||
      this.formatDate(session.createdAt).toLowerCase().includes(query)
    );
  });

  constructor(private chatService: Chat) {
    // Scroll to bottom when messages change
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  selectMessage(message: ChatMessage) {
    // Toggle selection: if clicking the same message, deselect it
    if (this.isSelected(message)) {
      this.chatService.selectMessage(null);
    } else {
      this.chatService.selectMessage(message);
    }
  }

  isSelected(message: ChatMessage): boolean {
    return this.selectedMessage()?.id === message.id;
  }

  async clearAll() {
    if (confirm('Are you sure you want to clear all messages?')) {
      await this.chatService.clearMessages();
      console.log('[Chat List] All messages cleared, new session created');
    }
  }

  async newChat() {
    if (this.messages().length > 0) {
      if (confirm('Start a new chat? This will clear the current conversation.')) {
        await this.chatService.clearMessages();
        console.log('[Chat List] New chat started with new session');
      }
    } else {
      // No messages yet, but create a session anyway
      await this.chatService.createNewSession();
      console.log('[Chat List] New session created for first chat');
    }
  }

  // History panel methods
  toggleHistory(): void {
    this.showHistory.update(v => !v);
    if (this.showHistory() && this.sessions().length === 0) {
      this.loadSessions();
    }
  }

  async loadSessions(): Promise<void> {
    this.isLoadingHistory.set(true);
    this.historyError.set(null);

    try {
      const response = await fetch('http://localhost:3000/api/sessions/all?limit=100');
      
      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.sessions) {
        const sessions: SessionSummary[] = data.sessions.map((s: any) => ({
          sessionId: s.sessionId,
          title: this.generateTitle(s),
          createdAt: new Date(s.createdAt),
          lastActivity: new Date(s.lastActivity),
          messageCount: s.messageCount || 0,
          hasCourseData: s.hasCourseData || false,
          hasCourseOutline: s.hasCourseOutline || false,
          status: s.status || 'active'
        }));

        sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
        this.sessions.set(sessions);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
      this.historyError.set(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      this.isLoadingHistory.set(false);
    }
  }

  private generateTitle(session: any): string {
    if (session.metadata?.title) return session.metadata.title;
    if (session.courseData?.title) return session.courseData.title;
    if (session.courseOutline?.title) return session.courseOutline.title;
    
    if (session.messages && session.messages.length > 0) {
      const firstUserMessage = session.messages.find((m: any) => m.role === 'user');
      if (firstUserMessage) {
        const content = firstUserMessage.content.substring(0, 50);
        return content.length < firstUserMessage.content.length ? content + '...' : content;
      }
    }
    
    return `Session ${session.sessionId.substring(0, 8)}...`;
  }

  async loadSession(sessionId: string): Promise<void> {
    try {
      this.isLoadingHistory.set(true);
      
      const response = await fetch(`http://localhost:3000/api/session/${sessionId}/full`);
      
      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.session) {
        this.chatService.restoreSession(data.session);
        this.showHistory.set(false);
      }
    } catch (err) {
      console.error('Error loading session:', err);
      this.historyError.set(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      this.isLoadingHistory.set(false);
    }
  }

  async deleteSession(sessionId: string, event: Event): Promise<void> {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/session/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.statusText}`);
      }

      this.sessions.update(sessions => 
        sessions.filter(s => s.sessionId !== sessionId)
      );
    } catch (err) {
      console.error('Error deleting session:', err);
      this.historyError.set(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getSessionIcon(session: SessionSummary): string {
    if (session.hasCourseOutline) return '📋';
    if (session.hasCourseData) return '📚';
    return '💬';
  }

  getSessionBadge(session: SessionSummary): string {
    if (session.hasCourseOutline) return 'Outline';
    if (session.hasCourseData) return 'Course';
    return 'Chat';
  }

  handleAction(message: ChatMessage, action: ActionButton, event: Event) {
    event.stopPropagation(); // Prevent message selection

    console.log('═══════════════════════════════════════════════════════════');
    console.log('[Chat List] 🎯 ACTION BUTTON CLICKED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Action Type:', action.type);
    console.log('Message ID:', message.id);
    console.log('Has action.lessonInfo?', !!action.lessonInfo);
    console.log('Has message.templateData?', !!message.templateData);
    console.log('Has message.courseData?', !!message.courseData);
    console.log('Has message.courseOutline?', !!message.courseOutline);

    if (action.type === 'accept') {
      // Check if this is a template acceptance with lesson information
      if (action.lessonInfo && message.templateData) {
        console.log('───────────────────────────────────────────────────────────');
        console.log('[Chat List] 📝 TEMPLATE ACCEPTANCE DETECTED');
        console.log('───────────────────────────────────────────────────────────');
        console.log('Action Lesson Info:', JSON.stringify(action.lessonInfo, null, 2));
        console.log('Message Template Data Keys:', Object.keys(message.templateData));
        
        // Extract lesson information from the action button
        const lessonInfo = {
          module: action.lessonInfo.module,
          lesson: action.lessonInfo.lesson,
          moduleNumber: undefined, // Will be matched by title in backend
          lessonNumber: undefined  // Will be matched by title in backend
        };
        
        console.log('Extracted Lesson Info:', JSON.stringify(lessonInfo, null, 2));
        console.log('═══════════════════════════════════════════════════════════');
        
        // Pass lesson info and template data to the service
        this.chatService.acceptMessage(message.id, lessonInfo, message.templateData);
      } else if (message.courseData) {
        console.log('───────────────────────────────────────────────────────────');
        console.log('[Chat List] 📚 COURSE DATA ACCEPTANCE DETECTED');
        console.log('───────────────────────────────────────────────────────────');
        console.log('Course Data Keys:', Object.keys(message.courseData));
        console.log('═══════════════════════════════════════════════════════════');
        
        // Regular message acceptance without lesson/template context
        this.chatService.acceptMessage(message.id);
      } else if (message.courseOutline) {
        console.log('───────────────────────────────────────────────────────────');
        console.log('[Chat List] 📋 COURSE OUTLINE ACCEPTANCE DETECTED');
        console.log('───────────────────────────────────────────────────────────');
        console.log('Course Outline Keys:', Object.keys(message.courseOutline));
        console.log('═══════════════════════════════════════════════════════════');
        
        // Regular message acceptance without lesson/template context
        this.chatService.acceptMessage(message.id);
      } else {
        console.log('───────────────────────────────────────────────────────────');
        console.log('[Chat List] 💬 REGULAR MESSAGE ACCEPTANCE');
        console.log('═══════════════════════════════════════════════════════════');
        
        // Regular message acceptance without lesson/template context
        this.chatService.acceptMessage(message.id);
      }
    } else if (action.type === 'template_recommendation') {
      // Handle individual template button click
      console.log('───────────────────────────────────────────────────────────');
      console.log('[Chat List] 🎨 TEMPLATE RECOMMENDATION BUTTON CLICKED');
      console.log('───────────────────────────────────────────────────────────');
      console.log('Template Name:', action.templateName);
      console.log('Action Lesson Info:', JSON.stringify(action.lessonInfo, null, 2));
      console.log('Action Template Data:', action.templateData);
      
      if (action.lessonInfo && action.templateData) {
        // Extract lesson information
        const lessonInfo = {
          module: action.lessonInfo.module,
          lesson: action.lessonInfo.lesson,
          moduleNumber: undefined,
          lessonNumber: undefined
        };
        
        // Build template data for this specific template
        const templateData = {
          templateName: action.templateData.templateName,
          category: action.category,
          filledTemplate: action.templateData.filledTemplate,
          recommendations: [{
            templateName: action.templateData.templateName,
            template: action.templateData.template,
            filledTemplate: action.templateData.filledTemplate,
            score: action.score,
            reason: action.reason,
            category: action.category,
            usage: action.usage
          }],
          lessonInfo: action.lessonInfo
        };
        
        console.log('Calling API with lesson info and template data');
        console.log('═══════════════════════════════════════════════════════════');
        
        // Call API to accept this specific template for the lesson
        this.chatService.acceptMessage(message.id, lessonInfo, templateData);
      } else {
        console.error('[Chat List] Template button missing lessonInfo or templateData');
        console.log('═══════════════════════════════════════════════════════════');
      }
    } else if (action.type === 'reject') {
      const feedback = prompt('Please provide feedback for revision:');
      if (feedback !== null) { // null means user cancelled
        this.chatService.rejectMessage(message.id, feedback);
      }
    }
    
    console.log('\n'); // Add spacing for readability
  }

  hasActions(message: ChatMessage): boolean {
    return !!(message.actions && message.actions.length > 0 && message.sender === 'assistant');
  }

  handleRecommendation(recommendation: any, event: Event): void {
    event.stopPropagation();
    console.log('[Chat List] Recommendation clicked:', recommendation.text);
    
    // Send the recommendation text as a user message
    this.chatService.sendMessageToBackend(recommendation.text);
  }

  private scrollToBottom(): void {
    if (this.chatListContainer) {
      const element = this.chatListContainer.nativeElement;
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
    }
  }
}
