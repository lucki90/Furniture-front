import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map, firstValueFrom } from 'rxjs';
import { ApiErrorResponse, FieldErrorDetail, TranslatedError } from './api-error.model';

/**
 * Serwis do tłumaczenia błędów API.
 *
 * Pobiera tłumaczenia z backendu i interpoluje argumenty.
 * Wspiera format {{nazwaArgumentu}} w komunikatach.
 */
@Injectable({ providedIn: 'root' })
export class ErrorTranslationService {
  private readonly translationUrl = 'http://localhost:8080/api/furniture/translation';
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minut

  // Cache tłumaczeń błędów
  private errorTranslationsCache = signal<Record<string, string>>({});
  private cacheLoadedAt: number | null = null;

  // Domyślne tłumaczenia (fallback gdy brak połączenia z API)
  private readonly DEFAULT_TRANSLATIONS: Record<string, string> = {
    // Ogólne
    'validation.error': 'Błąd walidacji',
    'validation.failed': 'Walidacja nie powiodła się',
    'resource.not.found': 'Zasób nie został znaleziony',
    'internal.error': 'Wewnętrzny błąd serwera',
    'calculation.failed': 'Błąd podczas obliczeń',

    // Walidacja pól
    'field.min': 'Wartość musi wynosić co najmniej {{min}}',
    'field.max': 'Wartość może wynosić maksymalnie {{max}}',
    'field.required': 'To pole jest wymagane',
    'field.not.blank': 'To pole nie może być puste',
    'field.size': 'Rozmiar musi być pomiędzy {{min}} a {{max}}',
    'field.email.invalid': 'Nieprawidłowy format adresu email',

    // Ściany
    'wall.type.required': 'Typ ściany jest wymagany',
    'wall.width.min': 'Szerokość ściany musi wynosić co najmniej {{min}} mm',
    'wall.width.max': 'Szerokość ściany może wynosić maksymalnie {{max}} mm',
    'wall.height.min': 'Wysokość ściany musi wynosić co najmniej {{min}} mm',
    'wall.height.max': 'Wysokość ściany może wynosić maksymalnie {{max}} mm',

    // JSON
    'json.malformed': 'Nieprawidłowy format żądania',
    'json.invalid.value': 'Nieprawidłowy typ wartości',
    'json.missing.field': 'Brak wymaganego pola: {{field}}',
    'json.incomplete': 'Niekompletne żądanie',
    'json.invalid.format': 'Nieprawidłowy format danych'
  };

  constructor(private readonly http: HttpClient) {
    // Załaduj tłumaczenia przy starcie
    this.loadTranslations();
  }

  /**
   * Ładuje tłumaczenia błędów z API.
   */
  loadTranslations(): Observable<Record<string, string>> {
    // Sprawdź czy cache jest aktualny
    if (this.cacheLoadedAt && Date.now() - this.cacheLoadedAt < this.CACHE_TTL) {
      return of(this.errorTranslationsCache());
    }

    // TODO: Dodać endpoint do pobierania tłumaczeń błędów
    // Na razie używamy domyślnych tłumaczeń
    this.errorTranslationsCache.set(this.DEFAULT_TRANSLATIONS);
    this.cacheLoadedAt = Date.now();
    return of(this.DEFAULT_TRANSLATIONS);
  }

  /**
   * Tłumaczy odpowiedź błędu API na listę przetłumaczonych błędów.
   */
  translateApiError(error: ApiErrorResponse): TranslatedError[] {
    const results: TranslatedError[] = [];

    // Jeśli jest lista błędów walidacji
    if (error.errors && error.errors.length > 0) {
      for (const fieldError of error.errors) {
        results.push({
          message: this.translateCode(fieldError.code, fieldError.arguments),
          field: fieldError.field,
          errorId: error.errorId
        });
      }
    }
    // Jeśli jest pojedynczy kod błędu
    else if (error.code) {
      results.push({
        message: this.translateCode(error.code, error.arguments),
        errorId: error.errorId
      });
    }
    // Fallback - użyj title jako komunikatu
    else {
      results.push({
        message: this.translateCode(error.title.toLowerCase().replace(/_/g, '.'), {}),
        errorId: error.errorId
      });
    }

    return results;
  }

  /**
   * Tłumaczy kod błędu na komunikat z interpolacją argumentów.
   */
  translateCode(code: string, args?: Record<string, any>): string {
    const translations = this.errorTranslationsCache();

    // Znajdź tłumaczenie
    let template = translations[code] || this.DEFAULT_TRANSLATIONS[code];

    // Fallback - zwróć sam kod jeśli brak tłumaczenia
    if (!template) {
      console.warn(`Missing translation for error code: ${code}`);
      return this.formatCodeAsMessage(code);
    }

    // Interpoluj argumenty
    if (args) {
      template = this.interpolate(template, args);
    }

    return template;
  }

  /**
   * Interpoluje argumenty w szablonie komunikatu.
   * Format: {{nazwaArgumentu}}
   */
  private interpolate(template: string, args: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = args[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Formatuje kod błędu jako czytelny komunikat (fallback).
   */
  private formatCodeAsMessage(code: string): string {
    // "wall.height.min" -> "Wall height min"
    return code
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Sprawdza czy odpowiedź HTTP to ApiErrorResponse.
   */
  isApiError(error: any): error is ApiErrorResponse {
    return error && typeof error === 'object' && 'errorId' in error && 'status' in error;
  }

  /**
   * Wyciąga ApiErrorResponse z błędu HTTP.
   */
  extractApiError(httpError: any): ApiErrorResponse | null {
    if (httpError?.error && this.isApiError(httpError.error)) {
      return httpError.error;
    }
    return null;
  }
}
