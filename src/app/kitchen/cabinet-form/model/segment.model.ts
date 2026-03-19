/**
 * Typ segmentu w szafce wielosegmentowej (np. słupek).
 */
export enum SegmentType {
  DRAWER = 'DRAWER',          // Segment z szufladami
  DOOR = 'DOOR',              // Segment z drzwiami
  OPEN_SHELF = 'OPEN_SHELF',  // Segment otwarty (bez frontu)
  OVEN = 'OVEN',              // Wnęka na piekarnik (bez frontu, bez półek)
  MICROWAVE = 'MICROWAVE'     // Wnęka na mikrofalówkę (bez frontu, bez półek)
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
    drawerFrontDetails: any | null;
  } | null;
  shelfQuantity?: number | null;
  frontType?: string | null;
}

/**
 * Opcje typu segmentu do wyświetlenia w formularzu.
 */
export const SEGMENT_TYPE_OPTIONS: { value: SegmentType; label: string; icon: string }[] = [
  { value: SegmentType.DRAWER, label: 'Szuflady', icon: '🗄️' },
  { value: SegmentType.DOOR, label: 'Drzwi', icon: '🚪' },
  { value: SegmentType.OPEN_SHELF, label: 'Otwarte półki', icon: '📚' },
  { value: SegmentType.OVEN, label: 'Piekarnik (wnęka)', icon: '🔥' },
  { value: SegmentType.MICROWAVE, label: 'Mikrofalówka (wnęka)', icon: '📡' }
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
  [SegmentType.DRAWER]: '#3498db',    // niebieski
  [SegmentType.DOOR]: '#27ae60',      // zielony
  [SegmentType.OPEN_SHELF]: '#95a5a6', // szary
  [SegmentType.OVEN]: '#e74c3c',      // czerwony — piekarnik
  [SegmentType.MICROWAVE]: '#e67e22'  // pomarańczowy — mikrofalówka
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
    case SegmentType.MICROWAVE:
      // Wnęki AGD — bez frontu, bez półek (sprzęt zajmuje całą wnękę)
      request.frontType = 'OPEN';
      request.shelfQuantity = 0;
      request.drawerRequest = null;
      break;
  }

  return request;
}
