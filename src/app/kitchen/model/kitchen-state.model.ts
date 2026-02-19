import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { OpeningType } from '../cabinet-form/model/kitchen-cabinet-constants';
import { WallType } from './kitchen-project.model';
import { SegmentFormData } from '../cabinet-form/model/segment.model';
import { CornerMechanismType } from '../cabinet-form/model/corner-cabinet.model';
import { CabinetVisualConfig } from '../cabinet-form/model/cabinet-visual-elements.model';

/**
 * Strefa pozycjonowania szafki:
 * - BOTTOM: szafka dolna (zajmuje tylko dolny rząd)
 * - TOP: szafka górna/wisząca (zajmuje tylko górny rząd)
 * - FULL: słupek/lodówka (zajmuje oba rzędy - dolny i górny)
 */
export type CabinetZone = 'BOTTOM' | 'TOP' | 'FULL';

/**
 * Progi wysokości dla automatycznego określenia strefy:
 * - positionY < HANGING_THRESHOLD → BOTTOM
 * - positionY >= HANGING_THRESHOLD → TOP
 * - height > TALL_CABINET_MIN_HEIGHT → FULL (nadpisuje powyższe)
 */
export const ZONE_THRESHOLDS = {
  HANGING_THRESHOLD: 800,     // mm - od tej wysokości szafka jest uznawana za górną
  TALL_CABINET_MIN_HEIGHT: 1800  // mm - minimalna wysokość słupka/lodówki
} as const;

export interface KitchenCabinet {
  id: string;
  name?: string; // opcjonalna nazwa szafki
  type: KitchenCabinetType;
  openingType: OpeningType;
  width: number;
  height: number;
  depth: number;
  positionY: number; // wysokość od podłogi (0 = dolna, np. 1400 = wisząca)
  shelfQuantity: number;
  drawerQuantity?: number; // ilość szuflad (dla typu BASE_WITH_DRAWERS)
  drawerModel?: string; // system szuflad (ANTARO_TANDEMBOX, SEVROLL_BALL)
  segments?: SegmentFormData[]; // segmenty (dla typu TALL_CABINET)

  // Pola dla szafki narożnej (CORNER_CABINET)
  cornerWidthA?: number;  // Szerokość na ścianie A (głównej)
  cornerWidthB?: number;  // Szerokość na ścianie B (bocznej)
  cornerMechanism?: CornerMechanismType;  // Typ mechanizmu (Magic Corner, karuzela, itp.)
  cornerShelfQuantity?: number;  // Liczba półek (dla FIXED_SHELVES)
  isUpperCorner?: boolean;  // true = górna wisząca, false = dolna

  // Konfiguracja wizualna (cokoły, nóżki, uchwyty, fronty)
  visualConfig?: CabinetVisualConfig;

  calculatedResult?: CabinetCalculationResult;
}

/**
 * Określa strefę szafki na podstawie jej parametrów.
 */
export function getCabinetZone(cabinet: KitchenCabinet): CabinetZone {
  // Słupek/lodówka - bardzo wysoka szafka
  if (cabinet.height >= ZONE_THRESHOLDS.TALL_CABINET_MIN_HEIGHT) {
    return 'FULL';
  }
  // Szafka górna - pozycja Y powyżej progu
  if (cabinet.positionY >= ZONE_THRESHOLDS.HANGING_THRESHOLD) {
    return 'TOP';
  }
  // Domyślnie szafka dolna
  return 'BOTTOM';
}

export interface CabinetCalculationResult {
  totalCost: number;
  boardCosts: number;
  componentCosts: number;
  jobCosts: number;
}

export interface KitchenWallConfig {
  length: number;
  height: number;
}

/**
 * Reprezentacja ściany z szafkami w stanie aplikacji.
 * Używana do zarządzania wieloma ścianami w projekcie kuchni.
 */
export interface WallWithCabinets {
  id: string;
  type: WallType;
  widthMm: number;
  heightMm: number;
  cabinets: KitchenCabinet[];
}

export interface CabinetPosition {
  cabinetId: string;
  name?: string;
  x: number;
  y: number; // pozycja Y (wysokość od podłogi)
  width: number;
  height: number;
}

export interface CabinetFormData {
  name?: string;
  kitchenCabinetType: KitchenCabinetType;
  openingType: OpeningType;
  width: number;
  height: number;
  depth: number;
  positionY: number;
  shelfQuantity: number;
  drawerQuantity?: number;
  drawerModel?: string | null;
  segments?: SegmentFormData[];  // dla TALL_CABINET

  // Pola dla szafki narożnej (CORNER_CABINET)
  cornerWidthA?: number;
  cornerWidthB?: number;
  cornerMechanism?: CornerMechanismType;
  cornerShelfQuantity?: number;
  isUpperCorner?: boolean;

  // Konfiguracja wizualna (cokoły, nóżki, uchwyty, fronty)
  visualConfig?: CabinetVisualConfig;
}

export interface CabinetCalculatedEvent {
  formData: CabinetFormData;
  result: any;
  editingCabinetId?: string;
}
