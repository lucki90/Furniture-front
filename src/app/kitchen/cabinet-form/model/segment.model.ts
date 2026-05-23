import { DrawerFrontDetail } from './kitchen-cabinet-form.model';

/**
 * Typ segmentu w szafce wielosegmentowej (np. słupek).
 */
export enum SegmentType {
  DRAWER = 'DRAWER',                    // Segment z szufladami
  DOOR = 'DOOR',                        // Segment z drzwiami
  OPEN_SHELF = 'OPEN_SHELF',            // Segment otwarty (bez frontu)
  OVEN = 'OVEN',                        // Wnęka na piekarnik (bez frontu, bez półek)
  MICROWAVE = 'MICROWAVE',              // Wnęka na mikrofalówkę (bez frontu, bez półek)
  FRIDGE_BUILT_IN = 'FRIDGE_BUILT_IN'  // Sekcja lodówki w zabudowie (wewnętrzny typ, nie w UI)
}

/**
 * Typ frontu dla segmentu.
 */
export enum SegmentFrontType {
  ONE_DOOR = 'ONE_DOOR',
  TWO_DOORS = 'TWO_DOORS',
  DRAWER = 'DRAWER',
  OPEN = 'OPEN'
}

/**
 * Typ wnęki piekarnika dla segmentu OVEN (analogicznie do BASE_OVEN).
 * STANDARD = 600mm wnęka (typowy piekarnik), COMPACT = 455mm (kompaktowy).
 */
export type OvenSegmentHeightType = 'STANDARD' | 'COMPACT';

/**
 * Wnęka piekarnika w mm dla danego typu.
 */
export const OVEN_SLOT_HEIGHT_MM: Record<OvenSegmentHeightType, number> = {
  STANDARD: 600,
  COMPACT: 455
};

/**
 * Dane segmentu w formularzu.
 */
export interface SegmentFormData {
  segmentType: SegmentType;
  height: number;
  orderIndex: number;
  // Dla DRAWER
  drawerQuantity?: number;
  drawerModel?: string;
  // Dla DOOR i OPEN_SHELF
  shelfQuantity?: number;
  frontType?: SegmentFrontType;
  // Dla OVEN: typ wnęki piekarnika — gdy ustawiony, walidator wymusza minimalną wysokość segmentu
  ovenHeightType?: OvenSegmentHeightType | null;
}

/**
 * Request segmentu wysyłany do API.
 */
export interface SegmentRequest {
  segmentType: SegmentType;
  height: number;
  orderIndex: number;
  drawerRequest?: {
    drawerQuantity: number;
    drawerModel: string;
    drawerBaseHdf: boolean;
    drawerFrontDetails: DrawerFrontDetail[] | null;
  } | null;
  shelfQuantity?: number | null;
  frontType?: string | null;
  ovenHeightType?: OvenSegmentHeightType | null;
}

/**
 * Opcje typu segmentu do wyświetlenia w formularzu.
 */
export const SEGMENT_TYPE_OPTIONS: { value: SegmentType; label: string; icon: string }[] = [
  { value: SegmentType.DRAWER, label: 'Szuflady', icon: 'SZ' },
  { value: SegmentType.DOOR, label: 'Drzwi', icon: 'DR' },
  { value: SegmentType.OPEN_SHELF, label: 'Otwarte polki', icon: 'OP' },
  { value: SegmentType.OVEN, label: 'Piekarnik (wneka)', icon: 'PI' },
  { value: SegmentType.MICROWAVE, label: 'Mikrofalowka (wneka)', icon: 'MI' }
];

/**
 * Opcje typu frontu dla segmentu DOOR.
 */
export const DOOR_FRONT_TYPE_OPTIONS: { value: SegmentFrontType; label: string }[] = [
  { value: SegmentFrontType.ONE_DOOR, label: 'Jedne drzwi' },
  { value: SegmentFrontType.TWO_DOORS, label: 'Dwoje drzwi' }
];

/**
 * Kolory dla wizualizacji segmentów.
 */
export const SEGMENT_COLORS: Record<SegmentType, string> = {
  [SegmentType.DRAWER]: '#3498db',             // niebieski
  [SegmentType.DOOR]: '#27ae60',               // zielony
  [SegmentType.OPEN_SHELF]: '#95a5a6',          // szary
  [SegmentType.OVEN]: '#e74c3c',               // czerwony — piekarnik
  [SegmentType.MICROWAVE]: '#e67e22',           // pomarańczowy — mikrofalówka
  [SegmentType.FRIDGE_BUILT_IN]: '#7986cb'     // indigo — lodówka w zabudowie
};

/**
 * Helper do mapowania SegmentFormData na SegmentRequest.
 */
export function mapSegmentToRequest(segment: SegmentFormData): SegmentRequest {
  const request: SegmentRequest = {
    segmentType: segment.segmentType,
    height: segment.height,
    orderIndex: segment.orderIndex,
    shelfQuantity: null,
    frontType: null,
    drawerRequest: null
  };

  switch (segment.segmentType) {
    case SegmentType.DRAWER:
      request.frontType = 'DRAWER';
      request.drawerRequest = {
        drawerQuantity: segment.drawerQuantity ?? 3,
        drawerModel: segment.drawerModel ?? 'ANTARO_TANDEMBOX',
        drawerBaseHdf: false,
        drawerFrontDetails: null
      };
      break;

    case SegmentType.DOOR:
      request.frontType = segment.frontType ?? SegmentFrontType.ONE_DOOR;
      request.shelfQuantity = segment.shelfQuantity ?? 0;
      break;

    case SegmentType.OPEN_SHELF:
      request.frontType = 'OPEN';
      request.shelfQuantity = segment.shelfQuantity ?? 0;
      break;

    case SegmentType.OVEN:
      // Wnęka piekarnika — bez frontu, bez półek; propaguj ovenHeightType (STANDARD/COMPACT/null)
      request.frontType = 'OPEN';
      request.shelfQuantity = 0;
      request.drawerRequest = null;
      request.ovenHeightType = segment.ovenHeightType ?? null;
      break;

    case SegmentType.MICROWAVE:
      // Wnęka mikrofalówki — bez frontu, bez półek, bez ovenHeightType
      request.frontType = 'OPEN';
      request.shelfQuantity = 0;
      request.drawerRequest = null;
      break;
  }

  return request;
}
