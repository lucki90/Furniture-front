import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from '../error/toast.service';

/**
 * Guard wymagający zalogowanego użytkownika. Przy braku sesji przekierowuje na /login.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  authService.initFromStorage();

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

/**
 * Guard wymagający roli ADMIN.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  authService.initFromStorage();

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
