import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, UserInfo } from './auth.model';
import { KitchenStateService } from '../../kitchen/service/kitchen-state.service';
import { environment } from '../../../environments/environment';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly baseUrl = `${environment.apiUrl}/auth`;
  private readonly _currentUser = signal<UserInfo | null>(null);

  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly isAdmin = computed(() => this._currentUser()?.role === 'ADMIN');
  readonly user = this._currentUser.asReadonly();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly kitchenStateService: KitchenStateService
  ) {}

  /**
   * Attempt to restore session from localStorage on app init.
   */
  initFromStorage(): void {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (token && userJson) {
      try {
        const user: UserInfo = JSON.parse(userJson);
        this._currentUser.set(user);
      } catch {
        this.clearStorage();
      }
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const body: LoginRequest = { email, password };
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, body).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, request).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  refresh(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    return this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, { refreshToken }).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  logout(): void {
    this.clearStorage();
    this._currentUser.set(null);
    // Clear kitchen state so the next user doesn't see previous user's cabinets
    this.kitchenStateService.clearAll();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private handleAuthResponse(response: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this._currentUser.set(response.user);
  }

  private clearStorage(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
