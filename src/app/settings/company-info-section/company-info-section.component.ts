import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { FormFieldComponent } from '../../shared/form-field/form-field.component';
import { SettingsService } from '../settings.service';

/**
 * Dane firmy — logo, nazwa, adres, telefon, e-mail, ważność oferty.
 * Wydzielone z SettingsComponent (R.2.4). Zero zmian zachowania.
 *
 * Wzorzec integracji z parentem:
 * - `applySettings(settings)` — wywoływane z parenta po załadowaniu ustawień z backendu
 * - `getCompanyData()` — wywoływane z parenta (@ViewChild) podczas zapisywania
 * - Logo: obsługiwane wewnętrznie przez SettingsService
 */
@Component({
  selector: 'app-company-info-section',
  templateUrl: './company-info-section.component.html',
  styleUrls: ['./company-info-section.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, FormFieldComponent, MatExpansionModule, MatIconModule],
})
export class CompanyInfoSectionComponent {

  private settingsService = inject(SettingsService);

  // ── Company form fields ──────────────────────────────────────────────────────

  companyName = '';
  companyAddress = '';
  companyPhone = '';
  companyEmail = '';
  offerValidityDays = 14;

  // ── Logo ─────────────────────────────────────────────────────────────────────

  companyLogoUrl: string | null = null;
  logoUploading = false;
  logoError: string | null = null;

  // ── Public API (called by parent via @ViewChild) ──────────────────────────────

  /**
   * Stosuje ustawienia firmy załadowane z backendu.
   * Wywoływane przez SettingsComponent.loadSettings() po otrzymaniu odpowiedzi.
   */
  applySettings(settings: {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    offerValidityDays?: number;
  }): void {
    this.companyName = settings.companyName ?? '';
    this.companyAddress = settings.companyAddress ?? '';
    this.companyPhone = settings.companyPhone ?? '';
    this.companyEmail = settings.companyEmail ?? '';
    this.offerValidityDays = settings.offerValidityDays ?? 14;
  }

  /**
   * Zwraca dane firmy do wbudowania w request zapisu ustawień.
   * Wywoływane przez SettingsComponent.saveSettings() przez @ViewChild.
   */
  getCompanyData(): {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    offerValidityDays: number;
  } {
    return {
      companyName: this.companyName || undefined,
      companyAddress: this.companyAddress || undefined,
      companyPhone: this.companyPhone || undefined,
      companyEmail: this.companyEmail || undefined,
      offerValidityDays: this.offerValidityDays
    };
  }

  /**
   * Ładuje logo z backendu (wymaga tokenu Bearer — nie może być plain <img src>).
   * Wywoływane przez SettingsComponent.ngOnInit() przez @ViewChild — lub opcjonalnie w ngOnInit tutaj.
   * Zostawiamy wywołanie przez parenta dla zachowania kolejności inicjalizacji.
   */
  // TODO(CODEX): Ten flow obchodzi standardową warstwę HTTP aplikacji: ręcznie czyta token z localStorage i używa `fetch`, zamiast korzystać z HttpClient + authInterceptor. To rozjeżdża odpowiedzialności, utrudnia testy i może powodować niespójne zachowanie auth/błędów względem reszty frontu.
  loadLogo(): void {
    const token = localStorage.getItem('accessToken') ?? '';
    fetch(this.settingsService.getLogoUrl(), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.status === 200 ? res.blob() : null)
      .then(blob => this.applyLogoBlob(blob))
      .catch(() => this.applyLogoBlob(null));
  }

  // ── Logo handlers ─────────────────────────────────────────────────────────────

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      this.logoError = 'Dozwolone formaty: PNG, JPEG.';
      return;
    }
    if (file.size > 512_000) {
      this.logoError = 'Plik jest za duży. Maksymalny rozmiar: 500 KB.';
      return;
    }

    this.logoError = null;
    this.logoUploading = true;

    this.settingsService.uploadLogo(file).subscribe({
      next: () => {
        this.applyLogoBlob(file);
        this.logoUploading = false;
      },
      error: (err) => {
        console.error('Logo upload failed', err);
        this.logoError = 'Nie udało się przesłać logo. Sprawdź format i rozmiar pliku.';
        this.logoUploading = false;
      }
    });

    input.value = '';
  }

  removeLogo(): void {
    this.settingsService.deleteLogo().subscribe({
      next: () => {
        this.applyLogoBlob(null);
        this.logoError = null;
      },
      error: (err) => {
        console.error('Logo delete failed', err);
        this.logoError = 'Nie udało się usunąć logo.';
      }
    });
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private applyLogoBlob(blob: Blob | null): void {
    if (this.companyLogoUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.companyLogoUrl);
    }
    this.companyLogoUrl = blob ? URL.createObjectURL(blob) : null;
  }
}
