import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SettingsOptions, UserSettings } from './settings.model';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private readonly apiUrl = 'http://localhost:8080/api/furniture/settings';

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
}
