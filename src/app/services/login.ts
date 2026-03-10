import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError as observableThrowError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  status: number;
  message: string;
  data: {
    user: {
      userId: number;
      userName: string;
      firstName: string;
      lastName: string;
      email?: string;
      token: string;
      role: number;
      lastLoggedIn?: string;
      permissions?: Array<{
        id: number;
        name: string;
      }>;
    };
  };
  resData?: any;
}

export interface UserDetails {
  firstname?: string;
  username: string;
  lastname?: string;
  role: string;
  token: string;
  userId?: string;
  permissions?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private readonly CAT_USER_LOGIN_AUTH_SERVICE_URL = '/cms-admin/user-login';
  jwtHelper = new JwtHelperService();
  
  usrRoles = {
    1: 'admin',
    2: 'customizer',
    3: 'creator',
    4: 'reviewer'
  };

  constructor(private httpClient: HttpClient) {}

  /**
   * Get domain URL based on environment
   * @returns Domain URL string
   */
  getDomainUrl(): string {
    if (location.hostname === 'localhost'
      && Boolean(location.port && location.port.length === 4 && location.port.startsWith('4'))) {  // FOR Angular Dev
      return 'https://authoring.qa7.lrn.com';
    } else {
      return location.protocol + '//' + location.hostname + (Boolean(location.port) ? ':' + location.port : '');
    }
  }

  /**
   * Authenticate user with backend API
   * @param username - User's username (email)
   * @param password - User's password
   * @returns Observable with login response and user details
   */
  login(username: string, password: string): Observable<UserDetails> {
    const reqObj: LoginRequest = {
      username: username,
      password: password
    };

    const loginUrl = this.getDomainUrl() + this.CAT_USER_LOGIN_AUTH_SERVICE_URL;

    return this.httpClient.post<LoginResponse>(loginUrl, reqObj).pipe(
      map((response) => {
        let tokenVal: any = {};
        const token = response.data.user.token;
        
        // Check if token exists and appears to be a valid JWT format (three parts separated by dots)
        if (token && typeof token === 'string' && token.split('.').length === 3) {
          try {
            tokenVal = this.jwtHelper.decodeToken(token);
          } catch (error) {
            console.error('Error decoding JWT token:', error);
            // Fallback role or handling for invalid token
            tokenVal = { rl: 3 }; // Default to 'creator' role if token decoding fails
          }
        } else {
          console.warn('Token is not in JWT format or missing, using default role');
          tokenVal = { rl: 3 }; // Default to 'creator' role if token is invalid or missing
        }

        const user: UserDetails = {
          firstname: response.data.user.firstName || '',
          username: response.data.user.userName,
          lastname: response.data.user.lastName || '',
          role: this.usrRoles[tokenVal['rl'] as keyof typeof this.usrRoles] || this.usrRoles[3],
          token: token,
          userId: response.data.user.userId?.toString(),
          permissions: response.data.user.permissions || []
        };

        return user;
      }),
      catchError((error: Response) => {
        console.error('Login error:', error);
        return observableThrowError(error);
      })
    );
  }

  /**
   * Validate credentials format before sending to backend
   * @param username - User's username
   * @param password - User's password
   * @returns Validation result
   */
  validateCredentials(username: string, password: string): { valid: boolean; error?: string } {
    if (!username || username.trim().length === 0) {
      return { valid: false, error: 'Username is required' };
    }

    if (!password || password.length < 4) {
      return { valid: false, error: 'Password must be at least 4 characters' };
    }

    return { valid: true };
  }

  /**
   * Decode JWT token to extract user information
   * @param token - JWT token
   * @returns Decoded token data
   */
  decodeToken(token: string): any {
    try {
      if (token && typeof token === 'string' && token.split('.').length === 3) {
        return this.jwtHelper.decodeToken(token);
      }
    } catch (error) {
      console.error('Error decoding token:', error);
    }
    return null;
  }

  /**
   * Check if token is expired
   * @param token - JWT token
   * @returns true if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      return this.jwtHelper.isTokenExpired(token);
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }
}
