/**
 * Zakresy wymiarów szafek kuchennych.
 * Wysokość = wysokość korpusu (użytkownik podaje bezpośrednio, bez cokołu i blatu).
 */
export const KitchenCabinetConstraints = {
  BASE_ONE_DOOR: {
    WIDTH_MIN: 200,
    WIDTH_MAX: 600,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 680,
    HEIGHT_MAX: 760,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  },
  BASE_TWO_DOOR: {
    WIDTH_MIN: 400,
    WIDTH_MAX: 900,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 680,
    HEIGHT_MAX: 760,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  },
  BASE_WITH_DRAWERS: {
    WIDTH_MIN: 300,
    WIDTH_MAX: 600,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 680,
    HEIGHT_MAX: 760,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    DRAWER_MIN: 2,
    DRAWER_MAX: 6
  },
  TALL_CABINET: {
    WIDTH_MIN: 300,
    WIDTH_MAX: 600,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 1700,
    HEIGHT_MAX: 2500,
    DEPTH_MIN: 500,
    DEPTH_MAX: 600,
    SEGMENT_MIN_HEIGHT: 100,
    SEGMENT_DRAWER_MIN: 1,
    SEGMENT_DRAWER_MAX: 6,
    SEGMENT_SHELF_MAX: 6
  },
  UPPER_ONE_DOOR: {
    WIDTH_MIN: 200,
    WIDTH_MAX: 600,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 300,
    HEIGHT_MAX: 900,
    DEPTH_MIN: 250,
    DEPTH_MAX: 400,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  },
  UPPER_TWO_DOOR: {
    WIDTH_MIN: 400,
    WIDTH_MAX: 900,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 300,
    HEIGHT_MAX: 900,
    DEPTH_MIN: 250,
    DEPTH_MAX: 400,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  },
  UPPER_OPEN_SHELF: {
    WIDTH_MIN: 200,
    WIDTH_MAX: 900,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 300,
    HEIGHT_MAX: 900,
    DEPTH_MIN: 250,
    DEPTH_MAX: 400,
    SHELF_MIN: 1,
    SHELF_MAX: 6
  },
  UPPER_CASCADE: {
    WIDTH_MIN: 200,
    WIDTH_MAX: 900,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 200,
    HEIGHT_MAX: 1800,
    LOWER_DEPTH_MIN: 300,
    LOWER_DEPTH_MAX: 560,
    UPPER_DEPTH_MIN: 250,
    UPPER_DEPTH_MAX: 400,
    SEGMENT_HEIGHT_MIN: 100,
    SEGMENT_HEIGHT_MAX: 900
  }
} as const;

// ============ USTAWIENIA PROJEKTU ============

export const ProjectSettingsConstraints = {
  PLINTH_HEIGHT_MIN: 80,
  PLINTH_HEIGHT_MAX: 200,
  PLINTH_HEIGHT_DEFAULT: 100,
  COUNTERTOP_THICKNESS_MIN: 18,
  COUNTERTOP_THICKNESS_MAX: 80,
  COUNTERTOP_THICKNESS_DEFAULT: 38,
  UPPER_FILLER_HEIGHT_MIN: 0,
  UPPER_FILLER_HEIGHT_MAX: 150,
  UPPER_FILLER_HEIGHT_DEFAULT: 100,
  MIN_WORKSPACE_GAP_MM: 450
} as const;

/**
 * Typy otwarcia szafki (uchwyt, click, frezowany, brak).
 */
export const OPENING_TYPES = [
  { value: 'HANDLE', label: 'Uchwyt' },
  { value: 'CLICK', label: 'Click (TIP-ON)' },
  { value: 'MILLED', label: 'Frezowany' },
  { value: 'NONE', label: 'Brak' }
] as const;

export type OpeningType = typeof OPENING_TYPES[number]['value'];
