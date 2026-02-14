import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

/**
 * Element słownika z backendu
 */
export interface DictionaryItem {
  code: string;
  label: string;
  description?: string;
}

/**
 * Serwis do pobierania słowników (listy rozwijane).
 * Cachuje wyniki aby nie pobierać wielokrotnie.
 */
@Injectable({
  providedIn: 'root'
})
export class DictionaryService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/furniture/api/dictionaries' //TODO poprawic sciezki do api

  // Cache dla słowników
  private openingTypesCache$?: Observable<DictionaryItem[]>;

  /**
   * Pobiera typy otwarcia szafek.
   * Wynik jest cachowany.
   */
  getOpeningTypes(): Observable<DictionaryItem[]> {
    if (!this.openingTypesCache$) {
      this.openingTypesCache$ = this.http
        .get<DictionaryItem[]>(`${this.baseUrl}/opening-types`)
        .pipe(shareReplay(1));
    }
    return this.openingTypesCache$;
  }

  /**
   * Czyści cache (np. po zmianie języka)
   */
  clearCache(): void {
    this.openingTypesCache$ = undefined;
  }

  // Przyszłe metody:
  // getDrawerTypes(): Observable<DictionaryItem[]>
  // getHingeTypes(): Observable<DictionaryItem[]>
  // getMaterialTypes(): Observable<DictionaryItem[]>
}
