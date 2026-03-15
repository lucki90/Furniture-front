export interface CabinetFormVisibility {
  shelfQuantity: boolean;
  drawerQuantity: boolean;
  drawerModel: boolean;
  segments: boolean;  // Dla szafek wielosegmentowych (np. TALL_CABINET)

  // Pola dla szafki narożnej (CORNER_CABINET)
  width: boolean;  // Standardowe pole szerokości (ukryte dla narożnika)
  cornerWidthA: boolean;  // Szerokość na ścianie A
  cornerWidthB: boolean;  // Szerokość na ścianie B (Type A tylko)
  cornerMechanism: boolean;  // Typ mechanizmu (Magic Corner, karuzela, itp.)
  cornerShelfQuantity: boolean;  // Liczba półek (tylko dla FIXED_SHELVES i BLIND_CORNER)
  isUpperCorner: boolean;  // Wybór: dolna/górna (Type A tylko)
  cornerOpeningType: boolean;  // Typ otwarcia: TWO_DOORS | BIFOLD (Type A base only)
  cornerFrontUchylnyWidth: boolean;  // Szerokość frontu uchylnego 400-600mm (Type B only)

  // Pola pozycjonowania szafek wiszących (UPPER_*)
  positioningMode: boolean;       // Tryb: SUFIT / BLAT
  gapFromCountertopMm: boolean;   // Odstęp od blatu (tylko dla trybu BLAT)

  // Pola szafki kaskadowej (UPPER_CASCADE)
  cascadeSegments: boolean;       // Sekcja segmentów kaskadowych (dolny + górny)

  // Obudowa boczna (BASE_*, TALL_CABINET, UPPER_*)
  enclosureSection: boolean;      // Sekcja konfiguracji obudów (lewa/prawa strona)

  // Nowy sposób liczenia dolnych szafek (tylko BASE_ONE_DOOR, BASE_TWO_DOOR, BASE_WITH_DRAWERS, BASE_SINK)
  bottomWreathOnFloor: boolean;

  // Pola szafki zlewowej (BASE_SINK)
  sinkFrontType: boolean;    // Selector: 1 drzwi / 2 drzwi / szuflada
  sinkApron: boolean;        // Sekcja blendy (checkbox + pole wysokości)
  sinkApronHeight: boolean;  // Pole wysokości blendy (widoczne gdy apronEnabled=true)
  sinkDrawerModel: boolean;  // Selector systemu szuflad (widoczne gdy frontType=DRAWER)

  // Pola szafki pod płytę grzewczą (BASE_COOKTOP)
  cooktopType: boolean;      // Typ płyty: GAS | INDUCTION
  cooktopFrontType: boolean; // Typ frontu: DRAWERS | TWO_DOORS | ONE_DOOR

  // Pola szafki wiszącej na okap (UPPER_HOOD)
  hoodFrontType: boolean;    // Typ frontu: FLAP | TWO_DOORS | OPEN
  hoodScreenEnabled: boolean; // Checkbox: blenda wewnętrzna maskująca okap
  hoodScreenHeight: boolean;  // Pole wysokości blendy (aktywne gdy hoodScreenEnabled=true)
}
