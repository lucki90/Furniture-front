/**
 * Model odpowiedzi błędu z API.
 *
 * Backend zwraca kody błędów zamiast przetłumaczonych komunikatów.
 * Frontend sam tłumaczy komunikaty na podstawie aktualnego języka.
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

  /** Lista szczegółowych błędów (dla walidacji) */
  errors?: FieldErrorDetail[];

  /** Pojedynczy kod błędu (dla prostych błędów) */
  code?: string;

  /** Argumenty dla pojedynczego kodu błędu */
  arguments?: Record<string, any>;
}

/**
 * Szczegóły błędu walidacji dla pojedynczego pola.
 */
export interface FieldErrorDetail {
  /** Nazwa pola (ścieżka), którego dotyczy błąd */
  field?: string;

  /** Kod błędu do tłumaczenia */
  code: string;

  /** Argumenty do interpolacji w komunikacie */
  arguments?: Record<string, any>;
}

/**
 * Przetłumaczony błąd gotowy do wyświetlenia.
 */
export interface TranslatedError {
  /** Przetłumaczony komunikat błędu */
  message: string;

  /** Nazwa pola (jeśli dotyczy konkretnego pola) */
  field?: string;

  /** Unikalny identyfikator błędu */
  errorId?: string;
}

/**
 * Typ toastu.
 */
export type ToastType = 'error' | 'warning' | 'success' | 'info';

/**
 * Dane toastu do wyświetlenia.
 */
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
