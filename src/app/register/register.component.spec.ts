import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { ErrorTranslationService } from '../core/error/error-translation.service';
import { RegisterComponent } from './register.component';
import { AuthResponse } from '../core/auth/auth.model';
import { ApiErrorResponse } from '../core/error/api-error.model';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let errorTranslation: jasmine.SpyObj<ErrorTranslationService>;
  let navigateSpy: jasmine.Spy;

  const stubAuthResponse: AuthResponse = {
    accessToken: 'tok',
    refreshToken: 'ref',
    user: { id: 2, email: 'nowy@x.com', role: 'USER' },
  };

  const stubApiError: ApiErrorResponse = {
    errorId: 'e2',
    status: 409,
    title: 'Conflict',
    path: '/auth/register',
    timestamp: '2026-01-01T00:00:00Z',
    code: 'ex.user.already.exists',
  };

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['register']);
    errorTranslation = jasmine.createSpyObj<ErrorTranslationService>(
      'ErrorTranslationService',
      ['extractApiError', 'translateApiError'],
    );

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ErrorTranslationService, useValue: errorTranslation },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    navigateSpy = spyOn(TestBed.inject(Router), 'navigate');
  });

  afterEach(() => fixture.destroy());

  it('powinien pokazać błąd gdy wymagane pola są puste', () => {
    component.onSubmit();

    expect(component.errorMessage).toBe('Wypełnij wymagane pola');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('powinien pokazać błąd gdy hasła się nie zgadzają', () => {
    component.email = 'test@example.com';
    component.password = 'haslo123';
    component.confirmPassword = 'inne';

    component.onSubmit();

    expect(component.errorMessage).toBe('Hasła nie są identyczne');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('powinien pokazać błąd gdy hasło jest za krótkie', () => {
    component.email = 'test@example.com';
    component.password = 'abc';
    component.confirmPassword = 'abc';

    component.onSubmit();

    expect(component.errorMessage).toBe('Hasło musi mieć minimum 8 znaków');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('powinien zarejestrować i przekierować na stronę projektów', () => {
    component.email = 'nowy@example.com';
    component.password = 'haslo123';
    component.confirmPassword = 'haslo123';
    authService.register.and.returnValue(of(stubAuthResponse));

    component.onSubmit();

    expect(authService.register).toHaveBeenCalledOnceWith({
      email: 'nowy@example.com',
      password: 'haslo123',
      firstName: undefined,
      lastName: undefined,
    });
    expect(navigateSpy).toHaveBeenCalledWith(['/kitchen/projects']);
  });

  it('powinien przekazać imię i nazwisko gdy są podane', () => {
    component.email = 'jan@example.com';
    component.password = 'haslo123';
    component.confirmPassword = 'haslo123';
    component.firstName = 'Jan';
    component.lastName = 'Kowalski';
    authService.register.and.returnValue(of(stubAuthResponse));

    component.onSubmit();

    expect(authService.register).toHaveBeenCalledOnceWith({
      email: 'jan@example.com',
      password: 'haslo123',
      firstName: 'Jan',
      lastName: 'Kowalski',
    });
  });

  it('powinien pokazać przetłumaczony błąd z backendu po nieudanej rejestracji', () => {
    component.email = 'istnieje@example.com';
    component.password = 'haslo123';
    component.confirmPassword = 'haslo123';
    authService.register.and.returnValue(throwError(() => ({ error: stubApiError })));
    errorTranslation.extractApiError.and.returnValue(stubApiError);
    errorTranslation.translateApiError.and.returnValue([
      { message: 'Użytkownik o tym adresie już istnieje', details: [] },
    ]);

    component.onSubmit();

    expect(component.errorMessage).toBe('Użytkownik o tym adresie już istnieje');
    expect(component.isLoading).toBeFalse();
  });

  it('powinien pokazać domyślny błąd gdy odpowiedź nie jest ApiErrorResponse', () => {
    component.email = 'test@example.com';
    component.password = 'haslo123';
    component.confirmPassword = 'haslo123';
    authService.register.and.returnValue(throwError(() => new Error('sieć')));
    errorTranslation.extractApiError.and.returnValue(null);

    component.onSubmit();

    expect(component.errorMessage).toBe('Błąd rejestracji. Spróbuj ponownie.');
    expect(component.isLoading).toBeFalse();
  });
});
