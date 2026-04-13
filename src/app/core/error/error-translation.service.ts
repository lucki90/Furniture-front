import { Injectable, effect, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { TranslationService } from '../../translation/translation.service';
import { LanguageService } from '../../service/language.service';
import { ApiErrorResponse, FieldErrorDetail, TranslatedError } from './api-error.model';

/**
 * Serwis tłumaczenia błędów API.
 *
 * Ładuje tłumaczenia z backendu (/translation/batch?categories=ex,field,...&lang=pl).
 * Automatycznie przeładowuje tłumaczenia przy zmianie języka.
 *
 * Priorytety fallbacka dla nieznanych kodów:
 *   1. Tłumaczenie z backendu (DB) w bieżącym języku
 *   2. Wbudowane polskie tłumaczenia (HARDCODED_FALLBACKS)
 *   3. Angielski komunikat z backendu (pole "message" w FieldErrorDetail)
 *   4. Sformatowany kod (ostateczność — "ex.foo.bar" → "Ex Foo Bar")
 *
 * Może być wstrzykiwany bezpośrednio w komponentach (np. LoginComponent),
 * które potrzebują przetłumaczonego komunikatu bez toastu.
 */
@Injectable({ providedIn: 'root' })
export class ErrorTranslationService {
  private readonly translationService = inject(TranslationService);
  private readonly langService = inject(LanguageService);

  constructor() {
    // Automatyczny reload tłumaczeń przy zmianie języka (w tym przy starcie)
    effect(() => {
      this.loadForLang(this.langService.lang());
    });
  }

  /** Kategorie tłumaczeń błędów ładowane z backendu */
  private readonly ERROR_CATEGORIES = ['ex', 'field', 'wall', 'json', 'validation', 'ARGUMENT_LABEL'];

  /** Tłumaczenia załadowane z backendu (sygnał) */
  private readonly backendTranslations = signal<Record<string, string>>({});

  /**
   * Etykiety argumentów błędów wyświetlane w sekcji szczegółów toastu.
   * Klucze = nazwy pól z "arguments" w FieldErrorDetail.
   */
  private readonly ARG_LABELS: Record<string, string> = {
    actual:         'Aktualna wartość',
    max:            'Wartość maksymalna',
    min:            'Wartość minimalna',
    cabinetId:      'Szafka',
    cabinetId1:     'Szafka 1',
    cabinetId2:     'Szafka 2',
    wallId:         'Ściana',
    field:          'Pole',
    value:          'Wartość',
    minimumDepth:   'Min. głębokość',
    actualDepth:    'Aktualna głębokość',
    minimumHeight:  'Min. wysokość',
    actualHeight:   'Aktualna wysokość',
    requestedKey:   'Klucz',
    maxVeneer:      'Maks. okleina',
    count:          'Liczba',
  };

  /**
   * Wbudowane polskie tłumaczenia — używane gdy backend niedostępny.
   * Pokrywają najczęstsze ogólne błędy.
   */
  private readonly HARDCODED_FALLBACKS: Record<string, string> = {
    'ex.validation.error':   'Błąd walidacji',
    'ex.validation.failed':  'Walidacja nie powiodła się',
    'ex.not.found':          'Nie znaleziono zasobu',
    'ex.internal.error':     'Wewnętrzny błąd serwera',
    'ex.bad.request':        'Nieprawidłowe żądanie',
    'field.min':             'Wartość musi wynosić co najmniej {{min}}',
    'field.max':             'Wartość może wynosić maksymalnie {{max}}',
    'field.required':        'To pole jest wymagane',
    'field.not.blank':       'To pole nie może być puste',
    'field.size':            'Rozmiar musi być między {{min}} a {{max}}',
    'field.email.invalid':   'Nieprawidłowy format adresu email',
    'wall.width.min':        'Szerokość ściany musi wynosić co najmniej {{min}} mm',
    'wall.width.max':        'Szerokość ściany może wynosić maksymalnie {{max}} mm',
    'wall.height.min':       'Wysokość ściany musi wynosić co najmniej {{min}} mm',
    'wall.height.max':       'Wysokość ściany może wynosić maksymalnie {{max}} mm',
    'json.malformed':        'Nieprawidłowy format żądania',
    'json.invalid.value':    'Nieprawidłowy typ wartości',
    'json.missing.field':    'Brak wymaganego pola: {{field}}',
  };

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Ładuje tłumaczenia błędów z backendu dla wskazanego języka.
   * Wywoływane przez ApiErrorHandler przy starcie i zmianie języka.
   */
  loadForLang(lang: string): void {
    this.translationService
      .getByCategories(this.ERROR_CATEGORIES, lang)
      .pipe(catchError(() => of({})))
      .subscribe(translations => this.backendTranslations.set(translations));
  }

  /**
   * Tłumaczy jeden błąd z `errors[]` na gotowy do wyświetlenia obiekt.
   */
  translateFieldError(err: FieldErrorDetail, errorId?: string): TranslatedError {
    return this.translate(err.code, err.arguments, err.message, err.field, errorId);
  }

  /**
   * Tłumaczy odpowiedź ApiErrorResponse na listę gotowych do wyświetlenia błędów.
   */
  translateApiError(error: ApiErrorResponse): TranslatedError[] {
    if (error.errors && error.errors.length > 0) {
      return error.errors.map(e => this.translateFieldError(e, error.errorId));
    }
    if (error.code) {
      return [this.translate(error.code, error.arguments, error.message, undefined, error.errorId)];
    }
    // Fallback: użyj kodu z title jeśli nic innego nie ma
    const titleCode = error.title.toLowerCase().replace(/_/g, '.');
    return [this.translate(titleCode, undefined, undefined, undefined, error.errorId)];
  }

  /**
   * Sprawdza czy obiekt jest ApiErrorResponse (ma errorId i status).
   */
  isApiError(error: unknown): error is ApiErrorResponse {
    return (
      error !== null &&
      typeof error === 'object' &&
      'errorId' in error &&
      'status' in error
    );
  }

  /**
   * Wyciąga ApiErrorResponse z HttpErrorResponse (err.error).
   */
  extractApiError(httpError: unknown): ApiErrorResponse | null {
    if (
      httpError !== null &&
      typeof httpError === 'object' &&
      'error' in httpError &&
      this.isApiError((httpError as { error: unknown }).error)
    ) {
      return (httpError as { error: ApiErrorResponse }).error;
    }
    return null;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private translate(
    code: string,
    args?: Record<string, string>,
    backendMessage?: string,
    field?: string,
    errorId?: string,
  ): TranslatedError {
    const backend = this.backendTranslations();
    const template = backend[code] ?? this.HARDCODED_FALLBACKS[code];

    if (template) {
      const message = args ? this.interpolate(template, args) : template;
      // Pokaż argumenty jako szczegóły tylko gdy szablon ich nie zawiera
      const templateHasArgs = args && Object.keys(args).some(k => template.includes(`{{${k}}}`));
      const details = !templateHasArgs && args ? this.formatArgs(args) : [];
      return { message, details, field, errorId };
    }

    // Brak tłumaczenia — priorytet 3: angielski komunikat z backendu
    if (backendMessage) {
      return { message: backendMessage, details: args ? this.formatArgs(args) : [], field, errorId };
    }

    // Priorytet 4: sformatowany kod (ostateczność)
    console.warn(`[ErrorTranslation] Missing translation for code: ${code}`);
    return {
      message: this.formatCodeAsMessage(code),
      details: args ? this.formatArgs(args) : [],
      field,
      errorId,
    };
  }

  private interpolate(template: string, args: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
      args[key] !== undefined ? String(args[key]) : match,
    );
  }

  private formatArgs(args: Record<string, string>): string[] {
    const backend = this.backendTranslations();
    return Object.entries(args).map(([k, v]) => {
      // Priorytety etykiety argumentu: 1. DB (ARGUMENT_LABEL.*), 2. hardcoded, 3. klucz surowy
      const label = backend[`ARGUMENT_LABEL.${k}`] ?? this.ARG_LABELS[k] ?? k;
      return `${label}: ${v}`;
    });
  }

  private formatCodeAsMessage(code: string): string {
    return code
      .split('.')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
