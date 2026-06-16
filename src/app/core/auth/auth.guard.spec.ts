import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { adminGuard, authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { ToastService } from '../error/toast.service';

describe('auth guards', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn', 'isAdmin']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['warning']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast }
      ]
    });
  });

  it('authGuard przepuszcza zalogowanego użytkownika', () => {
    authService.isLoggedIn.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('authGuard przekierowuje niezalogowanego użytkownika na login', () => {
    authService.isLoggedIn.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('adminGuard przepuszcza administratora', () => {
    authService.isAdmin.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBeTrue();
    expect(toast.warning).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('adminGuard pokazuje czytelny komunikat i zostawia zalogowanego użytkownika w aplikacji', () => {
    authService.isAdmin.and.returnValue(false);
    authService.isLoggedIn.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBeFalse();
    expect(toast.warning).toHaveBeenCalledWith('Nie masz uprawnień administratora do tej sekcji.');
    expect(router.navigate).toHaveBeenCalledWith(['/kitchen']);
  });

  it('adminGuard przekierowuje niezalogowanego użytkownika na login', () => {
    authService.isAdmin.and.returnValue(false);
    authService.isLoggedIn.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBeFalse();
    expect(toast.warning).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
