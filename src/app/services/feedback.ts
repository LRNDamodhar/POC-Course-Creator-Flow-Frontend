import { Injectable } from '@angular/core';
import { AuthService } from './auth';

export type FeedbackValue = 'like' | 'dislike' | null;

export interface MessageFeedback {
  messageId: string;
  sessionId: string;
  feedback: 'like' | 'dislike';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private apiUrl = '';

  constructor(private authService: AuthService) {}

  private getAuthHeaders(): Record<string, string> {
    const token = this.authService.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Submit or update feedback (like/dislike) for an assistant message.
   * Sending the same value again toggles it off (sets to null).
   */
  async submitFeedback(
    messageId: string,
    sessionId: string,
    feedback: 'like' | 'dislike'
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/api/message/feedback`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ messageId, sessionId, feedback }),
      });

      if (!response.ok) {
        console.error('[Feedback] Failed to submit feedback:', response.status);
        return false;
      }

      const data = await response.json();
      console.log('[Feedback] Submitted:', feedback, 'for message:', messageId, data);
      return true;
    } catch (error) {
      console.error('[Feedback] Error submitting feedback:', error);
      return false;
    }
  }

  /**
   * Remove feedback for a message (toggle off).
   */
  async removeFeedback(messageId: string, sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/api/message/feedback`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ messageId, sessionId }),
      });

      if (!response.ok) {
        console.error('[Feedback] Failed to remove feedback:', response.status);
        return false;
      }

      console.log('[Feedback] Removed feedback for message:', messageId);
      return true;
    } catch (error) {
      console.error('[Feedback] Error removing feedback:', error);
      return false;
    }
  }
}
