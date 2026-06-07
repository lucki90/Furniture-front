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
  cargoVariant?: string;
  pantryPassageFrontType?: string;
  pantryAttachedPlinthHeightPx?: number;
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
  /**
   * Konfiguracja szafki narożnej (Faza 11.4) — steruje widokiem frontu w elewacji.
   * Type A (L-shape): TWO_DOORS / BIFOLD. Type B (blind): front uchylny + ślepy panel.
   * Dotyczy zarówno dolnej, jak i górnej (UPPER_CORNER jako wariant `isUpperCorner`) szafki narożnej.
   */
  cornerConfig?: {
    /** true = Type B (ślepy narożnik / Magic Corner / Le Mans). */
    blind: boolean;
    /** Type A: 'TWO_DOORS' | 'BIFOLD'. */
    openingType?: string;
    /** Szerokość ramienia głównego (widthA) w mm — baza do proporcji frontu czołowego. */
    widthAMm?: number;
    /** Type A: szerokość ramienia bocznego (widthB) w mm — drugi front prostopadły (niewidoczny w elewacji). */
    widthBMm?: number;
    /** Type B: szerokość frontu uchylnego (otwieranego) w mm. */
    frontUchylnyWidthMm?: number;
    /**
     * Strona styku/narożnika wewnętrznego ('LEFT' | 'RIGHT' | null).
     * Type B: strona aktywnego (uchylnego) frontu.
     * Type A: strona, po której znajduje się ramię prostopadłe (bok szafki w elewacji).
     */
    handedness?: string | null;
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
