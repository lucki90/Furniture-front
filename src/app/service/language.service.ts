import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const STORAGE_KEY = 'app-language';
const SUPPORTED_LANGS = ['pl', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGS)[number];

/**
 * Serwis zarządzania językiem aplikacji.
 * Wykrywa język przeglądarki (domyślny PL), persystuje wybór w localStorage.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly _lang = signal<AppLanguage>(this.detectInitialLanguage());

  /** Aktywny język jako readonly signal */
  readonly lang = this._lang.asReadonly();

  /** Dostępne języki do wyświetlenia w przełączniku */
  readonly supportedLanguages: { code: AppLanguage; label: string }[] = [
    { code: 'pl', label: 'PL Polski' },
    { code: 'en', label: 'EN English' },
  ];

  setLanguage(lang: AppLanguage): void {
    this._lang.set(lang);
    this.saveLanguage(lang);
  }

  private detectInitialLanguage(): AppLanguage {
    // 1. Zapisany wcześniej wybór użytkownika
    const stored = this.readStoredLanguage();
    if (stored && (SUPPORTED_LANGS as readonly string[]).includes(stored)) {
      return stored;
    }
    if (!this.isBrowser) {
      return 'pl';
    }
    // 2. Wykrywanie z przeglądarki
    const browserLang = (navigator.language || '').toLowerCase();
    return browserLang.startsWith('pl') ? 'pl' : 'en';
  }

  private readStoredLanguage(): AppLanguage | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      return localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
    } catch {
      return null;
    }
  }

  private saveLanguage(lang: AppLanguage): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage bywa niedostępny w trybach prywatności; język nadal zmienia się w pamięci.
    }
  }
}
