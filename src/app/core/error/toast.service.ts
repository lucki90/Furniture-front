import { Injectable, signal } from '@angular/core';
import { ToastData, ToastType } from './api-error.model';

/**
 * Serwis wyświetlania powiadomień toast.
 *
 * Odpowiedzialny wyłącznie za display — nie obsługuje HTTP ani tłumaczeń.
 * Dla błędów HTTP używaj ApiErrorHandler (errorHandler.handle(err)).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly DEFAULT_DURATION = 5000;
  private readonly ERROR_DURATION   = 10000;
  private readonly MAX_TOASTS       = 5;

  private toastIdCounter = 0;
  private readonly _toasts = signal<ToastData[]>([]);

  readonly toasts = this._toasts.asReadonly();

  // ─── Convenience methods ───────────────────────────────────────────────────

  error(message: string, title = 'Błąd'): void {
    this.show({ type: 'error', title, message, duration: this.ERROR_DURATION, dismissible: true });
  }

  warning(message: string, title = 'Ostrzeżenie'): void {
    this.show({ type: 'warning', title, message, duration: this.DEFAULT_DURATION, dismissible: true });
  }

  success(message: string, title = 'Sukces'): void {
    this.show({ type: 'success', title, message, duration: this.DEFAULT_DURATION, dismissible: true });
  }

  info(message: string, title = 'Informacja'): void {
    this.show({ type: 'info', title, message, duration: this.DEFAULT_DURATION, dismissible: true });
  }

  // ─── Core ─────────────────────────────────────────────────────────────────

  show(data: Partial<ToastData> & { type: ToastType; message: string }): void {
    const duration = data.duration ?? (data.type === 'error' ? this.ERROR_DURATION : this.DEFAULT_DURATION);
    const toast: ToastData = {
      id: `toast-${++this.toastIdCounter}`,
      type: data.type,
      title: data.title,
      message: data.message,
      details: data.details,
      errorId: data.errorId,
      duration,
      dismissible: data.dismissible ?? true,
    };

    this._toasts.update(toasts => {
      const next = [...toasts, toast];
      while (next.length > this.MAX_TOASTS) next.shift();
      return next;
    });

    if (duration > 0) {
      setTimeout(() => this.dismiss(toast.id), duration);
    }
  }

  dismiss(id: string): void {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  dismissAll(): void {
    this._toasts.set([]);
  }
}
