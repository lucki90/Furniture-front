import { Injectable, computed, signal } from '@angular/core';
import { MaterialDefaults, DEFAULT_MATERIAL_DEFAULTS } from '../cabinet-form/type-config/request-mapper/kitchen-cabinet-request-mapper';

/**
 * Serwis odpowiedzialny za ustawienia projektu kuchni:
 * - wymiary globalne (cokół, blat, blenda górna, obudowa)
 * - domyślne materiały płyt
 * - globalne defaults z user_settings DB
 * - przełączniki widoczności SVG (showCountertop, showUpperCabinets)
 *
 * Wydzielony z KitchenStateService (R.2.1) — zero zmian zachowania.
 * KitchenStateService deleguje przez fasadę.
 */
@Injectable({
  providedIn: 'root'
})
export class ProjectSettingsService {

  // ============ PRIVATE SIGNALS ============

  private _plinthHeightMm = signal<number>(100);
  private _countertopThicknessMm = signal<number>(38);
  private _upperFillerHeightMm = signal<number>(100);

  // Ustawienia obudowy szafek
  private _distanceFromWallMm = signal<number>(560);
  private _plinthSetbackMm = signal<number>(60);
  private _fillerWidthMm = signal<number>(50);
  private _frontGapMm = signal<number>(2);
  private _supportHeightReductionMm = signal<number>(30);
  private _supportWidthReductionMm = signal<number>(50);

  // ============ MATERIAL DEFAULTS ============

  // TODO: per-projekt overrides materiałów (kolor korpusu/frontu/tyłu, grubości, okleina, lakierowanie)
  //   Pomysł implementacji: każdy projekt (KitchenWall?) może mieć opcjonalne MaterialOverrides,
  //   które nadpisują globalny materialDefaults signal tylko dla tego projektu/ściany.
  //   Nowe pole: ProjectMaterialOverrides { boxColorOverride?, frontColorOverride?, varnishedFrontOverride?,
  //              frontVeneerColorOverride?, boxVeneerColorOverride? } — null = użyj globalnego defaultu.
  //   UI: panel "Nadpisz materiały" per projekt, toggle dla każdego pola.
  readonly materialDefaults = signal<MaterialDefaults>({ ...DEFAULT_MATERIAL_DEFAULTS });

  // ============ GLOBAL DEFAULTS CACHE ============
  // Ustawiane JEDNOKROTNIE przy starcie przez setGlobalDefaults() z app.component.ts
  // Używane przez resetToGlobalDefaults() i getGlobalDefaultCountertopThicknessMm()

  private _globalDefaultPlinthHeightMm = 100;
  private _globalDefaultCountertopThicknessMm = 38;
  private _globalDefaultUpperFillerHeightMm = 100;
  private _globalDefaultDistanceFromWallMm = 560;
  private _globalDefaultPlinthSetbackMm = 60;
  private _globalDefaultFillerWidthMm = 50;
  private _globalDefaultFrontGapMm = 2;
  private _globalDefaultSupportHeightReductionMm = 30;
  private _globalDefaultSupportWidthReductionMm = 50;

  // ============ PUBLIC READONLY SIGNALS ============

  readonly plinthHeightMm = this._plinthHeightMm.asReadonly();
  readonly countertopThicknessMm = this._countertopThicknessMm.asReadonly();
  readonly upperFillerHeightMm = this._upperFillerHeightMm.asReadonly();

  readonly distanceFromWallMm = this._distanceFromWallMm.asReadonly();
  readonly plinthSetbackMm = this._plinthSetbackMm.asReadonly();
  readonly fillerWidthMm = this._fillerWidthMm.asReadonly();
  readonly frontGapMm = this._frontGapMm.asReadonly();
  readonly supportHeightReductionMm = this._supportHeightReductionMm.asReadonly();
  readonly supportWidthReductionMm = this._supportWidthReductionMm.asReadonly();

  // ============ COMPUTED ============

  /**
   * Obliczona wysokość blatu od podłogi:
   * plinthHeight + countertopThickness (bez korpusu — korpus zależy od konkretnej szafki).
   */
  readonly countertopSurfaceHeightMm = computed(() =>
    this._plinthHeightMm() + this._countertopThicknessMm()
  );

  // ============ VISIBILITY TOGGLES (współdzielone między SVG front i floor plan) ============

  readonly showCountertop = signal(true);
  readonly showUpperCabinets = signal(true);

  // ============ METHODS ============

  /**
   * Aktualizuje wybrane ustawienia projektu (live signals).
   */
  updateProjectSettings(settings: {
    plinthHeightMm?: number;
    countertopThicknessMm?: number;
    upperFillerHeightMm?: number;
    distanceFromWallMm?: number;
    plinthSetbackMm?: number;
    fillerWidthMm?: number;
    frontGapMm?: number;
    supportHeightReductionMm?: number;
    supportWidthReductionMm?: number;
  }): void {
    if (settings.plinthHeightMm !== undefined) this._plinthHeightMm.set(settings.plinthHeightMm);
    if (settings.countertopThicknessMm !== undefined) this._countertopThicknessMm.set(settings.countertopThicknessMm);
    if (settings.upperFillerHeightMm !== undefined) this._upperFillerHeightMm.set(settings.upperFillerHeightMm);
    if (settings.distanceFromWallMm !== undefined) this._distanceFromWallMm.set(settings.distanceFromWallMm);
    if (settings.plinthSetbackMm !== undefined) this._plinthSetbackMm.set(settings.plinthSetbackMm);
    if (settings.fillerWidthMm !== undefined) this._fillerWidthMm.set(settings.fillerWidthMm);
    if (settings.frontGapMm !== undefined) this._frontGapMm.set(settings.frontGapMm);
    if (settings.supportHeightReductionMm !== undefined) this._supportHeightReductionMm.set(settings.supportHeightReductionMm);
    if (settings.supportWidthReductionMm !== undefined) this._supportWidthReductionMm.set(settings.supportWidthReductionMm);
  }

  /**
   * Zapisuje globalne defaults z user_settings DB i natychmiast je stosuje na sygnałach.
   * Wywoływać TYLKO raz przy starcie aplikacji (app.component.ts ngOnInit).
   * Dzięki temu resetToGlobalDefaults() i addWall() mogą dziedziczyć wartości z bazy.
   */
  setGlobalDefaults(settings: {
    plinthHeightMm: number;
    countertopThicknessMm: number;
    upperFillerHeightMm: number;
    distanceFromWallMm?: number;
    plinthSetbackMm?: number;
    fillerWidthMm?: number;
    frontGapMm?: number;
    supportHeightReductionMm?: number;
    supportWidthReductionMm?: number;
  }): void {
    // Zapamiętaj jako globalne defaults
    this._globalDefaultPlinthHeightMm = settings.plinthHeightMm;
    this._globalDefaultCountertopThicknessMm = settings.countertopThicknessMm;
    this._globalDefaultUpperFillerHeightMm = settings.upperFillerHeightMm;
    if (settings.distanceFromWallMm !== undefined) this._globalDefaultDistanceFromWallMm = settings.distanceFromWallMm;
    if (settings.plinthSetbackMm !== undefined) this._globalDefaultPlinthSetbackMm = settings.plinthSetbackMm;
    if (settings.fillerWidthMm !== undefined) this._globalDefaultFillerWidthMm = settings.fillerWidthMm;
    if (settings.frontGapMm !== undefined) this._globalDefaultFrontGapMm = settings.frontGapMm;
    if (settings.supportHeightReductionMm !== undefined) this._globalDefaultSupportHeightReductionMm = settings.supportHeightReductionMm;
    if (settings.supportWidthReductionMm !== undefined) this._globalDefaultSupportWidthReductionMm = settings.supportWidthReductionMm;

    // Zastosuj od razu do live signals
    this.updateProjectSettings(settings);
  }

  /**
   * Ustawia domyślne materiały płyt z user_settings.
   * Wywoływać po załadowaniu ustawień z serwera (app.component.ts).
   */
  setMaterialDefaults(settings: {
    defaultBoxMaterial?: string;
    defaultBoxBoardThickness?: number;
    defaultBoxColor?: string;
    defaultFrontMaterial?: string;
    defaultFrontBoardThickness?: number;
    defaultFrontColor?: string;
    defaultBackMaterial?: string;
    defaultBackBoardThickness?: number;
    defaultVarnishedFront?: boolean;
  }): void {
    this.materialDefaults.set({
      boxMaterial: settings.defaultBoxMaterial ?? DEFAULT_MATERIAL_DEFAULTS.boxMaterial,
      boxBoardThickness: settings.defaultBoxBoardThickness ?? DEFAULT_MATERIAL_DEFAULTS.boxBoardThickness,
      boxColor: settings.defaultBoxColor ?? DEFAULT_MATERIAL_DEFAULTS.boxColor,
      frontMaterial: settings.defaultFrontMaterial ?? DEFAULT_MATERIAL_DEFAULTS.frontMaterial,
      frontBoardThickness: settings.defaultFrontBoardThickness ?? DEFAULT_MATERIAL_DEFAULTS.frontBoardThickness,
      frontColor: settings.defaultFrontColor ?? DEFAULT_MATERIAL_DEFAULTS.frontColor,
      backMaterial: settings.defaultBackMaterial ?? DEFAULT_MATERIAL_DEFAULTS.backMaterial,
      backBoardThickness: settings.defaultBackBoardThickness ?? DEFAULT_MATERIAL_DEFAULTS.backBoardThickness,
      varnishedFront: settings.defaultVarnishedFront ?? DEFAULT_MATERIAL_DEFAULTS.varnishedFront
    });
  }

  /**
   * Resetuje live signals do wartości globalnych defaults (z user_settings DB).
   * Wywoływany przez KitchenStateService.clearAll() przy tworzeniu nowego projektu.
   */
  resetToGlobalDefaults(): void {
    this._plinthHeightMm.set(this._globalDefaultPlinthHeightMm);
    this._countertopThicknessMm.set(this._globalDefaultCountertopThicknessMm);
    this._upperFillerHeightMm.set(this._globalDefaultUpperFillerHeightMm);
  }

  /**
   * Stosuje ustawienia wczytanego projektu z backendu.
   * Wywoływany przez KitchenStateService.loadProject().
   */
  applyProjectSettings(plinthHeightMm: number, countertopThicknessMm: number, upperFillerHeightMm: number): void {
    this._plinthHeightMm.set(plinthHeightMm);
    this._countertopThicknessMm.set(countertopThicknessMm);
    this._upperFillerHeightMm.set(upperFillerHeightMm);
  }

  /**
   * Zwraca globalny default grubości blatu (z user_settings DB).
   * Używany przez addWall() w KitchenStateService.
   */
  getGlobalDefaultCountertopThicknessMm(): number {
    return this._globalDefaultCountertopThicknessMm;
  }
}
