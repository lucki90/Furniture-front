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
import { ComponentPriceService, ComponentPrice } from './component-price.service';
import { JobPriceService, JobPrice } from './job-price.service';
import { PriceEditTableComponent, PriceSaveEvent } from './price-edit-table/price-edit-table.component';
import { TranslationService } from '../translation/translation.service';
import { LanguageService } from '../service/language.service';
import { MaterialAdminService } from '../admin/material/service/material-admin.service';
import { BoardColorOptionResponse, MaterialOption } from '../admin/material/model/material-variant.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, FormFieldComponent, MatExpansionModule, MatIconModule, PriceEditTableComponent],
})
export class SettingsComponent implements OnInit {

  private settingsService = inject(SettingsService);
  private kitchenStateService = inject(KitchenStateService);
  private boardPriceService = inject(BoardPriceService);
  private componentPriceService = inject(ComponentPriceService);
  private jobPriceService = inject(JobPriceService);
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

  // Form values — domyślne materiały i kolory płyt
  defaultBoxMaterial = 'CHIPBOARD';
  defaultBoxBoardThickness = 18;
  defaultBoxColor = 'WHITE';
  defaultFrontMaterial = 'CHIPBOARD';
  defaultFrontBoardThickness = 18;
  defaultFrontColor = 'WHITE';
  defaultBackMaterial = 'HDF';
  defaultBackBoardThickness = 3;
  defaultSheetSizeMode: 'FULL' | 'HALF' | 'QUARTER' = 'FULL';
  defaultVarnishedFront = false;

  // Color options for box/front dropdowns — loaded from backend when material changes
  boxColorOptions: BoardColorOptionResponse[] = [];
  frontColorOptions: BoardColorOptionResponse[] = [];

  // Form values — dane firmy
  companyName = '';
  companyAddress = '';
  companyPhone = '';
  companyEmail = '';
  offerValidityDays = 14;

  // Logo firmy
  /** URL do podglądu logo (null = brak logo). Używane w <img [src]>. */
  companyLogoUrl: string | null = null;
  logoUploading = false;
  logoError: string | null = null;

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

  // Cennik komponentów
  componentPrices: ComponentPrice[] = [];
  componentPricesLoading = false;
  componentPricesError: string | null = null;
  componentCategoryFilter = '';

  // Cennik prac
  jobPrices: JobPrice[] = [];
  jobPricesLoading = false;
  jobPricesError: string | null = null;
  jobCategoryFilter = '';

  /** Row-class function passed to PriceEditTableComponent. */
  readonly componentRowClass = (cp: ComponentPrice): string =>
    (!cp.componentActive || !cp.variantActive) ? 'inactive' : '';

  /** Row-class function for job price table. */
  readonly jobRowClass = (jp: JobPrice): string =>
    (!jp.jobActive || !jp.variantActive) ? 'inactive' : '';

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
    this.loadLogo();
    this.loadBoardPrices();
    this.loadMaterialOptions();
    this.loadComponentPrices();
    this.loadJobPrices();
  }

  // ── Logo firmy ─────────────────────────────────────────────────────────────

  /**
   * Pobiera logo z backendu z nagłówkiem Authorization i tworzy blob: URL do wyświetlenia.
   * Zwykły <img src="url"> nie wysyła tokenu JWT, stąd konieczność użycia fetch + blob.
   */
  loadLogo(): void {
    const token = localStorage.getItem('accessToken') ?? '';
    fetch(this.settingsService.getLogoUrl(), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.status === 200 ? res.blob() : null)
      .then(blob => this.applyLogoBlob(blob))
      .catch(() => this.applyLogoBlob(null));
  }

  /**
   * Zastępuje bieżący blob: URL nowym (zwalnia stary, by uniknąć wycieku pamięci).
   * Akceptuje Blob, File (extends Blob) lub null (brak logo).
   */
  private applyLogoBlob(blob: Blob | null): void {
    if (this.companyLogoUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.companyLogoUrl);
    }
    this.companyLogoUrl = blob ? URL.createObjectURL(blob) : null;
  }

  /**
   * Handles <input type="file"> change. Validates and uploads the selected image.
   */
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
        // File extends Blob — tworzymy blob: URL bezpośrednio z pliku (bez ponownego fetch)
        this.applyLogoBlob(file);
        this.logoUploading = false;
      },
      error: (err) => {
        console.error('Logo upload failed', err);
        this.logoError = 'Nie udało się przesłać logo. Sprawdź format i rozmiar pliku.';
        this.logoUploading = false;
      }
    });

    // Reset input — pozwala ponownie wybrać ten sam plik po usunięciu
    input.value = '';
  }

  /**
   * Removes the company logo.
   */
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

  /** Called when box material select changes — rebuild color list and keep/reset current color. */
  onBoxMaterialChange(materialCode: string): void {
    this.defaultBoxMaterial = materialCode;
    this.rebuildColorOptions();
  }

  /** Called when front material select changes — rebuild colors, enforce varnished-only-for-MDF rule. */
  onFrontMaterialChange(materialCode: string): void {
    this.defaultFrontMaterial = materialCode;
    if (materialCode !== 'MDF') {
      // Only MDF fronts can be varnished — auto-clear when switching away
      this.defaultVarnishedFront = false;
    }
    this.rebuildColorOptions();
  }

  /**
   * Rebuilds box/front color option arrays from the already-loaded boardPrices.
   * Source of truth = "Cennik płyt" — same data, no extra API call.
   * Called after boardPrices load and after any material change.
   */
  rebuildColorOptions(): void {
    this.boxColorOptions = this.colorOptionsForMaterial(this.defaultBoxMaterial);
    this.frontColorOptions = this.colorOptionsForMaterial(this.defaultFrontMaterial);

    // Reset selected color if it no longer exists in the new list
    if (this.boxColorOptions.length > 0 &&
        !this.boxColorOptions.some(o => o.colorCode === this.defaultBoxColor)) {
      this.defaultBoxColor = this.boxColorOptions[0].colorCode;
    }
    if (this.frontColorOptions.length > 0 &&
        !this.frontColorOptions.some(o => o.colorCode === this.defaultFrontColor)) {
      this.defaultFrontColor = this.frontColorOptions[0].colorCode;
    }
  }

  /** Extracts distinct colors for a given materialCode from the board price list, sorted by name. */
  private colorOptionsForMaterial(materialCode: string): BoardColorOptionResponse[] {
    const seen = new Set<string>();
    const result: BoardColorOptionResponse[] = [];
    for (const bp of this.boardPrices) {
      if (bp.materialCode === materialCode && !seen.has(bp.colorCode)) {
        seen.add(bp.colorCode);
        result.push({
          colorCode: bp.colorCode,
          colorName: bp.colorName,
          colorHex: bp.colorHex,
          varnished: bp.varnished
        });
      }
    }
    return result.sort((a, b) =>
      (a.colorName ?? a.colorCode).localeCompare(b.colorName ?? b.colorCode));
  }

  /** Returns true when varnished front is allowed (only MDF fronts can be varnished). */
  get canVarnishFront(): boolean {
    return this.defaultFrontMaterial === 'MDF';
  }

  /** Returns hex color for a given colorCode from the provided options list. */
  getColorHex(options: BoardColorOptionResponse[], colorCode: string): string | null {
    return options.find(o => o.colorCode === colorCode)?.colorHex ?? null;
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
        // Domyślne materiały
        this.defaultBoxMaterial = settings.defaultBoxMaterial ?? 'CHIPBOARD';
        this.defaultBoxBoardThickness = settings.defaultBoxBoardThickness ?? 18;
        this.defaultBoxColor = settings.defaultBoxColor ?? 'WHITE';
        this.defaultFrontMaterial = settings.defaultFrontMaterial ?? 'CHIPBOARD';
        this.defaultFrontBoardThickness = settings.defaultFrontBoardThickness ?? 18;
        this.defaultFrontColor = settings.defaultFrontColor ?? 'WHITE';
        this.defaultBackMaterial = settings.defaultBackMaterial ?? 'HDF';
        this.defaultBackBoardThickness = settings.defaultBackBoardThickness ?? 3;
        this.defaultSheetSizeMode = (settings.defaultSheetSizeMode as 'FULL' | 'HALF' | 'QUARTER') ?? 'FULL';
        this.defaultVarnishedFront = settings.defaultVarnishedFront ?? false;
        // Rebuild color dropdowns using loaded material (boardPrices may already be ready)
        this.rebuildColorOptions();
        // Dane firmy
        this.companyName = settings.companyName ?? '';
        this.companyAddress = settings.companyAddress ?? '';
        this.companyPhone = settings.companyPhone ?? '';
        this.companyEmail = settings.companyEmail ?? '';
        this.offerValidityDays = settings.offerValidityDays ?? 14;
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
      defaultDiscountPct: this.defaultDiscountPct,
      defaultBoxMaterial: this.defaultBoxMaterial,
      defaultBoxBoardThickness: this.defaultBoxBoardThickness,
      defaultBoxColor: this.defaultBoxColor,
      defaultFrontMaterial: this.defaultFrontMaterial,
      defaultFrontBoardThickness: this.defaultFrontBoardThickness,
      defaultFrontColor: this.defaultFrontColor,
      defaultBackMaterial: this.defaultBackMaterial,
      defaultBackBoardThickness: this.defaultBackBoardThickness,
      defaultSheetSizeMode: this.defaultSheetSizeMode,
      defaultVarnishedFront: this.defaultVarnishedFront,
      companyName: this.companyName || undefined,
      companyAddress: this.companyAddress || undefined,
      companyPhone: this.companyPhone || undefined,
      companyEmail: this.companyEmail || undefined,
      offerValidityDays: this.offerValidityDays
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
        this.kitchenStateService.setMaterialDefaults(updated);

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
        // Rebuild color dropdowns now that board prices are available
        this.rebuildColorOptions();
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

  // ── Cennik komponentów ─────────────────────────────────────────────────────

  loadComponentPrices(): void {
    this.componentPricesLoading = true;
    this.componentPricesError = null;
    this.componentPriceService.list().subscribe({
      next: (prices) => {
        this.componentPrices = prices;
        this.componentPricesLoading = false;
      },
      error: () => {
        this.componentPricesError = 'Nie udało się załadować cennika komponentów.';
        this.componentPricesLoading = false;
      }
    });
  }

  get componentCategories(): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const cp of this.componentPrices) {
      if (!seen.has(cp.category)) {
        seen.add(cp.category);
        result.push(cp.category);
      }
    }
    return result.sort();
  }

  get filteredComponentPrices(): ComponentPrice[] {
    if (!this.componentCategoryFilter) return this.componentPrices;
    return this.componentPrices.filter(cp => cp.category === this.componentCategoryFilter);
  }

  onComponentPriceSave(event: PriceSaveEvent): void {
    this.componentPriceService.update(event.id, { pricePerUnit: event.price }).subscribe({
      next: (updated) => {
        this.componentPrices = this.componentPrices.map(p => p.id === updated.id ? updated : p);
        event.complete(true);
      },
      error: () => event.complete(false),
    });
  }

  // ── Cennik prac ────────────────────────────────────────────────────────────

  loadJobPrices(): void {
    this.jobPricesLoading = true;
    this.jobPricesError = null;
    this.jobPriceService.list().subscribe({
      next: (prices) => {
        this.jobPrices = prices;
        this.jobPricesLoading = false;
      },
      error: () => {
        this.jobPricesError = 'Nie udało się załadować cennika prac.';
        this.jobPricesLoading = false;
      }
    });
  }

  get jobCategories(): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const jp of this.jobPrices) {
      if (!seen.has(jp.jobCategory)) {
        seen.add(jp.jobCategory);
        result.push(jp.jobCategory);
      }
    }
    return result.sort();
  }

  get filteredJobPrices(): JobPrice[] {
    if (!this.jobCategoryFilter) return this.jobPrices;
    return this.jobPrices.filter(jp => jp.jobCategory === this.jobCategoryFilter);
  }

  onJobPriceSave(event: PriceSaveEvent): void {
    this.jobPriceService.update(event.id, { pricePerUnit: event.price }).subscribe({
      next: (updated) => {
        this.jobPrices = this.jobPrices.map(p => p.id === updated.id ? updated : p);
        event.complete(true);
      },
      error: () => event.complete(false),
    });
  }
}
