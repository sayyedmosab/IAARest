import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { User, CreateUserRequest, UpdateUserRequest, UserFilters, PaginatedUsersResponse, PaginationInfo } from '../models/user.model';
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

interface CreateUserResponse {
  success: boolean;
  data: User;
  message?: string;
  error?: string;
}

interface UpdateUserResponse {
  success: boolean;
  data: User;
  message?: string;
  error?: string;
}

interface DeleteUserResponse {
  success: boolean;
  message?: string;
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

  register(user: User): Observable<CreateUserResponse> {
    // Transform frontend User model to backend RegisterDto format
    const registerData = {
      email: user.email,
      password: user.password!,
      first_name: user.name.split(' ')[0] || user.name,
      last_name: user.name.split(' ').slice(1).join(' ') || 'User',
      phone_e164: user.phone.startsWith('+') ? user.phone : `+${user.phone}`,
      language_pref: user.language_pref || 'en',
      address: user.address?.street || 'Not provided',
      district: user.address?.district || 'Not provided',
      is_student: user.is_student || false,
      university_email: user.university_email,
      student_id_expiry: user.student_id_expiry
    };

    return this.http.post<CreateUserResponse>(`${this.apiBaseUrl}/auth/register`, registerData).pipe(
      tap(response => {
        // After successful registration, automatically log the user in
        if (response.success) {
          this.login(user.email, user.password!).subscribe({
            next: () => {
              console.log('Auto-login after registration successful');
            },
            error: (err) => {
              console.warn('Auto-login after registration failed:', err);
            }
          });
        }
      })
    );
  }
  
  getAllUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(`${this.apiBaseUrl}/admin/users`);
  }

  getUserById(id: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiBaseUrl}/admin/users/${id}`);
  }

  createUser(userData: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(`${this.apiBaseUrl}/admin/users`, userData);
  }

  updateUser(id: string, userData: UpdateUserRequest): Observable<UpdateUserResponse> {
    return this.http.put<UpdateUserResponse>(`${this.apiBaseUrl}/admin/users/${id}`, userData);
  }

  deleteUser(id: string): Observable<DeleteUserResponse> {
    return this.http.delete<DeleteUserResponse>(`${this.apiBaseUrl}/admin/users/${id}`);
  }

  getUsersWithPagination(page: number = 1, limit: number = 10, filters?: UserFilters): Observable<PaginatedUsersResponse> {
    let params = `?page=${page}&limit=${limit}`;
    
    if (filters) {
      if (filters.search) {
        params += `&search=${encodeURIComponent(filters.search)}`;
      }
      if (filters.status && filters.status !== 'all') {
        params += `&status=${filters.status}`;
      }
      if (filters.role && filters.role !== 'all') {
        params += `&role=${filters.role}`;
      }
    }

    return this.http.get<ApiResponse<{ users: User[], pagination: PaginationInfo }>>(`${this.apiBaseUrl}/admin/users/paginated${params}`).pipe(
      map(response => response.data)
    );
  }

  bulkUpdateUsers(userIds: string[], updates: UpdateUserRequest): Observable<ApiResponse<User[]>> {
    return this.http.put<ApiResponse<User[]>>(`${this.apiBaseUrl}/admin/users/bulk`, {
      userIds,
      updates
    });
  }

  bulkDeleteUsers(userIds: string[]): Observable<DeleteUserResponse> {
    return this.http.post<DeleteUserResponse>(`${this.apiBaseUrl}/admin/users/bulk-delete`, {
      userIds
    });
  }
}