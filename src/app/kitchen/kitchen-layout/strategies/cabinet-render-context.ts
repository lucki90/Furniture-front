import { SegmentFormData } from '../../cabinet-form/model/segment.model';

/**
 * Element frontu przeskalowany do wyświetlania.
 * Wspólna definicja używana przez komponent i strategii renderowania.
 */
export interface DisplayFront {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hingesSide?: 'LEFT' | 'RIGHT';
}

/**
 * Uchwyt przeskalowany do wyświetlania.
 * Wspólna definicja używana przez komponent i strategii renderowania.
 */
export interface DisplayHandle {
  type: 'BAR' | 'KNOB';
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
}

/**
 * Kontekst renderowania szafki — dane potrzebne do generowania elementów wizualnych.
 * Przekazywany do każdej strategii renderowania przez CABINET_RENDER_REGISTRY.
 */
export interface CabinetRenderContext {
  displayX: number;
  bodyY: number;
  displayWidth: number;
  bodyHeight: number;
  /** Stała FRONT_GAP = 1px — odstęp wewnętrzny frontu od krawędzi korpusu. */
  frontGap: number;
  /** SCALE_VERT() — skala pionowa mm→px, potrzebna dla piekarnika (oven slot height). */
  scaleVert: number;
  // Dane specyficzne dla typów
  drawerQuantity?: number;
  segments?: SegmentFormData[];
  shelfQuantity?: number;
  cascadeLowerHeight?: number;
  cascadeUpperHeight?: number;
  ovenConfig?: {
    ovenHeightType?: string;
    ovenLowerSectionType?: string;
    ovenApronEnabled?: boolean;
    ovenApronHeightMm?: number;
  };
  fridgeConfig?: {
    fridgeSectionType?: string;
    lowerFrontHeightMm?: number;
    fridgeFreestandingType?: string;
    heightMm?: number;
    upperSections?: SegmentFormData[];
  };
}

/**
 * Typ funkcji renderującej elementy wizualne szafki.
 * Każda strategia renderowania implementuje ten kontrakt.
 */
export type CabinetRenderer = (
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
) => void;
