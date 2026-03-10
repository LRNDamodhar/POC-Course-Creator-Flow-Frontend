import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { LoginService, UserDetails } from './login';
import { firstValueFrom } from 'rxjs';

export interface User {
  username: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  token?: string;
  userId?: string;
  role?: string;
  permissions?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSignal = signal<boolean>(false);
  private currentUserSignal = signal<User | null>(null);
  private platformId = inject(PLATFORM_ID);
  private isBrowser: boolean;

  isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  currentUser = this.currentUserSignal.asReadonly();

  constructor(
    private router: Router,
    private loginService: LoginService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Check if user is already logged in (from localStorage)
    this.checkExistingAuth();
  }

  private checkExistingAuth(): void {
    if (!this.isBrowser) {
      return;
    }
    
    // Check for stored auth token
    const authToken = localStorage.getItem('auth');
    if (authToken) {
      // Check if token is expired
      if (!this.loginService.isTokenExpired(authToken)) {
        // Try to get user details from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            this.isAuthenticatedSignal.set(true);
            this.currentUserSignal.set(user);
            
            // Restore token to sessionStorage so all API services (chat, course-creator) can use it
            sessionStorage.setItem('auth-preview', authToken);
            
            return;
          } catch (error) {
            console.error('Error parsing stored user:', error);
          }
        }
      } else {
        // Token expired, clear storage
        localStorage.removeItem('auth');
        localStorage.removeItem('user');
        sessionStorage.removeItem('auth-preview');
      }
    }
  }

  /**
   * Login with backend API authentication
   * @param username - User's username (email)
   * @param password - User's password
   * @returns Promise with success status and optional error message
   */
  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    // Validate credentials format
    const validation = this.loginService.validateCredentials(username, password);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Call backend API
      const userDetails: UserDetails = await firstValueFrom(
        this.loginService.login(username, password)
      );

      if (userDetails && userDetails.token) {
        const user: User = {
          username: userDetails.username,
          firstname: userDetails.firstname,
          lastname: userDetails.lastname,
          email: `${userDetails.username}@example.com`,
          token: userDetails.token,
          userId: userDetails.userId,
          role: userDetails.role,
          permissions: userDetails.permissions
        };
        
        this.isAuthenticatedSignal.set(true);
        this.currentUserSignal.set(user);
        
        if (this.isBrowser) {
          // Store auth token in localStorage (persistent across tabs/restarts)
          localStorage.setItem('auth', userDetails.token);
          
          // Store token in sessionStorage so chat.ts and course-creator.ts can use it immediately
          sessionStorage.setItem('auth-preview', userDetails.token);
          
          // Store user details
          localStorage.setItem('user', JSON.stringify(user));
          
          // Store user details with userId as key (following reference pattern)
          if (userDetails.userId) {
            localStorage.setItem(userDetails.userId + '_details', JSON.stringify({
              firstname: userDetails.firstname,
              username: userDetails.username,
              lastname: userDetails.lastname,
              permissions: userDetails.permissions,
              role: userDetails.role,
              userId: userDetails.userId
            }));
          }
        }
        
        console.log('✅ User logged in successfully:', userDetails.username);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'Invalid response from server' 
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.error?.message || error?.message || 'Network error. Please try again.';
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  /**
   * Login with demo mode (local only, no API call)
   * @param username - User's username
   * @param password - User's password
   * @returns Success status
   */
  loginDemo(username: string, password: string): boolean {
    // Simple validation for demo mode
    if (username && password && password.length >= 4) {
      const user: User = {
        username: username,
        email: `${username}@example.com`
      };
      
      this.isAuthenticatedSignal.set(true);
      this.currentUserSignal.set(user);
      
      if (this.isBrowser) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return true;
    }
    return false;
  }

  logout(): void {
    this.isAuthenticatedSignal.set(false);
    this.currentUserSignal.set(null);
    
    if (this.isBrowser) {
      // Clear all stored data
      const userId = this.currentUserSignal()?.userId;
      if (userId) {
        localStorage.removeItem(userId + '_details');
      }
      
      localStorage.removeItem('auth');
      localStorage.removeItem('user');
      sessionStorage.removeItem('auth-preview');
      
      // Optional: Call logout endpoint if needed
      // this.httpClient.get('/cms-admin/logout').subscribe();
    }
    
    console.log('✅ User logged out successfully');
    this.router.navigate(['/login']);
  }

  getUsername(): string {
    return this.currentUserSignal()?.username || '';
  }

  /**
   * Get the current auth token from sessionStorage.
   * Falls back to localStorage if sessionStorage is missing (e.g. SSR).
   */
  getToken(): string {
    if (this.isBrowser) {
      return sessionStorage.getItem('auth-preview') || localStorage.getItem('auth') || '';
    }
    return '';
  }
}
