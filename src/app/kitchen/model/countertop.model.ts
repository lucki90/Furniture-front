import { Component as CabinetComponentDto } from '../cabinet-form/model/kitchen-cabinet-form.model';

// Uwaga: opcje poniżej są zachowane jako fallback.
// Docelowo opcje ładowane są z backendu przez DictionaryService (GET /dictionaries/all-options).

/**
 * Model dla blatów kuchennych.
 */

// ============ ENUMS ============

export type CountertopMaterialType = 'LAMINATE' | 'SOLID_WOOD' | 'STONE' | 'QUARTZ_COMPOSITE' | 'COMPACT';

export const COUNTERTOP_MATERIAL_OPTIONS: { value: CountertopMaterialType; label: string; priceLevel: number }[] = [
  { value: 'LAMINATE', label: 'Laminat (standard)', priceLevel: 1 },
  { value: 'SOLID_WOOD', label: 'Lite drewno', priceLevel: 3 },
  { value: 'STONE', label: 'Kamień (granit, marmur)', priceLevel: 5 },
  { value: 'QUARTZ_COMPOSITE', label: 'Konglomerat kwarcowy', priceLevel: 4 },
  { value: 'COMPACT', label: 'Płyta kompaktowa (Corian)', priceLevel: 4 }
];

export type CountertopJointType = 'ALUMINUM_STRIP' | 'MITER_JOINT' | 'SEAMLESS' | 'NONE';

export const COUNTERTOP_JOINT_OPTIONS: { value: CountertopJointType; label: string; description: string }[] = [
  { value: 'NONE', label: 'Brak', description: 'Pojedynczy odcinek' },
  { value: 'ALUMINUM_STRIP', label: 'Listewka aluminiowa', description: 'Widoczna listewka łącząca' },
  { value: 'MITER_JOINT', label: 'Łyżwa (skos 45°)', description: 'Klejone na styk, estetyczne' },
  { value: 'SEAMLESS', label: 'Bezszwowe', description: 'Tylko dla Corian/compact' }
];

/**
 * Sposób łączenia blatów w narożniku. Spójne z backendem: `CornerJointType`.
 * - `LYZWA` — blat przechodzący dochodzi do ściany, dosuwany do jego frontu (frezowanie łyżwy),
 * - `MITER_45` — oba blaty dochodzą do ściany i są cięte po przekątnej narożnika,
 * - `ALUMINUM_STRIP` — geometria jak łyżwa, połączenie listwą aluminiową.
 */
export type CornerJointType = 'LYZWA' | 'MITER_45' | 'ALUMINUM_STRIP';

/** Nazwy sposobów łączenia blatów w narożniku (panel ściany, pozycje kosztorysu). */
export const CORNER_JOINT_TYPE_LABELS: Readonly<Record<CornerJointType, string>> = {
  LYZWA: 'Łyżwa',
  MITER_45: 'Cięcie 45°',
  ALUMINUM_STRIP: 'Listwa aluminiowa'
};

export const CORNER_JOINT_TYPE_OPTIONS: readonly { value: CornerJointType; label: string }[] = [
  { value: 'LYZWA', label: CORNER_JOINT_TYPE_LABELS.LYZWA },
  { value: 'MITER_45', label: CORNER_JOINT_TYPE_LABELS.MITER_45 },
  { value: 'ALUMINUM_STRIP', label: CORNER_JOINT_TYPE_LABELS.ALUMINUM_STRIP }
];

/**
 * Który blat przechodzi przez narożnik — z punktu widzenia ściany bocznej (LEFT/RIGHT), w której konfiguracji
 * zapisane jest połączenie. `AUTO` — reguła z układu narożnika.
 */
export type CornerPassThrough = 'AUTO' | 'THIS_WALL' | 'NEIGHBOR';

/**
 * Połączenie blatów w narożniku zapisane w konfiguracji blatu ściany bocznej narożnika. Brak pola albo wartości —
 * ustawienia domyślne (łyżwa, blat przechodzący z reguły). Spójne z backendem: `CornerJointRequest`.
 */
export interface CornerJointSettings {
  type?: CornerJointType;
  passThrough?: CornerPassThrough;
}

export type CountertopEdgeType = 'ABS_EDGE' | 'WOOD_EDGE' | 'ALUMINUM_EDGE' | 'POSTFORMED' | 'PROFILED' | 'NONE';

export const COUNTERTOP_EDGE_OPTIONS: { value: CountertopEdgeType; label: string }[] = [
  { value: 'NONE', label: 'Brak (przy ścianie)' },
  { value: 'ABS_EDGE', label: 'Oklejina ABS/PVC' },
  { value: 'WOOD_EDGE', label: 'Oklejina drewniana' },
  { value: 'ALUMINUM_EDGE', label: 'Listewka aluminiowa' },
  { value: 'POSTFORMED', label: 'Postforming (zaokrąglona)' },
  { value: 'PROFILED', label: 'Frezowana (profilowa)' }
];

export const COUNTERTOP_THICKNESS_OPTIONS: { value: number; label: string }[] = [
  { value: 28, label: '28mm' },
  { value: 38, label: '38mm (standard)' },
  { value: 40, label: '40mm' },
  { value: 60, label: '60mm (grubszy)' }
];

// ============ REQUEST ============

export interface CountertopRequest {
  enabled: boolean;
  materialType: CountertopMaterialType;
  colorCode?: string;
  thicknessMm: number;
  manualLengthMm?: number;
  manualDepthMm?: number;
  frontOverhangMm: number;
  backOverhangMm: number;
  leftOverhangMm: number;
  rightOverhangMm: number;
  jointType: CountertopJointType;
  frontEdgeType: CountertopEdgeType;
  leftEdgeType: CountertopEdgeType;
  rightEdgeType: CountertopEdgeType;
  backEdgeType: CountertopEdgeType;
  cornerJoint?: CornerJointSettings;
}

export const DEFAULT_COUNTERTOP_REQUEST: CountertopRequest = {
  enabled: true,
  materialType: 'LAMINATE',
  thicknessMm: 38,
  frontOverhangMm: 30,
  backOverhangMm: 0,
  leftOverhangMm: 0,
  rightOverhangMm: 0,
  jointType: 'NONE',
  frontEdgeType: 'ABS_EDGE',
  leftEdgeType: 'NONE',
  rightEdgeType: 'NONE',
  backEdgeType: 'NONE'
};

// ============ RESPONSE ============

export interface CountertopSegmentResponse {
  segmentIndex: number;
  lengthMm: number;
  depthMm: number;
  thicknessMm: number;
  materialType: CountertopMaterialType;
  colorCode?: string;
  positionX: number;
  positionY: number;
  leftJointType: CountertopJointType;
  rightJointType: CountertopJointType;
  frontEdgeType: CountertopEdgeType;
  leftEdgeType: CountertopEdgeType;
  rightEdgeType: CountertopEdgeType;
  backEdgeType: CountertopEdgeType;
  hasUserNotice: boolean;
  userNoticeKey?: string;
  materialCost: number;
  cuttingCost: number;
  edgingCost: number;
  totalCost: number;
}

export interface CountertopResponse {
  enabled: boolean;
  totalLengthMm: number;
  depthMm: number;
  frontOverhangMm?: number;
  backOverhangMm?: number;
  leftOverhangMm?: number;
  rightOverhangMm?: number;
  manualLengthMm?: number;
  thicknessMm: number;
  maxBaseCorpusHeightMm?: number;
  computedCountertopHeightMm?: number;
  materialType: CountertopMaterialType;
  colorCode?: string;
  jointType?: CountertopJointType;
  frontEdgeType?: CountertopEdgeType;
  leftEdgeType?: CountertopEdgeType;
  rightEdgeType?: CountertopEdgeType;
  backEdgeType?: CountertopEdgeType;
  /** Zapisane połączenie blatów w narożniku (ściana boczna narożnika); brak — ustawienia domyślne. */
  cornerJoint?: CornerJointSettings | null;
  islandSurfaceM2?: number;
  segments: CountertopSegmentResponse[];
  segmentCount: number;
  wasSplit: boolean;
  splitReason?: string;
  components: CabinetComponentDto[];
  totalMaterialCost: number;
  totalCuttingCost: number;
  totalEdgingCost: number;
  totalComponentsCost: number;
  totalCost: number;
  /** false gdy brakuje ceny w katalogu — kwoty mogą być zaniżone */
  pricingComplete?: boolean;
  /** Kody brakujących cen, np. ["COUNTERTOP.LAMINATE.MATERIAL"] */
  missingPriceEntries?: string[];
}

// ============ CONSTANTS ============

export const COUNTERTOP_CONSTANTS = {
  MAX_SEGMENT_LENGTH_MM: 4100,
  MIN_SEGMENT_LENGTH_MM: 100,
  DEFAULT_THICKNESS_MM: 38,
  DEFAULT_DEPTH_MM: 600,
  DEFAULT_FRONT_OVERHANG_MM: 30
};
