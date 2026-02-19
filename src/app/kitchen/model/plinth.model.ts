/**
 * Model dla cokołów i nóżek kuchennych.
 */

// ============ ENUMS ============

export type FeetType = 'FEET_100' | 'FEET_150';

export const FEET_TYPE_OPTIONS: { value: FeetType; label: string; feetHeightMm: number; plinthHeightMm: number }[] = [
  { value: 'FEET_100', label: 'Nóżki 100mm (standard)', feetHeightMm: 100, plinthHeightMm: 97 },
  { value: 'FEET_150', label: 'Nóżki 150mm (wysokie)', feetHeightMm: 150, plinthHeightMm: 147 }
];

export type PlinthMaterialType = 'PVC' | 'MDF_LAMINATED' | 'ALUMINUM' | 'CHIPBOARD';

export const PLINTH_MATERIAL_OPTIONS: { value: PlinthMaterialType; label: string; description: string }[] = [
  { value: 'PVC', label: 'PVC (standard)', description: 'Odporny na wilgoć, łatwy montaż' },
  { value: 'MDF_LAMINATED', label: 'MDF laminowany', description: 'Estetyczny, mniej odporny na wilgoć' },
  { value: 'ALUMINUM', label: 'Aluminium', description: 'Nowoczesny, bardzo trwały' },
  { value: 'CHIPBOARD', label: 'Płyta wiórowa', description: 'Najtańszy, wymaga oklejenia' }
];

// ============ REQUEST ============

export interface PlinthRequest {
  enabled: boolean;
  feetType: FeetType;
  materialType: PlinthMaterialType;
  colorCode?: string;
  setbackMm: number;
  manualLengthMm?: number;
}

export const DEFAULT_PLINTH_REQUEST: PlinthRequest = {
  enabled: true,
  feetType: 'FEET_100',
  materialType: 'PVC',
  setbackMm: 40
};

// ============ RESPONSE ============

export interface PlinthSegmentResponse {
  segmentIndex: number;
  lengthMm: number;
  heightMm: number;
  materialType: PlinthMaterialType;
  colorCode?: string;
  positionX: number;
  setbackMm: number;
  requiresJoint: boolean;
  startCabinetId?: string;
  endCabinetId?: string;
  mountingClipCount: number;
  materialCost: number;
  cuttingCost: number;
  totalCost: number;
}

export interface PlinthResponse {
  enabled: boolean;
  feetType: FeetType;
  feetHeightMm: number;
  plinthHeightMm: number;
  totalLengthMm: number;
  materialType: PlinthMaterialType;
  colorCode?: string;
  setbackMm: number;
  segments: PlinthSegmentResponse[];
  segmentCount: number;
  wasSplit: boolean;
  splitReason?: string;
  components: any[]; // ComponentDto
  totalFeetCount: number;
  totalMountingClipCount: number;
  totalMaterialCost: number;
  totalCuttingCost: number;
  totalComponentsCost: number;
  totalCost: number;
}

// ============ CONSTANTS ============

export const PLINTH_CONSTANTS = {
  MAX_SEGMENT_LENGTH_MM: 2800,
  MIN_SEGMENT_LENGTH_MM: 100,
  DEFAULT_SETBACK_MM: 40,
  FEET_TO_PLINTH_GAP_MM: 3,
  CLIPS_PER_CABINET: 2,
  FEET_PER_CABINET: 4
};

/**
 * Pobiera wysokość nóżek dla danego typu.
 */
export function getFeetHeight(feetType: FeetType): number {
  const option = FEET_TYPE_OPTIONS.find(o => o.value === feetType);
  return option?.feetHeightMm ?? 100;
}

/**
 * Pobiera wysokość cokołu dla danego typu nóżek.
 */
export function getPlinthHeight(feetType: FeetType): number {
  const option = FEET_TYPE_OPTIONS.find(o => o.value === feetType);
  return option?.plinthHeightMm ?? 97;
}
