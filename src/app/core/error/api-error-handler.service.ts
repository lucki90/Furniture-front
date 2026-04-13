import { Injectable, inject } from '@angular/core';
import { ApiErrorResponse, TranslatedError } from './api-error.model';
import { ErrorTranslationService } from './error-translation.service';
import { ToastService } from './toast.service';

/**
 * Centralny serwis obsługi błędów HTTP — wyświetla toasty z przetłumaczonym błędem.
 *
 * Jedyny punkt wejścia, który komponenty powinny wstrzykiwać gdy chcą toast.
 * Obsługuje cały pipeline: ekstrakcja błędu → tłumaczenie → toast.
 *
 * Użycie w komponentach:
 *   private readonly errorHandler = inject(ApiErrorHandler);
 *   ...
 *   error: (err) => this.errorHandler.handle(err)
 *
 * Jeśli potrzebujesz przetłumaczonego komunikatu bez toastu (np. inline w formularzu),
 * wstrzyknij bezpośrednio ErrorTranslationService.
 *
 * Nie obsługuje 401/403 — te są przechwytywane przez auth.interceptor.ts.
 */
@Injectable({ providedIn: 'root' })
export class ApiErrorHandler {
  private readonly translation = inject(ErrorTranslationService);
  private readonly toast = inject(ToastService);

  // Tłumaczenia są ładowane automatycznie przez ErrorTranslationService (effect na języku)

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Obsługuje dowolny błąd z bloku `error:` subskrypcji.
   * Automatycznie wykrywa format (ApiErrorResponse / błąd sieciowy / inny).
   */
  handle(err: unknown): void {
    const apiError = this.translation.extractApiError(err);
    if (apiError) {
      this.handleApiError(apiError);
      return;
    }

    // Błąd sieciowy lub timeout
    const status = (err as { status?: number })?.status;
    if (status === 0) {
      this.toast.error('Brak połączenia z serwerem. Sprawdź połączenie internetowe.');
      return;
    }

    // Inny nieoczekiwany błąd
    const message = (err as { message?: string })?.message;
    this.toast.error(message || 'Wystąpił nieoczekiwany błąd.');
  }

  /**
   * Obsługuje typowany ApiErrorResponse (gdy już wyciągnięto z HttpErrorResponse).
   */
  handleApiError(error: ApiErrorResponse): void {
    const translatedErrors = this.translation.translateApiError(error);

    if (translatedErrors.length === 0) {
      this.toast.error('Wystąpił nieoczekiwany błąd.');
      return;
    }

    if (translatedErrors.length === 1) {
      this.showSingleError(translatedErrors[0]);
      return;
    }

    this.showMultipleErrors(translatedErrors, error.errorId);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private showSingleError(err: TranslatedError): void {
    this.toast.show({
      type: 'error',
      title: err.field ? this.formatFieldTitle(err.field) : 'Błąd',
      message: err.message,
      details: err.details.length > 0 ? err.details : undefined,
      errorId: err.errorId,
    });
  }

  private showMultipleErrors(errors: TranslatedError[], errorId?: string): void {
    const details = errors.map(err => {
      const prefix = err.field ? `${this.formatFieldTitle(err.field)}: ` : '';
      const suffix = err.details.length > 0 ? ` (${err.details.join(', ')})` : '';
      return `${prefix}${err.message}${suffix}`;
    });

    this.toast.show({
      type: 'error',
      title: `Błędy walidacji (${errors.length})`,
      message: 'Sprawdź i popraw poniższe błędy:',
      details,
      errorId,
    });
  }

  /**
   * Formatuje ścieżkę pola na czytelny tytuł.
   * np. "walls[2].widthMm" → "Ściana 3 → szerokość"
   */
  private formatFieldTitle(field: string): string {
    const FIELD_NAMES: Record<string, string> = {
      walls:            'Ściana',
      cabinets:         'Szafka',
      segments:         'Segment',
      drawers:          'Szuflada',
      // z sufiksem "Mm" (używany przez walidacje requestu)
      heightMm:         'wysokość',
      widthMm:          'szerokość',
      depthMm:          'głębokość',
      // bez sufiksu (używany przez błędy domenowe, np. segments[0].height)
      height:           'wysokość',
      width:            'szerokość',
      depth:            'głębokość',
      wallType:         'typ ściany',
      name:             'nazwa',
      email:            'email',
      countertop:       'blat',
      plinth:           'cokół',
      currentPrice:     'cena',
      unit:             'jednostka',
      colorCode:        'kod koloru',
      thicknessMm:      'grubość',
      modelCode:        'kod modelu',
      cornerFrontUchylnyWidthMm: 'szer. frontu uchylnego',
    };

    return field
      .split('.')
      .map(part => {
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          const [, name, index] = arrayMatch;
          return `${FIELD_NAMES[name] ?? name} ${parseInt(index) + 1}`;
        }
        return FIELD_NAMES[part] ?? part;
      })
      .join(' → ');
  }
}
