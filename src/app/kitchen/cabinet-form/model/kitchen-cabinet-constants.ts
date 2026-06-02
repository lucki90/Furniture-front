/**
 * Zakresy wymiarów szafek kuchennych.
 * Wysokość = wysokość korpusu (użytkownik podaje bezpośrednio, bez cokołu i blatu).
 */
// TODO(CODEX): Te constraints wyglądają jak twarda wiedza produktowa i reguły oferty, a nie tylko walidacja UI. Front może je dublować dla wygody formularza, ale źródło prawdy powinno być po stronie backendu albo w konfigurowalnym kontrakcie API. Inaczej bardzo łatwo o sytuację, w której frontend pozwala albo blokuje inne wymiary niż te, które backend realnie kalkuluje.
export const KitchenCabinetConstraints = {
  BASE_ONE_DOOR: {
    // Książka Wasiak v.2.3 str. 40: sugerowane 300–600mm dla szafki 1-frontowej
    WIDTH_MIN: 300,
    WIDTH_MAX: 600,
    HEIGHT_MIN: 680,
    HEIGHT_MAX: 760,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  },
  BASE_TWO_DOOR: {
    // Książka Wasiak v.2.3 str. 40: sugerowane 600–1200mm dla szafki 2-frontowej
    WIDTH_MIN: 600,
    WIDTH_MAX: 1200,
    HEIGHT_MIN: 680,
    HEIGHT_MAX: 760,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  },
  BASE_OPEN: {
    WIDTH_MIN: 150,
    WIDTH_MAX: 900,
    HEIGHT_MIN: 680,
    HEIGHT_MAX: 760,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  },
  PANTRY_PASSAGE: {
    WIDTH_MIN: 450,
    WIDTH_MAX: 1400,
    HEIGHT_MIN: 1900,
    HEIGHT_MAX: 2500,
    DEPTH_MIN: 120,
    DEPTH_MAX: 120,
    SHELF_MIN: 0,
    SHELF_MAX: 0
  },
  BASE_WITH_DRAWERS: {
    // Książka Wasiak v.2.3 str. 43: sugerowane 300–1200mm dla szafki z szufladami
    WIDTH_MIN: 300,
    WIDTH_MAX: 1200,
    HEIGHT_MIN: 680,
    HEIGHT_MAX: 760,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    DRAWER_MIN: 2,
    DRAWER_MAX: 6
  },
  BASE_CARGO: {
    WIDTH_MIN: 150,
    WIDTH_MAX: 600,
    HEIGHT_MIN: 680,
    HEIGHT_MAX: 760,
    // Depth is variant-specific (validated on backend):
    //   MECHANISM: 510-560mm (Blum mechanism requirement)
    //   DRAWERS:   300-560mm
    DEPTH_MIN: 300,
    DEPTH_MAX: 560,
    DRAWER_MIN: 2,
    DRAWER_MAX: 3
  },
  BASE_SINK: {
    // Książka Wasiak v.2.3 str. 41: H ~720mm (korpus), G 510mm; szerokość per front-type:
    //   ONE_DOOR  450–600mm
    //   TWO_DOORS 600–1000mm
    //   DRAWER    450–900mm (limit szuflady Blum Antaro pod zlewem)
    WIDTH_ONE_DOOR_MIN: 450,
    WIDTH_ONE_DOOR_MAX: 600,
    WIDTH_TWO_DOORS_MIN: 600,
    WIDTH_TWO_DOORS_MAX: 1000,
    WIDTH_DRAWER_MIN: 450,
    WIDTH_DRAWER_MAX: 900,
    // Fallback gdy sinkFrontType nieznany — najszerszy union (450–1000)
    WIDTH_MIN: 450,
    WIDTH_MAX: 1000,
    HEIGHT_MIN: 680,
    HEIGHT_MAX: 760,
    DEPTH_MIN: 500,
    DEPTH_MAX: 620,
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
    WIDTH_MIN: 300,
    WIDTH_MAX: 600,
    HEIGHT_MIN: 600,
    HEIGHT_MAX: 1200,
    DEPTH_MIN: 250,
    DEPTH_MAX: 400,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  },
  UPPER_TWO_DOOR: {
    WIDTH_MIN: 600,
    WIDTH_MAX: 1000,
    HEIGHT_MIN: 600,
    HEIGHT_MAX: 1200,
    DEPTH_MIN: 250,
    DEPTH_MAX: 400,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  },
  UPPER_OPEN_SHELF: {
    WIDTH_MIN: 150,
    WIDTH_MAX: 900,
    HEIGHT_MIN: 300,
    HEIGHT_MAX: 900,
    DEPTH_MIN: 250,
    DEPTH_MAX: 400,
    SHELF_MIN: 1,
    SHELF_MAX: 8
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
    // Realne wymiary piekarników wbudowanych: standardowe 600mm, szersze 700mm.
    // Książka Wasiak v.2.3 str. 44: sugerowana szerokość 600mm (stała); zakres 590–710 obejmuje obie klasy.
    WIDTH_MIN: 590,
    WIDTH_MAX: 710,
    /**
     * Sugerowane szerokości szafki na piekarnik dopasowane do typowych wymiarów piekarników wbudowanych.
     * Używane do wyświetlania ostrzeżenia w UI gdy użytkownik wpisuje wartość spoza tej listy.
     */
    SUGGESTED_WIDTHS_MM: [600, 700] as readonly number[],
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
  UPPER_GAP_FROM_COUNTERTOP_DEFAULT: 550,
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
