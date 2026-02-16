export const KitchenCabinetConstraints = {
  BASE_ONE_DOOR: {
    WIDTH_MIN: 200,
    WIDTH_MAX: 600,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 820,
    HEIGHT_MAX: 870,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  },
  BASE_TWO_DOOR: {
    WIDTH_MIN: 400,
    WIDTH_MAX: 900,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 820,
    HEIGHT_MAX: 870,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  },
  BASE_WITH_DRAWERS: {
    WIDTH_MIN: 300,
    WIDTH_MAX: 600,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 820,
    HEIGHT_MAX: 870,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    DRAWER_MIN: 2,
    DRAWER_MAX: 6
  }
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
