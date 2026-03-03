import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from './settings.service';
import { KitchenStateService } from '../kitchen/service/kitchen-state.service';
import { UserSettings } from './settings.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SettingsComponent implements OnInit {

  private settingsService = inject(SettingsService);
  private kitchenStateService = inject(KitchenStateService);

  // Form values — kuchnia
  plinthHeightMm = 100;
  countertopThicknessMm = 38;
  upperFillerHeightMm = 100;

  // Form values — obudowa szafek
  distanceFromWallMm = 560;
  plinthSetbackMm = 60;
  fillerWidthMm = 50;
  frontGapMm = 2;
  supportHeightReductionMm = 30;
  supportWidthReductionMm = 50;

  // UI states
  loading = false;
  saving = false;
  savedSuccess = false;
  error: string | null = null;

  // Options for select fields
  readonly plinthOptions = [80, 100, 150];
  readonly countertopOptions = [18, 28, 38, 40, 60];

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.error = null;

    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        this.plinthHeightMm = settings.defaultPlinthHeightMm;
        this.countertopThicknessMm = settings.defaultCountertopThicknessMm;
        this.upperFillerHeightMm = settings.defaultUpperFillerHeightMm;
        this.distanceFromWallMm = settings.defaultDistanceFromWallMm ?? 560;
        this.plinthSetbackMm = settings.defaultPlinthSetbackMm ?? 60;
        this.fillerWidthMm = settings.defaultFillerWidthMm ?? 50;
        this.frontGapMm = settings.defaultFrontGapMm ?? 2;
        this.supportHeightReductionMm = settings.defaultSupportHeightReductionMm ?? 30;
        this.supportWidthReductionMm = settings.defaultSupportWidthReductionMm ?? 50;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load settings', err);
        this.error = 'Nie udało się załadować ustawień. Sprawdź połączenie z serwerem.';
        this.loading = false;
      }
    });
  }

  saveSettings(): void {
    this.saving = true;
    this.savedSuccess = false;
    this.error = null;

    const request: UserSettings = {
      defaultPlinthHeightMm: this.plinthHeightMm,
      defaultCountertopThicknessMm: this.countertopThicknessMm,
      defaultUpperFillerHeightMm: this.upperFillerHeightMm,
      defaultDistanceFromWallMm: this.distanceFromWallMm,
      defaultPlinthSetbackMm: this.plinthSetbackMm,
      defaultFillerWidthMm: this.fillerWidthMm,
      defaultFrontGapMm: this.frontGapMm,
      defaultSupportHeightReductionMm: this.supportHeightReductionMm,
      defaultSupportWidthReductionMm: this.supportWidthReductionMm
    };

    this.settingsService.updateSettings(request).subscribe({
      next: (updated) => {
        // Zaktualizuj globalne defaults — nowe projekty od razu dostaną nowe wartości
        this.kitchenStateService.setGlobalDefaults({
          plinthHeightMm: updated.defaultPlinthHeightMm,
          countertopThicknessMm: updated.defaultCountertopThicknessMm,
          upperFillerHeightMm: updated.defaultUpperFillerHeightMm,
          distanceFromWallMm: updated.defaultDistanceFromWallMm ?? 560,
          plinthSetbackMm: updated.defaultPlinthSetbackMm ?? 60,
          fillerWidthMm: updated.defaultFillerWidthMm ?? 50,
          frontGapMm: updated.defaultFrontGapMm ?? 2,
          supportHeightReductionMm: updated.defaultSupportHeightReductionMm ?? 30,
          supportWidthReductionMm: updated.defaultSupportWidthReductionMm ?? 50
        });

        this.saving = false;
        this.savedSuccess = true;

        // Hide success indicator after 3 seconds
        setTimeout(() => { this.savedSuccess = false; }, 3000);
      },
      error: (err) => {
        console.error('Failed to save settings', err);
        this.error = 'Nie udało się zapisać ustawień. Sprawdź połączenie z serwerem.';
        this.saving = false;
      }
    });
  }
}
