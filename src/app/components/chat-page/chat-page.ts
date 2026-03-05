import { Component, signal, OnInit } from '@angular/core';
import { ChatInput } from '../chat-input/chat-input';
import { ChatList } from '../chat-list/chat-list';
import { ChatPreview } from '../chat-preview/chat-preview';
import { PredefinedPromptsComponent } from '../predefined-prompts/predefined-prompts';
import { AuthService } from '../../services/auth';
import { Chat } from '../../services/chat';
import { CourseCreatorService } from '../../services/course-creator';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, ChatInput, ChatList, ChatPreview, PredefinedPromptsComponent],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css'
})
export class ChatPageComponent implements OnInit {
  showHistory = signal<boolean>(false);

  constructor(
    public authService: AuthService,
    private chatService: Chat,
    public courseCreatorService: CourseCreatorService
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('[Chat Page] Component initialized, loading last session...');
    
    // Try to load the last session
    const loaded = await this.chatService.loadLastSession();
    
    if (loaded) {
      console.log('[Chat Page] Last session loaded successfully');
    } else {
      console.log('[Chat Page] No previous session, showing empty chat');
      // Don't create a session - wait for user to click "New Chat" or send a message
    }
  }

  toggleHistory(): void {
    this.showHistory.update(v => !v);
  }

  async newChat(): Promise<void> {
    const messages = this.chatService.messages();
    if (messages.length > 0) {
      if (confirm('Start a new chat? This will clear the current conversation.')) {
        await this.chatService.clearMessages();
        console.log('[Chat Page] New chat started with new session');
      }
    } else {
      // No messages yet, create a new session
      await this.chatService.createNewSession();
      console.log('[Chat Page] New session created');
    }
  }

  /**
   * Handle predefined prompt selection
   */
  async onPromptSelected(prompt: string): Promise<void> {
    console.log('[Chat Page] Predefined prompt selected:', prompt);
    
    // Add user message to chat
    const userMessage = this.chatService.addMessage(prompt, 'user', 'sent');
    
    try {
      // Generate course using the Course Creator API
      this.courseCreatorService.isGenerating.set(true);
      const course = await this.courseCreatorService.generateCourse(prompt);
      
      console.log('[Chat Page] Course generated:', course);
      
      // Add assistant message with course data to chat
      const assistantMessage = this.chatService.addMessage(
        'I\'ve created a course based on your request. Here\'s what I generated:',
        'assistant',
        'sent'
      );
      
      // Update the assistant message with course data
      this.chatService.updateMessage(assistantMessage.id, {
        courseData: course,
        toolCalled: true,
        toolType: 'create_course'
      });
      
      // Auto-select the message to show in preview
      this.chatService.selectMessage(
        this.chatService.messages().find(m => m.id === assistantMessage.id) || null
      );
      
    } catch (error) {
      console.error('[Chat Page] Error generating course:', error);
      
      // Add error message to chat
      this.chatService.addMessage(
        'Sorry, I encountered an error generating the course. Please try again.',
        'assistant',
        'error'
      );
    } finally {
      this.courseCreatorService.isGenerating.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
