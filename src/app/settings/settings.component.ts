import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { SettingsService } from './settings.service';
import { KitchenStateService } from '../kitchen/service/kitchen-state.service';
import { DEFAULT_MATERIAL_PRESET_CODE, SettingsOptions, UpdateUserSettingsRequest } from './settings.model';
import { FormFieldComponent } from '../shared/form-field/form-field.component';
import { BoardPrice } from './board-price.service';
import { TranslationService } from '../translation/translation.service';
import { LanguageService } from '../service/language.service';
import { MaterialAdminService } from '../admin/material/service/material-admin.service';
import { BoardColorOptionResponse, MaterialOption } from '../admin/material/model/material-variant.model';
import { BoardPricesSectionComponent } from './board-prices-section/board-prices-section.component';
import {
  CompanyInfo,
  CompanyInfoSectionComponent,
  companyInfoFromSettings,
  companyInfoToRequest
} from './company-info-section/company-info-section.component';
import { MaterialPresetResponse, MaterialPresetService } from '../kitchen/service/material-preset.service';
import { DEFAULT_GRAIN_DIRECTIONS, EffectiveGrainDirections, GrainDirections, userGrainDirections } from '../shared/model/grain-direction';
import { GrainDirectionFieldsComponent } from '../shared/grain-direction-fields/grain-direction-fields.component';
import { ComponentPricesSectionComponent } from './component-prices-section/component-prices-section.component';
import { JobPricesSectionComponent } from './job-prices-section/job-prices-section.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, FormFieldComponent, BoardPricesSectionComponent, CompanyInfoSectionComponent, GrainDirectionFieldsComponent, ComponentPricesSectionComponent, JobPricesSectionComponent],
})
export class SettingsComponent implements OnInit {

  // TODO(CODEX): Cenniki i dane firmy są już wydzielone do child komponentów, ale ten ekran nadal ładuje opcje,
  // trzyma duży stan ustawień użytkownika i ręcznie składa request zapisu. Kolejne etapy powinny rozdzielić model formularza
  // od orkiestracji zapisu, żeby nowe ustawienia nie powiększały tej klasy.
  private settingsService = inject(SettingsService);
  private kitchenStateService = inject(KitchenStateService);
  private translationService = inject(TranslationService);
  private languageService = inject(LanguageService);
  private materialAdminService = inject(MaterialAdminService);
  private materialPresetService = inject(MaterialPresetService);
  private destroyRef = inject(DestroyRef);

  // Cached translations for material names (reloads on language change)
  translations: Record<string, string> = {};

  // Material options for dropdown in "Dodaj cenę"
  materialOptions: MaterialOption[] = [];
  materialPresets: MaterialPresetResponse[] = [];

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
  cuttingKerfMm = 3;
  countertopLyzwaRecessMm = 30;
  countertopCutAllowanceMm = 0;
  cuttingOptimizationPriority: UpdateUserSettingsRequest['cuttingOptimizationPriority'] = 'LEAST_WASTE';
  grainDirections: EffectiveGrainDirections = { ...DEFAULT_GRAIN_DIRECTIONS };

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
  defaultMaterialPresetCode: string | null = DEFAULT_MATERIAL_PRESET_CODE;

  // Form values — dane firmy; trwałe tutaj, bo CompanyInfoSectionComponent jest niszczona przy zwinięciu sekcji
  companyInfo: CompanyInfo = companyInfoFromSettings({});

  // Color options for box/front dropdowns — loaded from backend when material changes
  boxColorOptions: BoardColorOptionResponse[] = [];
  frontColorOptions: BoardColorOptionResponse[] = [];

  // boardPrices — utrzymywane TYLKO dla przebudowy list kolorów materiałów; zarządzane przez BoardPricesSectionComponent
  private boardPrices: BoardPrice[] = [];

  // UI states
  loading = false;
  saving = false;
  savedSuccess = false;
  error: string | null = null;

  // UI — sekcja techniczna zwinięta domyślnie
  private collapsedSectionIds = new Set<string>(['sec-technical']);

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
    this.loadMaterialOptions();
    this.loadMaterialPresets();
  }

  // ── Logo firmy — delegowane do CompanyInfoSectionComponent (R.2.4) ───────────
  // Metody loadLogo, onLogoSelected, removeLogo przeniesione do CompanyInfoSectionComponent.
  // Sekcja wczytuje logo sama po utworzeniu (ngOnInit), także po asynchronicznym GET i ponownym rozwinięciu.

  private loadTranslations(lang: string): void {
    this.translationService.getByCategories(['MATERIAL', 'BOARD_VARIANT', 'MATERIAL_PRESET'], lang).subscribe(t => {
      this.translations = t;
    });
  }

  private loadMaterialOptions(): void {
    this.materialAdminService.getMaterialOptions().subscribe({
      next: (opts) => { this.materialOptions = opts; },
      error: () => { /* non-critical — settings still work without dropdown */ }
    });
  }

  /** Called when box material select changes — rebuild color list and keep/reset current color. */
  private loadMaterialPresets(): void {
    this.materialPresetService.listActive().subscribe({
      next: presets => { this.materialPresets = presets; },
      error: () => { this.materialPresets = []; }
    });
  }

  onGrainDirectionsChange(value: GrainDirections): void {
    // Ustawienia użytkownika nie mają opcji „Jak w ustawieniach” — pola zawsze mają wartość.
    this.grainDirections = {
      front: value.front ?? this.grainDirections.front,
      side: value.side ?? this.grainDirections.side,
      panel: value.panel ?? this.grainDirections.panel
    };
  }

  applyDefaultMaterialPreset(code: string): void {
    this.defaultMaterialPresetCode = code || null;
    const preset = this.materialPresets.find(item => item.code === code);
    if (!preset) return;

    this.defaultBoxMaterial = preset.materialRequest.boxMaterial;
    this.defaultBoxBoardThickness = preset.materialRequest.boxBoardThickness;
    this.defaultBoxColor = preset.materialRequest.boxColor;
    this.defaultFrontMaterial = preset.materialRequest.frontMaterial;
    this.defaultFrontBoardThickness = preset.materialRequest.frontBoardThickness;
    this.defaultFrontColor = preset.materialRequest.frontColor;
    this.defaultBackMaterial = preset.backMaterial;
    this.defaultBackBoardThickness = preset.backBoardThickness;
    this.defaultVarnishedFront = preset.varnishedFront;
    this.rebuildColorOptions();
  }

  materialPresetLabel(preset: MaterialPresetResponse): string {
    return this.translations[preset.translationKey] || preset.code;
  }

  markDefaultMaterialPresetCustom(): void {
    this.defaultMaterialPresetCode = null;
  }

  onBoxMaterialChange(materialCode: string): void {
    this.markDefaultMaterialPresetCustom();
    this.defaultBoxMaterial = materialCode;
    this.rebuildColorOptions();
  }

  /** Called when front material select changes — rebuild colors, enforce varnished-only-for-MDF rule. */
  onFrontMaterialChange(materialCode: string): void {
    this.markDefaultMaterialPresetCustom();
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
        this.cuttingKerfMm = settings.cuttingKerfMm ?? 3;
        this.countertopLyzwaRecessMm = settings.countertopLyzwaRecessMm ?? 30;
        this.countertopCutAllowanceMm = settings.countertopCutAllowanceMm ?? 0;
        this.cuttingOptimizationPriority = settings.cuttingOptimizationPriority ?? 'LEAST_WASTE';
        this.grainDirections = userGrainDirections(settings);
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
        this.defaultMaterialPresetCode = settings.defaultMaterialPresetCode ?? null;
        // Rebuild color dropdowns using loaded material (boardPrices may already be ready)
        this.rebuildColorOptions();
        // Dane firmy — model w parencie, przekazywany do CompanyInfoSectionComponent przez [(value)]
        this.companyInfo = companyInfoFromSettings(settings);
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

    const request: UpdateUserSettingsRequest = {
      defaultPlinthHeightMm: this.plinthHeightMm,
      defaultCountertopThicknessMm: this.countertopThicknessMm,
      defaultUpperFillerHeightMm: this.upperFillerHeightMm,
      defaultDistanceFromWallMm: this.distanceFromWallMm,
      defaultPlinthSetbackMm: this.plinthSetbackMm,
      defaultFillerWidthMm: this.fillerWidthMm,
      defaultFrontGapMm: this.frontGapMm,
      defaultSupportHeightReductionMm: this.supportHeightReductionMm,
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
      cuttingKerfMm: this.cuttingKerfMm,
      countertopLyzwaRecessMm: this.countertopLyzwaRecessMm,
      countertopCutAllowanceMm: this.countertopCutAllowanceMm,
      cuttingOptimizationPriority: this.cuttingOptimizationPriority,
      frontGrainDirection: this.grainDirections.front,
      sideGrainDirection: this.grainDirections.side,
      panelGrainDirection: this.grainDirections.panel,
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
      defaultMaterialPresetCode: this.defaultMaterialPresetCode,
      // Dane firmy — z modelu w parencie, niezależnie od tego, czy sekcja jest rozwinięta
      ...companyInfoToRequest(this.companyInfo)
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
          supportHeightReductionMm: updated.defaultSupportHeightReductionMm ?? 30
        });
        this.kitchenStateService.setMaterialDefaults(updated);
        this.kitchenStateService.setCountertopJointDefaults(updated);
        this.kitchenStateService.setGrainDirectionDefaults(updated);

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

  // ── Cennik płyt (obsługa delegowana do BoardPricesSectionComponent) ──────────

  /**
   * Wywoływany gdy BoardPricesSectionComponent załaduje lub zmieni listę płyt.
   * Aktualizuje lokalne boardPrices używane przez rebuildColorOptions().
   */
  onBoardPricesChanged(prices: BoardPrice[]): void {
    this.boardPrices = prices;
    this.rebuildColorOptions();
  }

  isSectionCollapsed(id: string): boolean {
    return this.collapsedSectionIds.has(id);
  }

  toggleSection(id: string): void {
    if (this.collapsedSectionIds.has(id)) {
      this.collapsedSectionIds.delete(id);
    } else {
      this.collapsedSectionIds.add(id);
    }
  }

  private expandSection(id: string): void {
    this.collapsedSectionIds.delete(id);
  }

  scrollTo(id: string): void {
    this.expandSection(id);
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      // .settings-body jest scroll containerem — obliczamy pozycję przez getBoundingClientRect,
      // żeby nagłówek sekcji trafił precyzyjnie na top widocznego obszaru (+ 8px oddechu).
      const bodyEl = document.querySelector('.settings-body') as HTMLElement | null;
      if (bodyEl) {
        const elTop = el.getBoundingClientRect().top;
        const bodyTop = bodyEl.getBoundingClientRect().top;
        const targetScrollTop = bodyEl.scrollTop + (elTop - bodyTop) - 8;
        bodyEl.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  protected trackByIndex = (index: number) => index;
  protected trackByColorCode = (_: number, item: { colorCode: string }) => item.colorCode;
}
