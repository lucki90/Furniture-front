export interface CabinetFormVisibility {
  shelfQuantity: boolean;
  drawerQuantity: boolean;
  drawerModel: boolean;
  segments: boolean;  // Dla szafek wielosegmentowych (np. TALL_CABINET)

  // Pola dla szafki narożnej (CORNER_CABINET)
  width: boolean;  // Standardowe pole szerokości (ukryte dla narożnika)
  cornerWidthA: boolean;  // Szerokość na ścianie A
  cornerWidthB: boolean;  // Szerokość na ścianie B
  cornerMechanism: boolean;  // Typ mechanizmu (Magic Corner, karuzela, itp.)
  cornerShelfQuantity: boolean;  // Liczba półek (tylko dla FIXED_SHELVES)
  isUpperCorner: boolean;  // Wybór: dolna/górna

  // Pola pozycjonowania szafek wiszących (UPPER_*)
  positioningMode: boolean;       // Tryb: SUFIT / BLAT
  gapFromCountertopMm: boolean;   // Odstęp od blatu (tylko dla trybu BLAT)

  // Pola szafki kaskadowej (UPPER_CASCADE)
  cascadeSegments: boolean;       // Sekcja segmentów kaskadowych (dolny + górny)
}
