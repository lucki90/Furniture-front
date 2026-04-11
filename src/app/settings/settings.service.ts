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
   * Returns global settings for the current user.
   */
  getSettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(this.apiUrl);
  }

  /**
   * Updates global settings for the current user.
   */
  updateSettings(settings: UserSettings): Observable<UserSettings> {
    return this.http.put<UserSettings>(this.apiUrl, settings);
  }

  /**
   * Returns available option values for settings dropdowns (plinth heights, countertop thicknesses etc.).
   * Frontend uses this instead of hardcoded arrays.
   */
  getOptions(): Observable<SettingsOptions> {
    return this.http.get<SettingsOptions>(`${this.apiUrl}/options`);
  }

  // ── Logo firmy ─────────────────────────────────────────────────────────────

  /**
   * Uploads a company logo (PNG or JPEG, max 500 KB).
   * Backend stores it as BYTEA and renders it in the PDF offer header.
   */
  uploadLogo(file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<void>(`${this.apiUrl}/logo`, formData);
  }

  /**
   * Removes the company logo from user settings.
   */
  deleteLogo(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/logo`);
  }

  /**
   * Returns the URL for fetching the current company logo image.
   * Use in <img [src]="..."> — GET /settings/logo returns bytes with correct Content-Type.
   */
  getLogoUrl(): string {
    return `${this.apiUrl}/logo`;
  }
}
