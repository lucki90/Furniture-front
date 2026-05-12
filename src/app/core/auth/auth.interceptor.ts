import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from '../error/toast.service';

/**
 * HTTP interceptor that adds Authorization: Bearer header to all requests
 * except authentication endpoints.
 * - On 401: triggers logout and redirects to /login.
 * - On 403: shows "Brak uprawnień" toast and redirects to home page.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const token = authService.getToken();

  // Don't add token to auth endpoints
  if (token && !req.url.includes('/auth/')) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/')) {
        // 401 = unauthenticated (expired/missing token) → log out and redirect to login.
        // Domain-level resource access denial (e.g. "board not owned by you") returns 403,
        // not 401, so all 401s here reliably indicate a broken/expired session.
        authService.logout();
        router.navigate(['/login']);
      } else if (error.status === 403) {
        // 403 = authenticated but not authorized for this specific resource.
        // Show a toast so the user knows the action was rejected, but do NOT navigate away —
        // the component will handle the error and restore its own state (e.g. re-enable a button).
        toast.error('Brak uprawnień do wykonania tej operacji.');
      }
      return throwError(() => error);
    })
  );
};
