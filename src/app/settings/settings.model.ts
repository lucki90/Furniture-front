export interface UserSettings {
  defaultPlinthHeightMm: number;
  defaultCountertopThicknessMm: number;
  defaultUpperFillerHeightMm: number;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultPlinthHeightMm: 100,
  defaultCountertopThicknessMm: 38,
  defaultUpperFillerHeightMm: 100
};
