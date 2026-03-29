import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SettingsService } from './settings.service';
import { KitchenStateService } from '../kitchen/service/kitchen-state.service';
import { SettingsOptions, UserSettings } from './settings.model';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { FormFieldComponent } from '../shared/form-field/form-field.component';
import { BoardPriceService, BoardPrice, CreateBoardPrice } from './board-price.service';
import { TranslationService } from '../translation/translation.service';
import { LanguageService } from '../service/language.service';
import { MaterialAdminService } from '../admin/material/service/material-admin.service';
import { MaterialOption } from '../admin/material/model/material-variant.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, FormFieldComponent, MatExpansionModule, MatIconModule],
})
export class SettingsComponent implements OnInit {

  private settingsService = inject(SettingsService);
  private kitchenStateService = inject(KitchenStateService);
  private boardPriceService = inject(BoardPriceService);
  private translationService = inject(TranslationService);
  private languageService = inject(LanguageService);
  private materialAdminService = inject(MaterialAdminService);
  private destroyRef = inject(DestroyRef);

  // Cached translations for material names (reloads on language change)
  translations: Record<string, string> = {};

  // Material options for dropdown in "Dodaj cenę"
  materialOptions: MaterialOption[] = [];

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

  // Form values — grubości płyt szuflad
  ballSlideSevrollDrawerThicknessMm = 18;  // konfigurowalna (16–22mm)
  antaroTandemboxDrawerThicknessMm = 16;   // stała (tylko do odczytu)

  // Form values — wymiary techniczne szafek
  hdfThicknessMm = 3;
  hdfGrooveDistanceMm = 20;
  hdfGrooveDepthMm = 10;
  hdfBorderDistanceMm = 5;
  frontShiftMm = 2;
  extendedFrontMm = 23;
  veneerMm = 1;
  spaceBetweenSideAndFrontMm = 2;
  spaceBetweenWreathAndFrontMm = 3;
  verticallySpaceBetweenTwoFrontsMm = 4;
  horizontallySpaceBetweenTwoFrontsMm = 3;
  shelfCutoutWidthMm = 1;
  shelfCutoutDepthMm = 2;

  // Form values — kalkulacja odpadu i kierunek słoi
  wasteChipboardEnabled = true;
  wasteHdfEnabled = false;
  wasteMdfEnabled = false;
  grainContinuityEnabled = false;

  // Form values — marże i rabaty
  markupMaterialsPct = 0;
  markupComponentsPct = 0;
  markupJobsPct = 0;
  defaultDiscountPct = 0;

  // Cennik płyt
  boardPrices: BoardPrice[] = [];
  boardPricesLoading = false;
  boardPricesError: string | null = null;
  showAddBoardForm = false;
  addBoardSaving = false;
  addBoardError: string | null = null;
  newBoard: CreateBoardPrice = this.emptyNewBoard();
  editingBoardId: number | null = null;
  editBoardPrice = 0;
  editBoardColorName: string | null = null;
  editBoardColorHex: string | null = null;
  editBoardSaving = false;
  csvImporting = false;
  csvImportResult: { added: number; updated: number; errors: { lineNumber: number; line: string; message: string }[] } | null = null;

  // UI states
  loading = false;
  saving = false;
  savedSuccess = false;
  error: string | null = null;

  // UI — sekcja techniczna zwinięta domyślnie

  // Options for select fields — loaded from backend
  plinthOptions: number[] = [80, 100, 150];
  countertopOptions: number[] = [18, 28, 38, 40, 60];
  upperFillerHeightOptions: number[] = [0, 50, 80, 100, 120, 150];
  distanceFromWallSelectOptions: number[] = [400, 450, 480, 510, 540, 560, 600, 650, 700];

  constructor() {
    toObservable(this.languageService.lang).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(lang => this.loadTranslations(lang));
  }

  ngOnInit(): void {
    this.loadOptions();
    this.loadSettings();
    this.loadBoardPrices();
    this.loadMaterialOptions();
  }

  private loadTranslations(lang: string): void {
    this.translationService.getByCategories(['MATERIAL', 'BOARD_VARIANT'], lang).subscribe(t => {
      this.translations = t;
    });
  }

  getMaterialDisplay(bp: BoardPrice): string {
    // bp.materialName holds the translationKey of the material (e.g. MATERIAL.CHIPBOARD)
    return this.translations[bp.materialName] || bp.materialCode;
  }

  private loadMaterialOptions(): void {
    this.materialAdminService.getMaterialOptions().subscribe({
      next: (opts) => { this.materialOptions = opts; },
      error: () => { /* non-critical — settings still work without dropdown */ }
    });
  }

  loadOptions(): void {
    this.settingsService.getOptions().subscribe({
      next: (options: SettingsOptions) => {
        this.plinthOptions = options.plinthHeights;
        this.countertopOptions = options.countertopThicknesses;
        this.upperFillerHeightOptions = options.upperFillerHeights;
        this.distanceFromWallSelectOptions = options.distanceFromWallOptions;
      },
      error: () => {
        // Keep hardcoded fallback values — non-critical
      }
    });
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
        // Wymiary techniczne
        this.hdfThicknessMm = settings.hdfThicknessMm ?? 3;
        this.hdfGrooveDistanceMm = settings.hdfGrooveDistanceMm ?? 20;
        this.hdfGrooveDepthMm = settings.hdfGrooveDepthMm ?? 10;
        this.hdfBorderDistanceMm = settings.hdfBorderDistanceMm ?? 5;
        this.frontShiftMm = settings.frontShiftMm ?? 2;
        this.extendedFrontMm = settings.extendedFrontMm ?? 23;
        this.veneerMm = settings.veneerMm ?? 1;
        this.spaceBetweenSideAndFrontMm = settings.spaceBetweenSideAndFrontMm ?? 2;
        this.spaceBetweenWreathAndFrontMm = settings.spaceBetweenWreathAndFrontMm ?? 3;
        this.verticallySpaceBetweenTwoFrontsMm = settings.verticallySpaceBetweenTwoFrontsMm ?? 4;
        this.horizontallySpaceBetweenTwoFrontsMm = settings.horizontallySpaceBetweenTwoFrontsMm ?? 3;
        this.shelfCutoutWidthMm = settings.shelfCutoutWidthMm ?? 1;
        this.shelfCutoutDepthMm = settings.shelfCutoutDepthMm ?? 2;
        this.ballSlideSevrollDrawerThicknessMm = settings.ballSlideSevrollDrawerThicknessMm ?? 18;
        this.antaroTandemboxDrawerThicknessMm = settings.antaroTandemboxDrawerThicknessMm ?? 16;
        // Kalkulacja odpadu i kierunek słoi
        this.wasteChipboardEnabled = settings.wasteChipboardEnabled ?? true;
        this.wasteHdfEnabled = settings.wasteHdfEnabled ?? false;
        this.wasteMdfEnabled = settings.wasteMdfEnabled ?? false;
        this.grainContinuityEnabled = settings.grainContinuityEnabled ?? false;
        // Marże i rabaty
        this.markupMaterialsPct = Number(settings.markupMaterialsPct ?? 0);
        this.markupComponentsPct = Number(settings.markupComponentsPct ?? 0);
        this.markupJobsPct = Number(settings.markupJobsPct ?? 0);
        this.defaultDiscountPct = Number(settings.defaultDiscountPct ?? 0);
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
      defaultSupportWidthReductionMm: this.supportWidthReductionMm,
      hdfThicknessMm: this.hdfThicknessMm,
      hdfGrooveDistanceMm: this.hdfGrooveDistanceMm,
      hdfGrooveDepthMm: this.hdfGrooveDepthMm,
      hdfBorderDistanceMm: this.hdfBorderDistanceMm,
      frontShiftMm: this.frontShiftMm,
      extendedFrontMm: this.extendedFrontMm,
      veneerMm: this.veneerMm,
      spaceBetweenSideAndFrontMm: this.spaceBetweenSideAndFrontMm,
      spaceBetweenWreathAndFrontMm: this.spaceBetweenWreathAndFrontMm,
      verticallySpaceBetweenTwoFrontsMm: this.verticallySpaceBetweenTwoFrontsMm,
      horizontallySpaceBetweenTwoFrontsMm: this.horizontallySpaceBetweenTwoFrontsMm,
      shelfCutoutWidthMm: this.shelfCutoutWidthMm,
      shelfCutoutDepthMm: this.shelfCutoutDepthMm,
      ballSlideSevrollDrawerThicknessMm: this.ballSlideSevrollDrawerThicknessMm,
      wasteChipboardEnabled: this.wasteChipboardEnabled,
      wasteHdfEnabled: this.wasteHdfEnabled,
      wasteMdfEnabled: this.wasteMdfEnabled,
      grainContinuityEnabled: this.grainContinuityEnabled,
      markupMaterialsPct: this.markupMaterialsPct,
      markupComponentsPct: this.markupComponentsPct,
      markupJobsPct: this.markupJobsPct,
      defaultDiscountPct: this.defaultDiscountPct
    };

    this.settingsService.updateSettings(request as any).subscribe({
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

  // ── Cennik płyt ──────────────────────────────────────────────────────────────

  loadBoardPrices(): void {
    this.boardPricesLoading = true;
    this.boardPricesError = null;
    this.boardPriceService.list().subscribe({
      next: (prices) => {
        this.boardPrices = prices;
        this.boardPricesLoading = false;
      },
      error: () => {
        this.boardPricesError = 'Nie udało się załadować cennika płyt.';
        this.boardPricesLoading = false;
      }
    });
  }

  toggleAddBoardForm(): void {
    this.showAddBoardForm = !this.showAddBoardForm;
    this.newBoard = this.emptyNewBoard();
    this.addBoardError = null;
  }

  submitAddBoard(): void {
    this.addBoardSaving = true;
    this.addBoardError = null;
    this.boardPriceService.create(this.newBoard).subscribe({
      next: (created) => {
        this.boardPrices = [...this.boardPrices, created];
        this.showAddBoardForm = false;
        this.newBoard = this.emptyNewBoard();
        this.addBoardSaving = false;
      },
      error: (err) => {
        this.addBoardError = err?.error?.message || 'Błąd podczas dodawania ceny.';
        this.addBoardSaving = false;
      }
    });
  }

  startEditBoard(bp: BoardPrice): void {
    this.editingBoardId = bp.id;
    this.editBoardPrice = bp.pricePerM2 ?? 0;
    this.editBoardColorName = bp.colorName;
    this.editBoardColorHex = bp.colorHex;
  }

  cancelEditBoard(): void {
    this.editingBoardId = null;
  }

  submitEditBoard(bp: BoardPrice): void {
    this.editBoardSaving = true;
    this.boardPriceService.update(bp.id, {
      pricePerM2: this.editBoardPrice,
      colorName: this.editBoardColorName ?? undefined,
      colorHex: this.editBoardColorHex ?? undefined
    }).subscribe({
      next: (updated) => {
        this.boardPrices = this.boardPrices.map(p => p.id === updated.id ? updated : p);
        this.editingBoardId = null;
        this.editBoardSaving = false;
      },
      error: () => {
        this.editBoardSaving = false;
      }
    });
  }

  downloadCsvTemplate(): void {
    this.boardPriceService.downloadTemplate().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'board_prices_template.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  onCsvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.csvImportResult = { added: 0, updated: 0, errors: [{ lineNumber: 0, line: '', message: 'Plik jest zbyt duży. Maksymalny rozmiar: 10 MB' }] };
      input.value = '';
      return;
    }
    this.csvImporting = true;
    this.csvImportResult = null;
    this.boardPriceService.importCsv(file).subscribe({
      next: (result) => {
        this.csvImportResult = result;
        this.csvImporting = false;
        this.loadBoardPrices();
        input.value = '';
      },
      error: () => {
        this.csvImporting = false;
        input.value = '';
      }
    });
  }

  private emptyNewBoard(): CreateBoardPrice {
    return { materialCode: '', thicknessMm: 18, colorCode: '', colorName: '', colorHex: '', varnished: false, pricePerM2: 0 };
  }
}
