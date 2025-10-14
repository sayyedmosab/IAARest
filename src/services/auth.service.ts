import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User } from '../models/user.model';
import { API_BASE_URL } from '../constants/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiBaseUrl = API_BASE_URL;

  currentUser = signal<User | null>(null);
  isAdmin = computed(() => !!this.currentUser()?.is_admin);

  constructor() {
    // On startup, check if the user is already logged in via cookie
    this.checkUserStatus();
  }

  checkUserStatus(): void {
    this.http.get<AuthResponse>(`${this.apiBaseUrl}/auth/me`).subscribe({
      next: (response) => this.currentUser.set(response.data.user),
      error: () => this.currentUser.set(null)
    });
  }

  login(email: string, password_unused: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiBaseUrl}/auth/login`, { email, password: password_unused }).pipe(
      tap(response => {
        this.currentUser.set(response.data.user);
      })
    );
  }

  logout(): void {
    this.http.post(`${this.apiBaseUrl}/auth/logout`, {}).subscribe(() => {
      this.currentUser.set(null);
      this.router.navigate(['/home']);
    });
  }

  // TODO: Implement register method
  register(user: User): boolean {
    return false;
  }
  
  getAllUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(`${this.apiBaseUrl}/admin/users`);
  }
}