import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, shareReplay, tap, throwError } from 'rxjs';
import { DEFAULT_TRANSLATIONS } from "./default-translations";
import { environment } from '../../environments/environment';

interface TranslationCache {
  [key: string]: string;
}

interface TranslationCacheEntry {
  expiresAt: number;
  request$: Observable<TranslationCache>;
}

@Injectable({providedIn: 'root'})
export class TranslationService {
  private readonly translationUrl = `${environment.apiUrl}/translation`;
  private readonly translationBatchUrl = `${environment.apiUrl}/translation/batch`;
  private readonly translationAllUrl = `${environment.apiUrl}/translation/all`;
  private readonly cacheTtlMs = 1000 * 60 * 30;
  private readonly cache = new Map<string, TranslationCacheEntry>();

  constructor(private readonly http: HttpClient) {
  }

  /**
   * Pobiera tłumaczenia dla jednej kategorii.
   * @param category Kategoria (np. "MATERIAL", "BOARD_NAME")
   * @param lang Język ("pl" lub "en"), domyślnie "pl"
   */
  getByCategory(category: string, lang = 'pl'): Observable<TranslationCache> {
    const cacheKey = this.getCacheKey('single', [category], lang);
    const params = new HttpParams().set('category', category).set('lang', lang);
    return this.getCached(
      cacheKey,
      () => this.http.get<TranslationCache>(this.translationUrl, { params })
    );
  }

  /**
   * Pobiera tłumaczenia dla wielu kategorii naraz.
   * @param categories Lista kategorii
   * @param lang Język ("pl" lub "en"), domyślnie "pl"
   */
  getByCategories(categories: string[], lang = 'pl'): Observable<TranslationCache> {
    const normalizedCategories = this.normalizeCategories(categories);
    if (normalizedCategories.length === 0) {
      return of({});
    }

    const cacheKey = this.getCacheKey('multi', normalizedCategories, lang);
    const params = new HttpParams()
      .set('categories', normalizedCategories.join(','))
      .set('lang', lang);

    return this.getCached(
      cacheKey,
      () => this.http.get<TranslationCache>(this.translationBatchUrl, { params })
    );
  }

  /**
   * Pobiera wszystkie tłumaczenia.
   * @param lang Język ("pl" lub "en"), domyślnie "pl"
   */
  getAll(lang = 'pl'): Observable<TranslationCache> {
    const cacheKey = this.getCacheKey('all', [], lang);
    const params = new HttpParams().set('lang', lang);
    return this.getCached(
      cacheKey,
      () => this.http.get<TranslationCache>(this.translationAllUrl, { params })
    );
  }

  getDefaultTranslations(): { [key: string]: string } {
    return {...DEFAULT_TRANSLATIONS};
  }

  /**
   * Upserts (creates or updates) translations for a key across multiple languages.
   * @param key Translation key, e.g. "BOARD_VARIANT.WHITE"
   * @param entries Array of {lang, value} pairs
   */
  upsertTranslations(key: string, entries: { lang: string; value: string }[]): Observable<void> {
    return this.http.post<void>(`${this.translationUrl}/upsert`, { key, entries }).pipe(
      tap(() => {
        const affectedLanguages = new Set(entries.map(entry => entry.lang.toUpperCase()));
        this.cache.forEach((_, cacheKey) => {
          if (affectedLanguages.has(this.getLanguageFromCacheKey(cacheKey))) {
            this.cache.delete(cacheKey);
          }
        });
      })
    );
  }

  clearCache(): void {
    this.cache.clear();
  }

  private getCached(
    cacheKey: string,
    requestFactory: () => Observable<TranslationCache>
  ): Observable<TranslationCache> {
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.request$;
    }

    this.cache.delete(cacheKey);
    let entry: TranslationCacheEntry;
    const request$ = requestFactory().pipe(
      tap(() => {
        entry.expiresAt = Date.now() + this.cacheTtlMs;
      }),
      catchError(error => {
        if (this.cache.get(cacheKey) === entry) {
          this.cache.delete(cacheKey);
        }
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    entry = {
      expiresAt: Number.POSITIVE_INFINITY,
      request$
    };
    this.cache.set(cacheKey, entry);
    return request$;
  }

  private getCacheKey(scope: 'single' | 'multi' | 'all', categories: string[], lang: string): string {
    return `${scope}|${lang.toUpperCase()}|${categories.join(',')}`;
  }

  private getLanguageFromCacheKey(cacheKey: string): string {
    return cacheKey.split('|')[1] ?? '';
  }

  private normalizeCategories(categories: string[]): string[] {
    return [...new Set(categories)].sort();
  }
}
