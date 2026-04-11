import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, shareReplay } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DEFAULT_TRANSLATIONS } from "./default-translations";
import { environment } from '../../environments/environment';

interface TranslationCache {
  [key: string]: string;
}

interface CacheStore {
  single: Map<string, TranslationCache>;
  multi: Map<string, TranslationCache>;
}

@Injectable({providedIn: 'root'})
export class TranslationService {
  private readonly translationUrl = `${environment.apiUrl}/translation`;
  private readonly translationBatchUrl = `${environment.apiUrl}/translation/batch`;
  private readonly translationAllUrl = `${environment.apiUrl}/translation/all`;
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minut

  private readonly cache: CacheStore = {
    single: new Map<string, TranslationCache>(),
    multi: new Map<string, TranslationCache>()
  };

  private cacheTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly http: HttpClient) {
  }

  /**
   * Pobiera tłumaczenia dla jednej kategorii.
   * @param category Kategoria (np. "MATERIAL", "BOARD_NAME")
   * @param lang Język ("pl" lub "en"), domyślnie "pl"
   */
  getByCategory(category: string, lang = 'pl'): Observable<TranslationCache> {
    const cacheKey = this.getCacheKey([category], lang);

    if (this.cache.single.has(cacheKey)) {
      return of(this.cache.single.get(cacheKey)!);
    }

    const params = new HttpParams().set('category', category).set('lang', lang);
    return this.http.get<TranslationCache>(this.translationUrl, { params }).pipe(
      tap(translations => {
        this.cache.single.set(cacheKey, translations);
        this.setCacheTimer(cacheKey);
      }),
      shareReplay(1)
    );
  }

  /**
   * Pobiera tłumaczenia dla wielu kategorii naraz.
   * @param categories Lista kategorii
   * @param lang Język ("pl" lub "en"), domyślnie "pl"
   */
  getByCategories(categories: string[], lang = 'pl'): Observable<TranslationCache> {
    const cacheKey = this.getCacheKey(categories, lang);

    if (this.cache.multi.has(cacheKey)) {
      return of(this.cache.multi.get(cacheKey)!);
    }

    const params = new HttpParams()
      .set('categories', categories.join(','))
      .set('lang', lang);

    return this.http.get<TranslationCache>(this.translationBatchUrl, { params }).pipe(
      tap(translations => {
        this.cache.multi.set(cacheKey, translations);
        this.setCacheTimer(cacheKey);
      }),
      shareReplay(1)
    );
  }

  /**
   * Pobiera wszystkie tłumaczenia.
   * @param lang Język ("pl" lub "en"), domyślnie "pl"
   */
  getAll(lang = 'pl'): Observable<TranslationCache> {
    const cacheKey = `ALL_${lang.toUpperCase()}`;

    if (this.cache.multi.has(cacheKey)) {
      return of(this.cache.multi.get(cacheKey)!);
    }

    const params = new HttpParams().set('lang', lang);
    return this.http.get<TranslationCache>(this.translationAllUrl, { params }).pipe(
      tap(translations => {
        this.cache.multi.set(cacheKey, translations);
        this.setCacheTimer(cacheKey);
      }),
      shareReplay(1)
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
        // Invalidate cache for affected languages so next fetch is fresh
        entries.forEach(e => {
          const lang = e.lang.toUpperCase();
          this.cache.single.forEach((_, k) => { if (k.startsWith(lang + '_')) this.cache.single.delete(k); });
          this.cache.multi.forEach((_, k)  => { if (k.startsWith(lang + '_')) this.cache.multi.delete(k); });
        });
      })
    );
  }

  clearCache(clearAll: boolean = true, specificKey?: string): void {
    if (clearAll) {
      this.cache.single.clear();
      this.cache.multi.clear();
      this.cacheTimers.forEach(timer => clearTimeout(timer));
      this.cacheTimers.clear();
    } else if (specificKey) {
      this.cache.single.delete(specificKey);
      this.cache.multi.delete(specificKey);
      this.clearCacheTimer(specificKey);
    }
  }

  private getCacheKey(categories: string[], lang = 'pl'): string {
    return `${lang.toUpperCase()}_${[...categories].sort().join('_')}`;
  }

  private setCacheTimer(cacheKey: string): void {
    this.clearCacheTimer(cacheKey);
    this.cacheTimers.set(
      cacheKey,
      setTimeout(() => {
        this.clearCache(false, cacheKey);
      }, this.CACHE_TTL)
    );
  }

  private clearCacheTimer(cacheKey: string): void {
    if (this.cacheTimers.has(cacheKey)) {
      clearTimeout(this.cacheTimers.get(cacheKey)!);
      this.cacheTimers.delete(cacheKey);
    }
  }
}
