import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, shareReplay } from 'rxjs';
import { tap } from 'rxjs/operators';
import {DEFAULT_TRANSLATIONS} from "./default-translations";

interface TranslationCache {
  [key: string]: string;
}

interface CacheStore {
  single: Map<string, TranslationCache>;
  multi: Map<string, TranslationCache>;
}

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly translationUrl = 'http://localhost:8080/api/furniture/translation';
  private readonly translationsUrl = 'http://localhost:8080/api/furniture/translations';
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minut

  private readonly cache: CacheStore = {
    single: new Map<string, TranslationCache>(),
    multi: new Map<string, TranslationCache>()
  };

  private cacheTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly http: HttpClient) {}

  getTranslations(language: string, prefix: string): Observable<TranslationCache> {
    const cacheKey = this.getCacheKey(language, [prefix]);

    if (this.cache.single.has(cacheKey)) {
      return of(this.cache.single.get(cacheKey)!);
    }

    return this.http.get<TranslationCache>(
      `${this.translationUrl}?lang=${language}&prefix=${prefix}`
    ).pipe(
      tap(translations => {
        this.cache.single.set(cacheKey, translations);
        this.setCacheTimer(cacheKey);
      }),
      shareReplay(1)
    );
  }

  getTranslationsByPrefixes(lang: string, prefixes: string[]): Observable<TranslationCache> {
    const cacheKey = this.getCacheKey(lang, prefixes);

    if (this.cache.multi.has(cacheKey)) {
      return of(this.cache.multi.get(cacheKey)!);
    }

    const params = new HttpParams()
      .set('lang', lang)
      .set('prefixes', prefixes.join(','));

    return this.http.get<TranslationCache>(
      this.translationsUrl,
      { params }
    ).pipe(
      tap(translations => {
        this.cache.multi.set(cacheKey, translations);
        this.setCacheTimer(cacheKey);
      }),
      shareReplay(1)
    );
  }

   getDefaultTranslations(): { [key: string]: string } {
    return { ...DEFAULT_TRANSLATIONS };
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

  updateCacheEntry(lang: string, prefix: string, newTranslations: TranslationCache): void {
    const cacheKey = this.getCacheKey(lang, [prefix]);
    this.cache.single.set(cacheKey, newTranslations);
    this.setCacheTimer(cacheKey);

    for (const [key, value] of this.cache.multi.entries()) {
      if (key.startsWith(`${lang}_`)) {
        this.cache.multi.set(key, { ...value, ...newTranslations });
        this.setCacheTimer(key);
      }
    }
  }

  private getCacheKey(lang: string, prefixes: string[]): string {
    return `${lang}_${[...prefixes].sort().join('_')}`;
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
