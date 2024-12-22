import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private apiUrl = 'http://localhost:8080/api/furniture/translation';

  constructor(private http: HttpClient) {}

  getTranslations(language: string, prefix: string): Observable<{ [key: string]: string }> {
    return this.http.get<{ [key: string]: string }>(`${this.apiUrl}?lang=${language}&prefix=${prefix}`);
  }
}