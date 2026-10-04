import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormFieldComponent } from '../../shared/form-field/form-field.component';
import { SettingsService } from '../settings.service';

/** Model formularza danych firmy — trwały w SettingsComponent, niezależny od istnienia tej sekcji. */
export interface CompanyInfo {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  offerValidityDays: number;
}

/** Mapuje ustawienia z backendu na model formularza (puste pola → '', brak ważności → 14 dni). */
export function companyInfoFromSettings(settings: {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  offerValidityDays?: number;
}): CompanyInfo {
  return {
    companyName: settings.companyName ?? '',
    companyAddress: settings.companyAddress ?? '',
    companyPhone: settings.companyPhone ?? '',
    companyEmail: settings.companyEmail ?? '',
    offerValidityDays: settings.offerValidityDays ?? 14
  };
}

/** Zwraca dane firmy do wbudowania w request zapisu ustawień (puste teksty → undefined). */
export function companyInfoToRequest(info: CompanyInfo): {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  offerValidityDays: number;
} {
  return {
    companyName: info.companyName || undefined,
    companyAddress: info.companyAddress || undefined,
    companyPhone: info.companyPhone || undefined,
    companyEmail: info.companyEmail || undefined,
    offerValidityDays: info.offerValidityDays
  };
}

/**
 * Dane firmy — logo, nazwa, adres, telefon, e-mail, ważność oferty.
 * Wydzielone z SettingsComponent (R.2.4).
 *
 * Wzorzec integracji z parentem:
 * - `[(value)]` — model danych firmy trzymany przez parenta; sekcja może być niszczona przy zwinięciu
 *   i tworzona ponownie, a wartości (także niezapisane edycje) zostają w parencie
 * - Logo: wczytywane przy każdym utworzeniu sekcji przez SettingsService, URL blob zwalniany przy zniszczeniu;
 *   odpowiedź odczytu rozpoczętego przed potwierdzonym uploadem/usunięciem jest pomijana
 * - Upload i usunięcie logo nie nakładają się w tej instancji sekcji — kolejna operacja czeka na wynik bieżącej
 */
@Component({
  selector: 'app-company-info-section',
  templateUrl: './company-info-section.component.html',
  styleUrls: ['./company-info-section.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, FormFieldComponent],
})
export class CompanyInfoSectionComponent implements OnInit, OnDestroy {

  private settingsService = inject(SettingsService);
  private destroyed = false;
  /** Licznik potwierdzonych zmian logo — odczyt rozpoczęty przed zmianą nie może jej nadpisać. */
  private confirmedLogoChanges = 0;

  // ── Company form fields ──────────────────────────────────────────────────────

  @Input() value: CompanyInfo = companyInfoFromSettings({});
  @Output() valueChange = new EventEmitter<CompanyInfo>();

  // ── Logo ─────────────────────────────────────────────────────────────────────

  companyLogoUrl: string | null = null;
  logoUploading = false;
  logoDeleting = false;
  logoError: string | null = null;

  /** Upload lub usunięcie logo czeka na odpowiedź — do tego czasu nie startujemy kolejnego zapisu logo. */
  get logoBusy(): boolean {
    return this.logoUploading || this.logoDeleting;
  }

  ngOnInit(): void {
    // Logo wymaga tokenu Bearer — ładujemy po faktycznym utworzeniu sekcji, także po jej ponownym rozwinięciu
    this.loadLogo();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.applyLogoBlob(null);
  }

  updateField<K extends keyof CompanyInfo>(field: K, fieldValue: CompanyInfo[K]): void {
    this.value = { ...this.value, [field]: fieldValue };
    this.valueChange.emit(this.value);
  }

  /**
   * Ładuje logo z backendu przez HttpClient, żeby użyć wspólnego authInterceptora.
   * Wywoływane w ngOnInit tej sekcji.
   */
  loadLogo(): void {
    const changesAtStart = this.confirmedLogoChanges;
    this.settingsService.getLogo().subscribe({
      next: (blob) => this.applyLogoRead(changesAtStart, blob),
      error: () => this.applyLogoRead(changesAtStart, null)
    });
  }

  // ── Logo handlers ─────────────────────────────────────────────────────────────

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Zdarzenie change dociera do handlera także przy zablokowanym inpucie, więc blokada musi być i tutaj
    if (this.logoBusy) {
      input.value = '';
      return;
    }
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
        this.confirmedLogoChanges++;
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
    if (this.logoBusy) return;
    this.logoDeleting = true;

    this.settingsService.deleteLogo().subscribe({
      next: () => {
        this.confirmedLogoChanges++;
        this.applyLogoBlob(null);
        this.logoError = null;
        this.logoDeleting = false;
      },
      error: (err) => {
        console.error('Logo delete failed', err);
        this.logoError = 'Nie udało się usunąć logo.';
        this.logoDeleting = false;
      }
    });
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private applyLogoRead(changesAtStart: number, blob: Blob | null): void {
    // Wynik (także błąd) starszy niż potwierdzony upload/usunięcie przywróciłby nieaktualny stan logo
    if (changesAtStart === this.confirmedLogoChanges) {
      this.applyLogoBlob(blob);
    }
  }

  private applyLogoBlob(blob: Blob | null): void {
    if (this.companyLogoUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.companyLogoUrl);
    }
    // Odpowiedź, która przyszła po zniszczeniu sekcji, nie tworzy URL blob, którego nikt już nie zwolni
    this.companyLogoUrl = blob && !this.destroyed ? URL.createObjectURL(blob) : null;
  }
}
