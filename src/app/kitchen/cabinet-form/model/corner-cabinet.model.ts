/**
 * Types of internal organization mechanisms for corner cabinets.
 * Type A (L-shaped): FIXED_SHELVES, CAROUSEL_270, CAROUSEL_360
 * Type B (Rectangular/Blind): BLIND_CORNER, MAGIC_CORNER, LE_MANS
 * Note: NONE is kept for backward compatibility but not shown in dropdown (same as FIXED_SHELVES with 0 shelves).
 */
export enum CornerMechanismType {
  MAGIC_CORNER = 'MAGIC_CORNER',
  CAROUSEL_270 = 'CAROUSEL_270',
  CAROUSEL_360 = 'CAROUSEL_360',
  LE_MANS = 'LE_MANS',
  FIXED_SHELVES = 'FIXED_SHELVES',
  NONE = 'NONE',
  BLIND_CORNER = 'BLIND_CORNER'
}

/**
 * Opening type for Type A L-shaped corner cabinets.
 */
export enum CornerOpeningType {
  TWO_DOORS = 'TWO_DOORS',   // Dwie standardowe drzwi (jedna na każde ramię)
  BIFOLD = 'BIFOLD',          // Harmonijka (dwie połówki na jednym ramieniu)
  BLIND = 'BLIND'             // Jedno ramię z drzwiami (A), drugie bez frontu — zasłonięte ścianą lub szafką
}

/**
 * Returns true if mechanism is Type B (Blind/Rectangular).
 * Type B: BLIND_CORNER, MAGIC_CORNER, LE_MANS
 */
export function isBlindType(mechanism: CornerMechanismType): boolean {
  return mechanism === CornerMechanismType.BLIND_CORNER
    || mechanism === CornerMechanismType.MAGIC_CORNER
    || mechanism === CornerMechanismType.LE_MANS;
}

/**
 * Form data for corner cabinet configuration.
 */
export interface CornerCabinetFormData {
  widthA: number;
  widthB: number;
  mechanism: CornerMechanismType;
  shelfQuantity?: number;
  isUpperCabinet: boolean;
}

/**
 * Request DTO for corner cabinet (matches backend CornerCabinetRequest).
 */
export interface CornerCabinetRequest {
  widthA: number;
  widthB?: number;              // null for Type B (no widthB)
  mechanism: CornerMechanismType;
  shelfQuantity?: number;
  upperCabinet: boolean;
  cornerOpeningType?: CornerOpeningType;  // Type A only: TWO_DOORS | BIFOLD
  frontUchylnyWidthMm?: number;           // Type B only: 400-600mm
  magicCornerFrontOnHinges?: boolean;     // MAGIC_CORNER only (optional)
}

/**
 * Labels for corner mechanism types.
 */
export const CORNER_MECHANISM_LABELS: Record<CornerMechanismType, string> = {
  [CornerMechanismType.MAGIC_CORNER]: 'Magic Corner',
  [CornerMechanismType.CAROUSEL_270]: 'Karuzela 270°',
  [CornerMechanismType.CAROUSEL_360]: 'Karuzela 360°',
  [CornerMechanismType.LE_MANS]: 'Fasolka (Le Mans)',
  [CornerMechanismType.FIXED_SHELVES]: 'Półki stałe',
  [CornerMechanismType.NONE]: 'Brak (pusta)',
  [CornerMechanismType.BLIND_CORNER]: 'Ślepy narożnik (front uchylny)'
};

/**
 * Mechanisms allowed for base (floor) corner cabinet.
 * NONE is excluded — use FIXED_SHELVES with shelfQuantity=0 instead.
 */
export const BASE_CORNER_MECHANISMS: CornerMechanismType[] = [
  CornerMechanismType.FIXED_SHELVES,
  CornerMechanismType.CAROUSEL_270,
  CornerMechanismType.CAROUSEL_360,
  CornerMechanismType.MAGIC_CORNER,
  CornerMechanismType.LE_MANS,
  CornerMechanismType.BLIND_CORNER
];

/**
 * Mechanisms allowed for upper (hanging) corner cabinet.
 * FIXED_SHELVES — standard upper corner (with shelves or blind: CornerOpeningType.BLIND for one arm without front).
 */
export const UPPER_CORNER_MECHANISMS: CornerMechanismType[] = [
  CornerMechanismType.FIXED_SHELVES
];

/**
 * Dimension constraints for base corner cabinet (Type A — L-shaped).
 */
export const BASE_CORNER_CONSTRAINTS = {
  widthMin: 800,
  widthMax: 1000,
  widthStep: 50,
  heightMin: 680,
  heightMax: 760,
  depth: 560,
  shelfMin: 0,
  shelfMax: 4
};

/**
 * Dimension constraints for blind corner cabinet (Type B — Rectangular).
 */
export const BLIND_CORNER_CONSTRAINTS = {
  widthMin: 800,
  widthMax: 1200,
  widthStep: 50,
  heightMin: 680,
  heightMax: 760,
  depth: 510,   // Fixed by backend preparer
  shelfMin: 0,
  shelfMax: 2,   // Only BLIND_CORNER supports shelves (0-2)
  frontUchylnyMin: 400,
  frontUchylnyMax: 600,
  frontUchylnyDefault: 500
};

/**
 * Dimension constraints for upper corner cabinet.
 */
export const UPPER_CORNER_CONSTRAINTS = {
  widthMin: 600,
  widthMax: 900,
  widthStep: 50,
  heightMin: 600,
  heightMax: 900,
  depth: 320,  // Stała głębokość dla górnej (typowo 300-350mm)
  shelfMin: 0,  // 0 półek dozwolone — np. przy karuzeli lub pustej szafce
  shelfMax: 3
};

/**
 * Maps form data to request DTO.
 */
export function mapCornerFormToRequest(formData: CornerCabinetFormData): CornerCabinetRequest {
  return {
    widthA: formData.widthA,
    widthB: formData.widthB,
    mechanism: formData.mechanism,
    shelfQuantity: formData.shelfQuantity,
    upperCabinet: formData.isUpperCabinet
  };
}

/**
 * Checks if mechanism requires shelf configuration.
 */
export function mechanismRequiresShelves(mechanism: CornerMechanismType): boolean {
  return mechanism === CornerMechanismType.FIXED_SHELVES
    || mechanism === CornerMechanismType.BLIND_CORNER;
}

/**
 * Checks if mechanism is allowed for upper cabinet.
 */
export function isAllowedForUpperCabinet(mechanism: CornerMechanismType): boolean {
  return mechanism === CornerMechanismType.FIXED_SHELVES;
}
