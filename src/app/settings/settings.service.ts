import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SettingsOptions, UserSettings } from './settings.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private readonly apiUrl = `${environment.apiUrl}/settings`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Zwraca globalne ustawienia aktualnego użytkownika.
   */
  getSettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(this.apiUrl);
  }

  /**
   * Aktualizuje globalne ustawienia aktualnego użytkownika.
   */
  updateSettings(settings: UserSettings): Observable<UserSettings> {
    return this.http.put<UserSettings>(this.apiUrl, settings);
  }

  /**
   * Zwraca dostępne wartości dla dropdownów ustawień (cokoły, grubości blatów itd.).
   * Frontend używa tego zamiast tablic hardcoded.
   */
  getOptions(): Observable<SettingsOptions> {
    return this.http.get<SettingsOptions>(`${this.apiUrl}/options`);
  }

  // ── Logo firmy ─────────────────────────────────────────────────────────────

  /**
   * Przesyła logo firmy (PNG lub JPEG, max 500 KB).
   * Backend zapisuje je jako BYTEA i renderuje w nagłówku oferty PDF.
   */
  uploadLogo(file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<void>(`${this.apiUrl}/logo`, formData);
  }

  /**
   * Usuwa logo firmy z ustawień użytkownika.
   */
  deleteLogo(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/logo`);
  }

  /**
   * Pobiera aktualne logo firmy przez HttpClient, żeby auth i obsługa błędów zostały scentralizowane.
   */
  getLogo(): Observable<Blob> {
    return this.http.get(this.getLogoUrl(), { responseType: 'blob' });
  }

  /**
   * Zwraca URL do aktualnego logo firmy.
   * GET /settings/logo zwraca bajty z poprawnym Content-Type.
   */
  getLogoUrl(): string {
    return `${this.apiUrl}/logo`;
  }
}
