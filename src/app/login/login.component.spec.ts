import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { ErrorTranslationService } from '../core/error/error-translation.service';
import { LoginComponent } from './login.component';
import { AuthResponse } from '../core/auth/auth.model';
import { ApiErrorResponse } from '../core/error/api-error.model';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let errorTranslation: jasmine.SpyObj<ErrorTranslationService>;
  let navigateSpy: jasmine.Spy;

  const stubAuthResponse: AuthResponse = {
    accessToken: 'tok',
    refreshToken: 'ref',
    user: { id: 1, email: 'x@x.com', role: 'USER' },
  };

  const stubApiError: ApiErrorResponse = {
    errorId: 'e1',
    status: 401,
    title: 'Unauthorized',
    path: '/auth/login',
    timestamp: '2026-01-01T00:00:00Z',
    code: 'ex.auth.invalid',
  };

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    errorTranslation = jasmine.createSpyObj<ErrorTranslationService>(
      'ErrorTranslationService',
      ['extractApiError', 'translateApiError'],
    );

    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ErrorTranslationService, useValue: errorTranslation },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    navigateSpy = spyOn(TestBed.inject(Router), 'navigate');
  });

  afterEach(() => fixture.destroy());

  it('powinien pokazać błąd gdy pola są puste', () => {
    component.onSubmit();

    expect(component.errorMessage).toBe('Wypełnij wszystkie pola');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('powinien pokazać błąd gdy email ma nieprawidłowy format', () => {
    component.email = 'nieprawidlowy-email';
    component.password = 'haslo123';

    component.onSubmit();

    expect(component.errorMessage).toBe('Podaj prawidłowy adres email');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('powinien zalogować i przekierować na stronę projektów', () => {
    component.email = 'test@example.com';
    component.password = 'haslo123';
    authService.login.and.returnValue(of(stubAuthResponse));

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledOnceWith('test@example.com', 'haslo123');
    expect(navigateSpy).toHaveBeenCalledWith(['/kitchen/projects']);
  });

  it('powinien pokazać przetłumaczony błąd z backendu po nieudanym logowaniu', () => {
    component.email = 'test@example.com';
    component.password = 'bledne';
    authService.login.and.returnValue(throwError(() => ({ error: stubApiError })));
    errorTranslation.extractApiError.and.returnValue(stubApiError);
    errorTranslation.translateApiError.and.returnValue([{ message: 'Nieprawidłowy email lub hasło', details: [] }]);

    component.onSubmit();

    expect(component.errorMessage).toBe('Nieprawidłowy email lub hasło');
    expect(component.isLoading).toBeFalse();
  });

  it('powinien pokazać domyślny błąd gdy odpowiedź nie jest ApiErrorResponse', () => {
    component.email = 'test@example.com';
    component.password = 'haslo123';
    authService.login.and.returnValue(throwError(() => new Error('sieć')));
    errorTranslation.extractApiError.and.returnValue(null);

    component.onSubmit();

    expect(component.errorMessage).toBe('Nieprawidłowy email lub hasło');
    expect(component.isLoading).toBeFalse();
  });
});
