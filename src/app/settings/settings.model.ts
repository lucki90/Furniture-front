export type CuttingOptimizationPriority = 'LEAST_WASTE' | 'FEWEST_CUTS' | 'SMALLER_SHEETS';

export interface UserSettings {
  defaultPlinthHeightMm: number;
  defaultCountertopThicknessMm: number;
  defaultUpperFillerHeightMm: number;

  // Ustawienia obudowy szafek (domyślne wymiary)
  defaultDistanceFromWallMm: number;
  defaultPlinthSetbackMm: number;
  defaultFillerWidthMm: number;
  defaultFrontGapMm: number;
  defaultSupportHeightReductionMm: number;

  // Konfigurowalne wymiary techniczne szafek
  hdfThicknessMm: number;
  hdfGrooveDistanceMm: number;
  hdfGrooveDepthMm: number;
  hdfBorderDistanceMm: number;
  frontShiftMm: number;
  extendedFrontMm: number;
  veneerMm: number;
  spaceBetweenSideAndFrontMm: number;
  spaceBetweenWreathAndFrontMm: number;
  verticallySpaceBetweenTwoFrontsMm: number;
  horizontallySpaceBetweenTwoFrontsMm: number;
  shelfCutoutWidthMm: number;
  shelfCutoutDepthMm: number;

  // Grubości płyt szuflad
  /** Konfigurowalna grubość płyt Sevroll Ball Slide (16–22mm). Wysyłana w PUT. */
  ballSlideSevrollDrawerThicknessMm: number;
  /** Stała grubość płyt Blum Antaro / Tandembox (16mm). Tylko odczyt z GET. */
  antaroTandemboxDrawerThicknessMm?: number;

  // Ustawienia kalkulacji odpadu i kierunku słoi
  wasteChipboardEnabled: boolean;
  wasteHdfEnabled: boolean;
  wasteMdfEnabled: boolean;
  grainContinuityEnabled: boolean;

  // Parametry rozkroju gilotynowego
  cuttingKerfMm: number;
  cuttingOptimizationPriority: CuttingOptimizationPriority;

  // Łączenie blatów: wcięcie łyżwy i zapas na docięcie formatki
  countertopLyzwaRecessMm: number;
  countertopCutAllowanceMm: number;

  // Marże i rabaty
  markupMaterialsPct: number;
  markupComponentsPct: number;
  markupJobsPct: number;
  defaultDiscountPct: number;

  // Domyślne materiały i kolory płyt
  defaultBoxMaterial: string;
  defaultBoxBoardThickness: number;
  defaultBoxColor: string;
  defaultFrontMaterial: string;
  defaultFrontBoardThickness: number;
  defaultFrontColor: string;
  defaultBackMaterial: string;
  defaultBackBoardThickness: number;
  defaultSheetSizeMode: 'FULL' | 'HALF' | 'QUARTER';
  defaultVarnishedFront: boolean;
  defaultMaterialPresetCode?: string | null;

  // Dane firmy (dla ofert PDF)
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  offerValidityDays: number;
}

export type UpdateUserSettingsRequest = Omit<UserSettings, 'antaroTandemboxDrawerThicknessMm'>;

/** Available option values returned by GET /settings/options. */
export interface SettingsOptions {
  plinthHeights: number[];
  countertopThicknesses: number[];
  upperFillerHeights: number[];
  distanceFromWallOptions: number[];
}

export const DEFAULT_MATERIAL_PRESET_CODE = 'WHITE_STANDARD';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultPlinthHeightMm: 100,
  defaultCountertopThicknessMm: 38,
  defaultUpperFillerHeightMm: 100,
  defaultDistanceFromWallMm: 560,
  defaultPlinthSetbackMm: 60,
  defaultFillerWidthMm: 50,
  defaultFrontGapMm: 2,
  defaultSupportHeightReductionMm: 30,
  hdfThicknessMm: 3,
  hdfGrooveDistanceMm: 20,
  hdfGrooveDepthMm: 10,
  hdfBorderDistanceMm: 5,
  frontShiftMm: 2,
  extendedFrontMm: 23,
  veneerMm: 1,
  spaceBetweenSideAndFrontMm: 2,
  spaceBetweenWreathAndFrontMm: 3,
  verticallySpaceBetweenTwoFrontsMm: 4,
  horizontallySpaceBetweenTwoFrontsMm: 3,
  shelfCutoutWidthMm: 1,
  shelfCutoutDepthMm: 2,
  ballSlideSevrollDrawerThicknessMm: 18,
  wasteChipboardEnabled: true,
  wasteHdfEnabled: false,
  wasteMdfEnabled: false,
  grainContinuityEnabled: false,
  cuttingKerfMm: 3,
  cuttingOptimizationPriority: 'LEAST_WASTE',
  countertopLyzwaRecessMm: 30,
  countertopCutAllowanceMm: 0,
  markupMaterialsPct: 0,
  markupComponentsPct: 0,
  markupJobsPct: 0,
  defaultDiscountPct: 0,
  defaultBoxMaterial: 'CHIPBOARD',
  defaultBoxBoardThickness: 18,
  defaultBoxColor: 'WHITE',
  defaultFrontMaterial: 'CHIPBOARD',
  defaultFrontBoardThickness: 18,
  defaultFrontColor: 'WHITE',
  defaultBackMaterial: 'HDF',
  defaultBackBoardThickness: 3,
  defaultSheetSizeMode: 'FULL',
  defaultVarnishedFront: false,
  defaultMaterialPresetCode: DEFAULT_MATERIAL_PRESET_CODE,
  companyName: '',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  offerValidityDays: 14
};
