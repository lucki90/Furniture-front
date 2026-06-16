import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from '../error/toast.service';

/**
 * Guard that requires authentication. Redirects to /login if not logged in.
 */
// TODO(CODEX): Guard opiera się na synchronicznym isLoggedIn(), ale sesja jest odtwarzana dopiero później w AppComponent.ngOnInit(). Przy refreshu lub wejściu bezpośrednio na chronioną trasę można błędnie wyrzucić zalogowanego użytkownika na /login zanim stan auth zostanie zainicjalizowany.
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

/**
 * Guard that requires ADMIN role.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (authService.isAdmin()) {
    return true;
  }

  if (authService.isLoggedIn()) {
    toast.warning('Nie masz uprawnień administratora do tej sekcji.');
    router.navigate(['/kitchen']);
  } else {
    router.navigate(['/login']);
  }

  return false;
};
