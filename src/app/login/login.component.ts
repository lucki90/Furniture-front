import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { ErrorTranslationService } from '../core/error/error-translation.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errorTranslation = inject(ErrorTranslationService);

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Wypełnij wszystkie pola';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigate(['/kitchen/projects']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.translateLoginError(err);
      }
    });
  }

  private translateLoginError(err: unknown): string {
    const apiError = this.errorTranslation.extractApiError(err);
    if (apiError) {
      const translated = this.errorTranslation.translateApiError(apiError);
      return translated[0]?.message ?? 'Nieprawidłowy email lub hasło';
    }
    return 'Nieprawidłowy email lub hasło';
  }
}
