import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private translation = 'http://localhost:8080/api/furniture/translation';
  private translations = 'http://localhost:8080/api/furniture/translations';

  constructor(private http: HttpClient) {
  }

  getTranslations(language: string, prefix: string): Observable<{ [key: string]: string }> {
    return this.http.get<{ [key: string]: string }>(`${this.translation}?lang=${language}&prefix=${prefix}`);
  }

  getTranslationsByPrefixes(lang: string, prefixes: string[]): Observable<{ [key: string]: string }> {
    const params = new HttpParams()
      .set('lang', lang)
      .set('prefixes', prefixes.join(',')); // Konwertujemy tablicę na ciąg znaków oddzielonych przecinkami

    return this.http.get<{ [key: string]: string }>(this.translations, {params});
  }

}
