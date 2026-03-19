/**
 * Model dla szafek z piekarnikiem (BASE_OVEN, BASE_OVEN_FREESTANDING).
 */

/**
 * Typ wbudowanego piekarnika — decyduje o wysokości gniazda.
 */
export enum OvenHeightType {
  STANDARD = 'STANDARD',   // 595mm — piekarnik standardowy (najczęściej stosowany)
  COMPACT = 'COMPACT'      // 455mm — piekarnik kompaktowy
}

/**
 * Typ sekcji dolnej w szafce pod piekarnik (BASE_OVEN).
 */
export enum OvenLowerSectionType {
  LOW_DRAWER = 'LOW_DRAWER',   // Szuflada niska (~84mm)
  HINGED_DOOR = 'HINGED_DOOR', // Drzwi zawiasowe
  NONE = 'NONE'                // Brak sekcji dolnej
}

/** Etykiety dla OvenHeightType. */
export const OVEN_HEIGHT_TYPE_OPTIONS: { value: OvenHeightType; label: string }[] = [
  { value: OvenHeightType.STANDARD, label: 'Standardowy (595mm)' },
  { value: OvenHeightType.COMPACT,  label: 'Kompaktowy (455mm)' }
];

/** Etykiety dla OvenLowerSectionType. */
export const OVEN_LOWER_SECTION_OPTIONS: { value: OvenLowerSectionType; label: string }[] = [
  { value: OvenLowerSectionType.LOW_DRAWER,   label: 'Szuflada niska' },
  { value: OvenLowerSectionType.HINGED_DOOR,  label: 'Drzwi zawiasowe' },
  { value: OvenLowerSectionType.NONE,         label: 'Bez sekcji dolnej' }
];

/** Slot heights in mm (for frontend display / validation). */
export const OVEN_SLOT_HEIGHT: Record<OvenHeightType, number> = {
  [OvenHeightType.STANDARD]: 595,
  [OvenHeightType.COMPACT]: 455
};
