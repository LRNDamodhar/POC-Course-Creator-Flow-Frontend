import { Component, signal, computed, ViewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Chat } from '../../services/chat';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './chat-input.html',
  styleUrl: './chat-input.css',
})
export class ChatInput implements AfterViewInit {
  messageInput = signal('');
  @ViewChild('textarea') textarea?: ElementRef<HTMLTextAreaElement>;

  constructor(private chatService: Chat) {
    // Debug: Log accepted items whenever they change
    setInterval(() => {
      const items = this.chatService.getAcceptedItems();
      console.log('Accepted Items:', items);
    }, 2000);
    
    // Auto-resize textarea when messageInput changes
    effect(() => {
      const message = this.messageInput();
      setTimeout(() => this.adjustTextareaHeight(), 0);
    });
  }
  
  ngAfterViewInit() {
    this.adjustTextareaHeight();
  }
  
  adjustTextareaHeight() {
    if (this.textarea) {
      const element = this.textarea.nativeElement;
      element.style.height = 'auto';
      element.style.height = Math.min(element.scrollHeight, 108) + 'px'; // Max 3 lines (108px)
    }
  }

  isLoading = computed(() => this.chatService.isLoading());
  error = computed(() => this.chatService.error());
  
  // Get accepted items from chat service
  acceptedItems = computed(() => {
    const items = this.chatService.getAcceptedItems();
    console.log('ChatInput - acceptedItems computed:', items);
    return items;
  });

  async sendMessage() {
    const message = this.messageInput().trim();
    if (message && !this.isLoading()) {
      this.chatService.clearError();
      this.messageInput.set('');
      
      // Reset textarea height after clearing
      setTimeout(() => this.adjustTextareaHeight(), 0);
      
      try {
        await this.chatService.sendMessageToBackend(message);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearError() {
    this.chatService.clearError();
  }
  
  removeItem(messageId: string, moduleNumber: number, lessonNumber?: number) {
    this.chatService.removeAcceptedItem(messageId, moduleNumber, lessonNumber);
  }
}
