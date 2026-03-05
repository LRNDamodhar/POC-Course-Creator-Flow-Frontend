import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  username = signal('');
  password = signal('');
  errorMessage = signal('');
  isLoading = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // If already authenticated, redirect to chat
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/chat']);
    }
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set('');
    
    if (!this.username() || !this.password()) {
      this.errorMessage.set('Please enter both username and password');
      return;
    }

    if (this.password().length < 4) {
      this.errorMessage.set('Password must be at least 4 characters');
      return;
    }

    this.isLoading.set(true);

    try {
      // Call the backend API for authentication
      const result = await this.authService.login(this.username(), this.password());
      
      if (result.success) {
        this.router.navigate(['/chat']);
      } else {
        this.errorMessage.set(result.error || 'Invalid credentials. Please try again.');
        this.isLoading.set(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      this.errorMessage.set('An unexpected error occurred. Please try again.');
      this.isLoading.set(false);
    }
  }

  onUsernameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.username.set(target.value);
  }

  onPasswordChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.password.set(target.value);
  }
}
