import { Injectable, signal, computed } from '@angular/core';
import { ToastData, ToastType, ApiErrorResponse } from './api-error.model';
import { ErrorTranslationService } from './error-translation.service';

/**
 * Serwis do wyświetlania powiadomień toast.
 *
 * Obsługuje różne typy powiadomień (error, warning, success, info)
 * oraz automatyczne tłumaczenie błędów API.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly DEFAULT_DURATION = 5000; // 5 sekund
  private readonly ERROR_DURATION = 10000;  // 10 sekund dla błędów
  private readonly MAX_TOASTS = 5;

  private toastIdCounter = 0;
  private _toasts = signal<ToastData[]>([]);

  readonly toasts = this._toasts.asReadonly();

  constructor(private readonly errorTranslation: ErrorTranslationService) {}

  /**
   * Wyświetla toast z błędem API.
   * Automatycznie tłumaczy kody błędów.
   */
  showApiError(error: ApiErrorResponse): void {
    const translatedErrors = this.errorTranslation.translateApiError(error);

    if (translatedErrors.length === 0) {
      this.error('Wystąpił nieoczekiwany błąd');
      return;
    }

    // Dla pojedynczego błędu - prosty toast
    if (translatedErrors.length === 1) {
      const err = translatedErrors[0];
      this.show({
        type: 'error',
        title: err.field ? this.formatFieldName(err.field) : 'Błąd',
        message: err.message,
        errorId: err.errorId,
        duration: this.ERROR_DURATION,
        dismissible: true
      });
      return;
    }

    // Dla wielu błędów - grupuj w jeden toast z listą
    const details = translatedErrors.map(err => {
      if (err.field) {
        return `${this.formatFieldName(err.field)}: ${err.message}`;
      }
      return err.message;
    });

    this.show({
      type: 'error',
      title: 'Błędy walidacji',
      message: `Znaleziono ${translatedErrors.length} błędów`,
      details,
      errorId: error.errorId,
      duration: this.ERROR_DURATION,
      dismissible: true
    });
  }

  /**
   * Wyświetla toast z błędem HTTP.
   * Automatycznie wyciąga ApiErrorResponse jeśli dostępny.
   */
  showHttpError(httpError: any): void {
    const apiError = this.errorTranslation.extractApiError(httpError);

    if (apiError) {
      this.showApiError(apiError);
      return;
    }

    // Fallback dla nieznanych błędów
    const message = httpError?.message || httpError?.statusText || 'Wystąpił błąd połączenia';
    this.error(message);
  }

  /**
   * Wyświetla toast z błędem.
   */
  error(message: string, title?: string): void {
    this.show({
      type: 'error',
      title: title || 'Błąd',
      message,
      duration: this.ERROR_DURATION,
      dismissible: true
    });
  }

  /**
   * Wyświetla toast z ostrzeżeniem.
   */
  warning(message: string, title?: string): void {
    this.show({
      type: 'warning',
      title: title || 'Ostrzeżenie',
      message,
      duration: this.DEFAULT_DURATION,
      dismissible: true
    });
  }

  /**
   * Wyświetla toast z sukcesem.
   */
  success(message: string, title?: string): void {
    this.show({
      type: 'success',
      title: title || 'Sukces',
      message,
      duration: this.DEFAULT_DURATION,
      dismissible: true
    });
  }

  /**
   * Wyświetla toast z informacją.
   */
  info(message: string, title?: string): void {
    this.show({
      type: 'info',
      title: title || 'Informacja',
      message,
      duration: this.DEFAULT_DURATION,
      dismissible: true
    });
  }

  /**
   * Wyświetla toast z podanymi danymi.
   */
  show(data: Partial<ToastData> & { type: ToastType; message: string }): void {
    const toast: ToastData = {
      id: `toast-${++this.toastIdCounter}`,
      type: data.type,
      title: data.title,
      message: data.message,
      details: data.details,
      errorId: data.errorId,
      duration: data.duration ?? this.DEFAULT_DURATION,
      dismissible: data.dismissible ?? true
    };

    // Dodaj toast i ogranicz ilość
    this._toasts.update(toasts => {
      const newToasts = [...toasts, toast];
      // Usuń najstarsze jeśli za dużo
      while (newToasts.length > this.MAX_TOASTS) {
        newToasts.shift();
      }
      return newToasts;
    });

    // Automatyczne ukrycie po czasie
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => this.dismiss(toast.id), toast.duration);
    }
  }

  /**
   * Usuwa toast po ID.
   */
  dismiss(id: string): void {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  /**
   * Usuwa wszystkie toasty.
   */
  dismissAll(): void {
    this._toasts.set([]);
  }

  /**
   * Formatuje nazwę pola na czytelną formę.
   * np. "walls[7].heightMm" -> "Ściana 8 - wysokość"
   */
  private formatFieldName(field: string): string {
    // Mapowanie nazw pól na polskie
    const fieldNames: Record<string, string> = {
      'heightMm': 'wysokość',
      'widthMm': 'szerokość',
      'depthMm': 'głębokość',
      'wallType': 'typ ściany',
      'cabinets': 'szafki',
      'countertop': 'blat',
      'plinth': 'cokół',
      'name': 'nazwa',
      'email': 'email'
    };

    // Parsuj ścieżkę pola
    const parts = field.split('.');
    const formattedParts: string[] = [];

    for (const part of parts) {
      // Sprawdź czy to tablica z indeksem (np. "walls[7]")
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, name, index] = arrayMatch;
        const readableName = this.translateFieldPart(name);
        formattedParts.push(`${readableName} ${parseInt(index) + 1}`);
      } else {
        const readableName = fieldNames[part] || this.translateFieldPart(part);
        formattedParts.push(readableName);
      }
    }

    return formattedParts.join(' → ');
  }

  /**
   * Tłumaczy część nazwy pola.
   */
  private translateFieldPart(part: string): string {
    const translations: Record<string, string> = {
      'walls': 'Ściana',
      'cabinets': 'Szafka',
      'segments': 'Segment',
      'drawers': 'Szuflada'
    };
    return translations[part] || part;
  }
}
