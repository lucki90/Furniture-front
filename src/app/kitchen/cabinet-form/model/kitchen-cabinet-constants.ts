/**
 * Zakresy wymiarów szafek kuchennych.
 * Wysokość = wysokość korpusu (użytkownik podaje bezpośrednio, bez cokołu i blatu).
 */
// TODO(CODEX): Te constraints wyglądają jak twarda wiedza produktowa i reguły oferty, a nie tylko walidacja UI. Front może je dublować dla wygody formularza, ale źródło prawdy powinno być po stronie backendu albo w konfigurowalnym kontrakcie API. Inaczej bardzo łatwo o sytuację, w której frontend pozwala albo blokuje inne wymiary niż te, które backend realnie kalkuluje.
export const KitchenCabinetConstraints = {
  BASE_ONE_DOOR: {
    WIDTH_MIN: 200,
    WIDTH_MAX: 600,
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
    HEIGHT_MIN: 680,
    HEIGHT_MAX: 760,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    DRAWER_MIN: 2,
    DRAWER_MAX: 6
  },
  BASE_SINK: {
    WIDTH_MIN: 400,
    WIDTH_MAX: 1200,
    HEIGHT_MIN: 600,
    HEIGHT_MAX: 900,
    DEPTH_MIN: 400,
    DEPTH_MAX: 700,
    APRON_MIN: 80,
    APRON_MAX: 200
  },
  TALL_CABINET: {
    WIDTH_MIN: 300,
    WIDTH_MAX: 600,
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
    HEIGHT_MIN: 300,
    HEIGHT_MAX: 900,
    DEPTH_MIN: 250,
    DEPTH_MAX: 400,
    SHELF_MIN: 1,
    SHELF_MAX: 6
  },
  BASE_COOKTOP: {
    WIDTH_MIN: 450,
    WIDTH_MAX: 900,
    HEIGHT_MIN: 600,
    HEIGHT_MAX: 900,
    DEPTH_MIN: 400,
    DEPTH_MAX: 700,
    DRAWER_MIN: 2,
    DRAWER_MAX: 3
  },
  BASE_DISHWASHER: {
    WIDTH_ALLOWED: [450, 600] as readonly number[],
    HEIGHT_MIN: 600,
    HEIGHT_MAX: 900,
    DEPTH_MIN: 400,
    DEPTH_MAX: 700
  },
  BASE_DISHWASHER_FREESTANDING: {
    WIDTH_MIN: 300,
    WIDTH_MAX: 900,
    HEIGHT_MIN: 600,
    HEIGHT_MAX: 950,
    DEPTH_MIN: 400,
    DEPTH_MAX: 700
  },
  UPPER_CASCADE: {
    WIDTH_MIN: 200,
    WIDTH_MAX: 900,
    HEIGHT_MIN: 200,
    HEIGHT_MAX: 1800,
    LOWER_DEPTH_MIN: 300,
    LOWER_DEPTH_MAX: 560,
    UPPER_DEPTH_MIN: 250,
    UPPER_DEPTH_MAX: 400,
    SEGMENT_HEIGHT_MIN: 100,
    SEGMENT_HEIGHT_MAX: 900
  },
  UPPER_HOOD: {
    WIDTH_MIN: 450,
    WIDTH_MAX: 1200,
    HEIGHT_MIN: 300,
    HEIGHT_MAX: 720,
    DEPTH_MIN: 280,
    DEPTH_MAX: 400,
    HOOD_SCREEN_MIN: 50,
    HOOD_SCREEN_MAX: 200
  },
  BASE_OVEN: {
    WIDTH_MIN: 500,
    WIDTH_MAX: 900,
    HEIGHT_MIN: 600,
    HEIGHT_MAX: 950,
    DEPTH_MIN: 550,
    DEPTH_MAX: 650,
    APRON_MIN: 30,
    APRON_MAX: 150,
    LOWER_SECTION_MIN: 50
  },
  BASE_OVEN_FREESTANDING: {
    WIDTH_MIN: 200,
    WIDTH_MAX: 1200,
    HEIGHT_MIN: 300,
    HEIGHT_MAX: 2000,
    DEPTH_MIN: 200,
    DEPTH_MAX: 1000
  },
  BASE_FRIDGE: {
    WIDTH_MIN: 450,
    WIDTH_MAX: 900,
    HEIGHT_MIN: 1600,
    HEIGHT_MAX: 2600,
    DEPTH_MIN: 450,
    DEPTH_MAX: 700,
    LOWER_FRONT_MIN: 500,
    LOWER_FRONT_MAX: 900
  },
  BASE_FRIDGE_FREESTANDING: {
    WIDTH_MIN: 200,
    WIDTH_MAX: 1600,
    HEIGHT_MIN: 200,
    HEIGHT_MAX: 2600,
    DEPTH_MIN: 200,
    DEPTH_MAX: 1000
  },
  UPPER_DRAINER: {
    // Sztywne szerokości: 400 / 500 / 600 / 800 / 900mm (standardowe rozmiary systemów ociekacza)
    HEIGHT_MIN: 300,
    HEIGHT_MAX: 900,
    DEPTH_MIN: 280,
    DEPTH_MAX: 320
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
// TODO(CODEX): To kolejny słownik domenowy trzymany lokalnie na froncie. Jeśli oferta okuć/typów otwarcia ma się zmieniać albo zależeć od konfiguracji firmy, te opcje powinny być dostarczane z backendu razem z innymi słownikami zamiast być zakodowane w aplikacji.
export const OPENING_TYPES = [
  { value: 'HANDLE', label: 'Uchwyt' },
  { value: 'CLICK', label: 'Click (TIP-ON)' },
  { value: 'MILLED', label: 'Frezowany' },
  { value: 'NONE', label: 'Brak' }
] as const;

export type OpeningType = typeof OPENING_TYPES[number]['value'];
