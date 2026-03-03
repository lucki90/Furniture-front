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
  defaultSupportWidthReductionMm: number;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultPlinthHeightMm: 100,
  defaultCountertopThicknessMm: 38,
  defaultUpperFillerHeightMm: 100,
  defaultDistanceFromWallMm: 560,
  defaultPlinthSetbackMm: 60,
  defaultFillerWidthMm: 50,
  defaultFrontGapMm: 2,
  defaultSupportHeightReductionMm: 30,
  defaultSupportWidthReductionMm: 50
};
