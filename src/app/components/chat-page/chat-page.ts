import { Component, signal, OnInit } from '@angular/core';
import { ChatInput } from '../chat-input/chat-input';
import { ChatList } from '../chat-list/chat-list';
import { ChatPreview } from '../chat-preview/chat-preview';
import { AuthService } from '../../services/auth';
import { Chat } from '../../services/chat';
import { CourseCreatorService } from '../../services/course-creator';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, ChatInput, ChatList, ChatPreview],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css'
})
export class ChatPageComponent implements OnInit {
  showHistory = signal<boolean>(false);
  showPreview = signal<boolean>(false);  // hidden by default

  constructor(
    public authService: AuthService,
    private chatService: Chat,
    public courseCreatorService: CourseCreatorService
  ) {}

  ngOnInit(): void {
    console.log('[Chat Page] Component initialized, showing welcome message');
    // Just show the greeting — no history or session loaded on page load
    this.chatService.addWelcomeMessage();
  }

  toggleHistory(): void {
    this.showHistory.update(v => !v);
  }

  togglePreview(): void {
    this.showPreview.update(v => !v);
  }

  async newChat(): Promise<void> {
    const messages = this.chatService.messages();
    if (messages.length > 0) {
      if (confirm('Start a new chat? This will clear the current conversation.')) {
        await this.chatService.clearMessages();
        // Create a fresh session now that messages are cleared
        await this.chatService.createNewSession();
        // Show welcome greeting in the new session
        this.chatService.addWelcomeMessage();
        console.log('[Chat Page] New chat started');
      }
    } else {
      // No messages yet — still create a session for the empty chat
      await this.chatService.createNewSession();
      this.chatService.addWelcomeMessage();
      console.log('[Chat Page] New session created');
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
