/**
 * Model odpowiedzi błędu z API.
 *
 * Backend zwraca kody błędów zamiast przetłumaczonych komunikatów.
 * Frontend tłumaczy komunikaty na podstawie aktualnego języka,
 * pobierając tłumaczenia z backendu (/translation/batch).
 */
export interface ApiErrorResponse {
  /** Typ błędu (np. VALIDATION_ERROR, NOT_FOUND, INTERNAL_ERROR) */
  title: string;

  /** Kod HTTP statusu */
  status: number;

  /** Ścieżka żądania */
  path: string;

  /** Unikalny identyfikator błędu (do logów i supportu) */
  errorId: string;

  /** Timestamp w formacie ISO 8601 */
  timestamp: string;

  /** Lista szczegółowych błędów (dla walidacji wielopolowej) */
  errors?: FieldErrorDetail[];

  /** Pojedynczy kod błędu (dla prostych błędów) */
  code?: string;

  /** Angielski komunikat błędu (fallback gdy brak tłumaczenia) */
  message?: string;

  /** Argumenty dla interpolacji {{klucz}} w pojedynczym błędzie */
  arguments?: Record<string, string>;
}

/**
 * Szczegóły jednego błędu walidacji / domenowego.
 */
export interface FieldErrorDetail {
  /** Nazwa pola (ścieżka), np. "walls[0].widthMm" */
  field?: string;

  /** Kod błędu do tłumaczenia, np. "ex.cabinet.exceeds.wall.width" */
  code: string;

  /** Angielski komunikat (fallback gdy brak PL tłumaczenia) */
  message?: string;

  /** Argumenty do interpolacji {{klucz}} w komunikacie */
  arguments?: Record<string, string>;
}

/**
 * Przetłumaczony błąd gotowy do wyświetlenia w UI.
 */
export interface TranslatedError {
  /** Przetłumaczony komunikat (główna treść) */
  message: string;

  /** Dodatkowe szczegóły — argumenty gdy brak pełnego szablonu */
  details: string[];

  /** Nazwa pola (jeśli błąd dotyczy konkretnego pola) */
  field?: string;

  /** Unikalny identyfikator błędu (dla supportu) */
  errorId?: string;
}

/** Typ powiadomienia toast */
export type ToastType = 'error' | 'warning' | 'success' | 'info';

/** Dane toastu do wyświetlenia */
export interface ToastData {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  details?: string[];
  errorId?: string;
  duration?: number;
  dismissible?: boolean;
}
