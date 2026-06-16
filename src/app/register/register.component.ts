import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/auth/auth.service';
import { ErrorTranslationService } from '../core/error/error-translation.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  email = '';
  password = '';
  confirmPassword = '';
  firstName = '';
  lastName = '';
  errorMessage = '';
  isLoading = false;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errorTranslation = inject(ErrorTranslationService);

  onSubmit(): void {
    if (!this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Wypełnij wymagane pola';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Hasła nie są identyczne';
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage = 'Hasło musi mieć minimum 8 znaków';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register({
      email: this.email,
      password: this.password,
      firstName: this.firstName || undefined,
      lastName: this.lastName || undefined
    }).subscribe({
      next: () => {
        this.router.navigate(['/kitchen/projects']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.translateRegisterError(err);
      }
    });
  }

  private translateRegisterError(err: unknown): string {
    const apiError = this.errorTranslation.extractApiError(err);
    if (apiError) {
      return this.errorTranslation.translateApiError(apiError)[0]?.message ?? 'Błąd rejestracji. Spróbuj ponownie.';
    }
    return 'Błąd rejestracji. Spróbuj ponownie.';
  }
}
