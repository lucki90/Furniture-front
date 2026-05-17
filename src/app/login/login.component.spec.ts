import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../core/auth/auth.service';
import { AuthResponse } from '../core/auth/auth.model';
import { ErrorTranslationService } from '../core/error/error-translation.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        {
          provide: ErrorTranslationService,
          useValue: {
            extractApiError: () => null,
            translateApiError: () => [{ message: 'Nieprawidlowy email lub haslo' }]
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('renders showcase content next to login form', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Projektuj, wyceniaj i zapisuj zabudowy w jednym miejscu.');
    expect(text).toContain('Nowy projekt kuchni');
    expect(text).toContain('Pojedyncza szafka');
    expect(text).toContain('Cenniki i materiały');
    expect(text).toContain('Logowanie');
  });

  it('shows validation error when credentials are missing', () => {
    component.email = '';
    component.password = '';

    component.onSubmit();
    fixture.detectChanges();

    expect(component.errorMessage).toContain('Wypełnij wszystkie pola');
  });

  it('navigates to projects after successful login', () => {
    authService.login.and.returnValue(of({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: 1,
        email: 'user@example.com',
        role: 'ADMIN'
      }
    } as AuthResponse));
    component.email = 'user@example.com';
    component.password = 'secret';

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith('user@example.com', 'secret');
    expect(router.navigate).toHaveBeenCalledWith(['/kitchen/projects']);
  });
});
