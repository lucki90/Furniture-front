/**
 * Model dla szafek z lodówką (BASE_FRIDGE, BASE_FRIDGE_FREESTANDING).
 */

/**
 * Typ sekcji szafki na wbudowaną lodówkę.
 * ONE_DOOR  — jedna drzwi na całą wysokość (tylko lodówka lub tylko zamrażarka)
 * TWO_DOORS — dwie drzwi: górna = lodówka (chłodziarka), dolna = zamrażarka
 */
export enum FridgeSectionType {
  ONE_DOOR  = 'ONE_DOOR',
  TWO_DOORS = 'TWO_DOORS'
}

/**
 * Typ wizualizacji lodówki wolnostojącej (BASE_FRIDGE_FREESTANDING).
 * Używany wyłącznie do rysowania SVG — nie wpływa na kalkulację płyt (0 płyt).
 * SINGLE_DOOR — jeden srebrny prostokąt, bez linii podziału
 * TWO_DOORS   — pozioma linia podziału (~2/3 od góry = zamrażarka u dołu)
 * SIDE_BY_SIDE — pionowa linia w połowie szerokości
 */
export enum FridgeFreestandingType {
  SINGLE_DOOR = 'SINGLE_DOOR',
  TWO_DOORS   = 'TWO_DOORS',
  SIDE_BY_SIDE = 'SIDE_BY_SIDE'
}

/** Etykiety dla FridgeSectionType. */
export const FRIDGE_SECTION_TYPE_OPTIONS: { value: FridgeSectionType; label: string }[] = [
  { value: FridgeSectionType.ONE_DOOR,  label: 'Jednodrzwiowa (lodówka)' },
  { value: FridgeSectionType.TWO_DOORS, label: 'Dwudrzwiowa (lodówka + zamrażarka)' }
];

/** Etykiety dla FridgeFreestandingType. */
export const FRIDGE_FREESTANDING_TYPE_OPTIONS: { value: FridgeFreestandingType; label: string }[] = [
  { value: FridgeFreestandingType.SINGLE_DOOR,  label: 'Jednodrzwiowa' },
  { value: FridgeFreestandingType.TWO_DOORS,    label: 'Dwudrzwiowa (zamrażarka u dołu)' },
  { value: FridgeFreestandingType.SIDE_BY_SIDE, label: 'Side-by-side (lodówka + zamrażarka obok siebie)' }
];
