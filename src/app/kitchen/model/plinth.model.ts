import { Component as CabinetComponentDto } from '../cabinet-form/model/kitchen-cabinet-form.model';

// Uwaga: opcje poniżej są zachowane jako fallback.
// Docelowo opcje ładowane są z backendu przez DictionaryService (GET /dictionaries/all-options).

/**
 * Model dla cokołów i nóżek kuchennych.
 */

// ============ ENUMS ============

export type FeetType = 'FEET_100' | 'FEET_120' | 'FEET_150';

export interface FeetOption {
  value: FeetType;
  label: string;
  nominalHeightMm: number;
  minHeightMm: number;
  maxHeightMm: number;
}

export const FEET_TYPE_OPTIONS: FeetOption[] = [
  { value: 'FEET_100', label: 'Nóżki nominal 100mm (regulacja 90-120mm)', nominalHeightMm: 100, minHeightMm: 90, maxHeightMm: 120 },
  { value: 'FEET_120', label: 'Nóżki nominal 120mm (regulacja 100-140mm)', nominalHeightMm: 120, minHeightMm: 100, maxHeightMm: 140 },
  { value: 'FEET_150', label: 'Nóżki nominal 150mm (regulacja 130-170mm)', nominalHeightMm: 150, minHeightMm: 130, maxHeightMm: 170 }
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
  heightMm: number;
  feetType?: FeetType;
  materialType: PlinthMaterialType;
  colorCode?: string;
  setbackMm: number;
  manualLengthMm?: number;
}

export const DEFAULT_PLINTH_REQUEST: PlinthRequest = {
  enabled: true,
  heightMm: 100,
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
  feetType?: FeetType;
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
  components: CabinetComponentDto[];
  totalFeetCount: number;
  totalMountingClipCount: number;
  totalMaterialCost: number;
  totalCuttingCost: number;
  totalComponentsCost: number;
  totalCost: number;
  /** false gdy brakuje ceny w katalogu — kwoty mogą być zaniżone */
  pricingComplete?: boolean;
  /** Kody brakujących cen, np. ["PLINTH.PVC.MATERIAL"] */
  missingPriceEntries?: string[];
}

// ============ CONSTANTS ============

export const PLINTH_CONSTANTS = {
  MAX_SEGMENT_LENGTH_MM: 2800,
  MIN_SEGMENT_LENGTH_MM: 100,
  DEFAULT_SETBACK_MM: 40,
  CLIPS_PER_CABINET: 2,
  FEET_PER_CABINET: 4
};

/**
 * Pobiera nominalną wysokość modelu nóżek.
 */
export function getFeetHeight(feetType: FeetType): number {
  const option = FEET_TYPE_OPTIONS.find(o => o.value === feetType);
  return option?.nominalHeightMm ?? 100;
}

/**
 * Nominalna wysokość cokołu dla danego modelu nóg.
 * Uwaga: kanoniczna wysokość cokołu projektu jest teraz ustawiana niezależnie
 * i może mieścić się w zakresie regulacji wybranego modelu nóżek.
 *
 * @deprecated Używaj kanonicznej wysokości projektu (`heightMm` / `plinthHeightMm`).
 * Ten helper zwraca tylko nominalny wymiar modelu nóżek.
 */
export function getPlinthHeight(feetType: FeetType): number {
  const option = FEET_TYPE_OPTIONS.find(o => o.value === feetType);
  return option?.nominalHeightMm ?? 100;
}

/**
 * Dobiera model nóg do zadanej wysokości cokołu.
 * Preferuje modele, których zakres regulacji zawiera żądaną wysokość.
 * Przy remisie wybiera model, którego nominal jest najbliżej żądanej wartości,
 * z lekką karą za wartości leżące przy samym brzegu zakresu regulacji.
 */
export function pickFeetTypeForPlinthHeight(heightMm: number): FeetType {
  const candidates = FEET_TYPE_OPTIONS
    .filter(option => heightMm >= option.minHeightMm && heightMm <= option.maxHeightMm)
    .map(option => {
      const distanceToNominal = Math.abs(option.nominalHeightMm - heightMm);
      const distanceToNearestEdge = Math.min(
        Math.abs(heightMm - option.minHeightMm),
        Math.abs(option.maxHeightMm - heightMm)
      );
      const penaltyIfNearEdge = distanceToNearestEdge <= 5 ? 10 : distanceToNearestEdge <= 10 ? 5 : 0;
      return {
        option,
        score: distanceToNominal + penaltyIfNearEdge
      };
    })
    .sort((a, b) => a.score - b.score || a.option.nominalHeightMm - b.option.nominalHeightMm);

  if (candidates.length > 0) {
    return candidates[0].option.value;
  }

  if (heightMm < FEET_TYPE_OPTIONS[0].minHeightMm) {
    return FEET_TYPE_OPTIONS[0].value;
  }

  return FEET_TYPE_OPTIONS[FEET_TYPE_OPTIONS.length - 1].value;
}

export function getFeetOptionForPlinthHeight(heightMm: number): FeetOption {
  const picked = pickFeetTypeForPlinthHeight(heightMm);
  return FEET_TYPE_OPTIONS.find(option => option.value === picked) ?? FEET_TYPE_OPTIONS[0];
}
