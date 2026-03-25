import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'app-language';
const SUPPORTED_LANGS = ['pl', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGS)[number];

/**
 * Serwis zarządzania językiem aplikacji.
 * Wykrywa język przeglądarki (domyślny PL), persystuje wybór w localStorage.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly _lang = signal<AppLanguage>(this.detectInitialLanguage());

  /** Aktywny język jako readonly signal */
  readonly lang = this._lang.asReadonly();

  /** Dostępne języki do wyświetlenia w przełączniku */
  readonly supportedLanguages: { code: AppLanguage; label: string }[] = [
    { code: 'pl', label: '🇵🇱 Polski' },
    { code: 'en', label: '🇬🇧 English' },
  ];

  setLanguage(lang: AppLanguage): void {
    this._lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  private detectInitialLanguage(): AppLanguage {
    // 1. Zapisany wcześniej wybór użytkownika
    const stored = localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
    if (stored && (SUPPORTED_LANGS as readonly string[]).includes(stored)) {
      return stored;
    }
    // 2. Wykrywanie z przeglądarki
    const browserLang = (navigator.language || '').toLowerCase();
    return browserLang.startsWith('pl') ? 'pl' : 'en';
  }
}
