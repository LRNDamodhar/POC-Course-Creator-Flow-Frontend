import { Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat } from '../../services/chat';

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
  selector: 'app-session-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './session-history.html',
  styleUrls: ['./session-history.css']
})
export class SessionHistoryComponent {
  // Signals
  sessions = signal<SessionSummary[]>([]);
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  isVisible = signal<boolean>(false);

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
    // Load sessions when component becomes visible
    effect(() => {
      if (this.isVisible() && this.sessions().length === 0) {
        this.loadSessions();
      }
    });
  }

  /**
   * Toggle history panel visibility
   */
  toggleHistory(): void {
    this.isVisible.update(v => !v);
  }

  /**
   * Load all sessions from the backend
   */
  async loadSessions(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await fetch('http://localhost:3000/api/sessions/all?limit=100');
      
      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.sessions) {
        // Map and sort sessions by latest activity
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

        // Sort by latest activity first
        sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

        this.sessions.set(sessions);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
      this.error.set(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Generate a title for a session based on its content
   */
  private generateTitle(session: any): string {
    // Try to get title from metadata
    if (session.metadata?.title) {
      return session.metadata.title;
    }

    // Try to get from course data
    if (session.courseData?.title) {
      return session.courseData.title;
    }

    // Try to get from course outline
    if (session.courseOutline?.title) {
      return session.courseOutline.title;
    }

    // Generate from first message or use session ID
    if (session.messages && session.messages.length > 0) {
      const firstUserMessage = session.messages.find((m: any) => m.role === 'user');
      if (firstUserMessage) {
        const content = firstUserMessage.content.substring(0, 50);
        return content.length < firstUserMessage.content.length ? content + '...' : content;
      }
    }

    return `Session ${session.sessionId.substring(0, 8)}...`;
  }

  /**
   * Load a specific session
   */
  async loadSession(sessionId: string): Promise<void> {
    try {
      this.isLoading.set(true);
      
      const response = await fetch(`http://localhost:3000/api/session/${sessionId}/full`);
      
      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.session) {
        // Restore session in chat service
        this.chatService.restoreSession(data.session);
        
        // Close history panel
        this.isVisible.set(false);
      }
    } catch (err) {
      console.error('Error loading session:', err);
      this.error.set(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string, event: Event): Promise<void> {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/session/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.statusText}`);
      }

      // Remove from local list
      this.sessions.update(sessions => 
        sessions.filter(s => s.sessionId !== sessionId)
      );
    } catch (err) {
      console.error('Error deleting session:', err);
      this.error.set(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }

  /**
   * Refresh the sessions list
   */
  async refresh(): Promise<void> {
    await this.loadSessions();
  }

  /**
   * Format date for display
   */
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

  /**
   * Format time for display
   */
  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get icon for session type
   */
  getSessionIcon(session: SessionSummary): string {
    if (session.hasCourseOutline) {
      return '📋';
    } else if (session.hasCourseData) {
      return '📚';
    } else {
      return '💬';
    }
  }

  /**
   * Get badge text for session
   */
  getSessionBadge(session: SessionSummary): string {
    if (session.hasCourseOutline) {
      return 'Outline';
    } else if (session.hasCourseData) {
      return 'Course';
    } else {
      return 'Chat';
    }
  }
}
