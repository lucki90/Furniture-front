import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

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
 * Guard that requires ADMIN role. Redirects to / if not admin.
 */
// TODO(CODEX): Redirect na '/' dla użytkownika bez roli ADMIN jest mylący, bo root i tak przekierowuje na ekran logowania. Użytkownik zalogowany, ale bez uprawnień, wygląda wtedy jakby utracił sesję zamiast dostać czytelny komunikat o braku dostępu.
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
