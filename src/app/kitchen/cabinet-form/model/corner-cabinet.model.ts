/**
 * Types of internal organization mechanisms for corner cabinets.
 */
export enum CornerMechanismType {
  MAGIC_CORNER = 'MAGIC_CORNER',
  CAROUSEL_270 = 'CAROUSEL_270',
  CAROUSEL_360 = 'CAROUSEL_360',
  LE_MANS = 'LE_MANS',
  FIXED_SHELVES = 'FIXED_SHELVES',
  NONE = 'NONE'
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
  widthB: number;
  mechanism: CornerMechanismType;
  shelfQuantity?: number;
  upperCabinet: boolean;
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
  [CornerMechanismType.NONE]: 'Brak (pusta)'
};

/**
 * Mechanisms allowed for base (floor) corner cabinet.
 */
export const BASE_CORNER_MECHANISMS: CornerMechanismType[] = [
  CornerMechanismType.MAGIC_CORNER,
  CornerMechanismType.CAROUSEL_270,
  CornerMechanismType.CAROUSEL_360,
  CornerMechanismType.LE_MANS,
  CornerMechanismType.FIXED_SHELVES,
  CornerMechanismType.NONE
];

/**
 * Mechanisms allowed for upper (hanging) corner cabinet.
 */
export const UPPER_CORNER_MECHANISMS: CornerMechanismType[] = [
  CornerMechanismType.FIXED_SHELVES,
  CornerMechanismType.NONE
];

/**
 * Dimension constraints for base corner cabinet.
 */
export const BASE_CORNER_CONSTRAINTS = {
  widthMin: 800,
  widthMax: 1000,
  widthStep: 50,
  heightMin: 820,
  heightMax: 870,
  depth: 560,
  shelfMin: 0,
  shelfMax: 4
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
  shelfMin: 1,
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
  return mechanism === CornerMechanismType.FIXED_SHELVES;
}

/**
 * Checks if mechanism is allowed for upper cabinet.
 */
export function isAllowedForUpperCabinet(mechanism: CornerMechanismType): boolean {
  return mechanism === CornerMechanismType.FIXED_SHELVES ||
         mechanism === CornerMechanismType.NONE;
}
