/**
 * Model elementów wizualnych szafki kuchennej.
 * Przygotowanie pod przyszłą wizualizację: cokoły, nóżki, uchwyty, fronty.
 */

// ============ PODSTAWA SZAFKI (COKÓŁ / NÓŻKI) ============

/**
 * Typ podstawy szafki - cokół lub nóżki
 */
export type CabinetBaseType = 'PLINTH' | 'FEET' | 'NONE';

/**
 * Konfiguracja cokołu (listwy maskującej nóżki)
 */
export interface PlinthConfig {
  height: number;       // Wysokość cokołu (typowo 100-150mm)
  setback: number;      // Cofnięcie od frontu (typowo 30-50mm)
  material?: string;    // Materiał (np. 'PVC', 'MDF', 'ALUMINIUM')
  color?: string;       // Kolor (hex lub nazwa)
}

/**
 * Konfiguracja nóżek (bez cokołu)
 */
export interface FeetConfig {
  type: 'ADJUSTABLE' | 'FIXED' | 'CASTER';  // Typ nóżek
  height: number;       // Wysokość nóżek (typowo 100-150mm)
  quantity: number;     // Ilość nóżek (typowo 4)
  color?: string;       // Kolor nóżek
}

// ============ UCHWYTY ============

/**
 * Typ uchwytu
 */
export type HandleType =
  | 'BAR'           // Uchwyt listwowy (relingowy)
  | 'KNOB'          // Gałka
  | 'SHELL'         // Uchwyt muszlowy
  | 'EDGE'          // Uchwyt krawędziowy (na górnej krawędzi frontu)
  | 'INTEGRATED'    // Uchwyt zintegrowany (frezowanie w froncie)
  | 'PUSH_TO_OPEN'  // System push-to-open (bez widocznego uchwytu)
  | 'NONE';         // Brak uchwytu

/**
 * Pozycja uchwytu na froncie
 */
export type HandlePosition = 'TOP' | 'MIDDLE' | 'BOTTOM' | 'SIDE_LEFT' | 'SIDE_RIGHT';

/**
 * Orientacja uchwytu
 */
export type HandleOrientation = 'HORIZONTAL' | 'VERTICAL';

/**
 * Konfiguracja uchwytu
 */
export interface HandleConfig {
  type: HandleType;
  length?: number;              // Długość uchwytu w mm (dla BAR, SHELL)
  position: HandlePosition;     // Pozycja na froncie
  orientation: HandleOrientation;
  color?: string;               // Kolor uchwytu
  offsetFromEdge?: number;      // Odległość od krawędzi w mm
}

// ============ FRONTY ============

/**
 * Typ frontu
 */
export type FrontType =
  | 'DOOR_SINGLE'    // Drzwi pojedyncze
  | 'DOOR_DOUBLE'    // Drzwi podwójne (otwierane na boki)
  | 'DRAWER'         // Front szuflady
  | 'FLAP_UP'        // Klapa podnoszona do góry
  | 'FLAP_DOWN'      // Klapa opuszczana w dół
  | 'GLASS'          // Front szklany
  | 'OPEN';          // Otwarta półka (bez frontu)

/**
 * Element frontu (pojedyncze drzwi/szuflada)
 */
export interface FrontElement {
  type: FrontType;
  width: number;        // Szerokość frontu w mm
  height: number;       // Wysokość frontu w mm
  positionX: number;    // Pozycja X względem lewej krawędzi szafki
  positionY: number;    // Pozycja Y względem dolnej krawędzi szafki
  handle?: HandleConfig; // Konfiguracja uchwytu dla tego frontu
  hingesSide?: 'LEFT' | 'RIGHT';  // Strona zawiasów (dla drzwi)
}

// ============ KOMPLETNA KONFIGURACJA WIZUALNA ============

/**
 * Kompletna konfiguracja wizualna szafki
 */
export interface CabinetVisualConfig {
  // Podstawa
  baseType: CabinetBaseType;
  plinth?: PlinthConfig;
  feet?: FeetConfig;

  // Fronty
  fronts: FrontElement[];

  // Domyślny uchwyt (jeśli wszystkie fronty mają ten sam)
  defaultHandle?: HandleConfig;

  // Dodatkowe opcje wizualne
  hasCountertop?: boolean;    // Czy szafka ma blat na górze
  countertopOverhang?: number; // Wysunięcie blatu w mm
}

// ============ WARTOŚCI DOMYŚLNE ============

export const DEFAULT_PLINTH_CONFIG: PlinthConfig = {
  height: 100,
  setback: 40,
  material: 'PVC',
  color: '#333333'
};

export const DEFAULT_FEET_CONFIG: FeetConfig = {
  type: 'ADJUSTABLE',
  height: 100,
  quantity: 4,
  color: '#666666'
};

export const DEFAULT_HANDLE_CONFIG: HandleConfig = {
  type: 'BAR',
  length: 128,
  position: 'TOP',
  orientation: 'HORIZONTAL',
  color: '#C0C0C0',
  offsetFromEdge: 30
};

// ============ FUNKCJE POMOCNICZE ============

/**
 * Generuje domyślne fronty dla szafki na podstawie jej typu i wymiarów.
 * W przyszłości będzie rozbudowane o logikę dla różnych typów szafek.
 */
export function generateDefaultFronts(
  cabinetType: string,
  width: number,
  height: number,
  drawerQuantity?: number
): FrontElement[] {
  const fronts: FrontElement[] = [];
  const gap = 3; // Szczelina między frontami

  switch (cabinetType) {
    case 'BASE_ONE_DOOR':
      fronts.push({
        type: 'DOOR_SINGLE',
        width: width - gap * 2,
        height: height - gap * 2,
        positionX: gap,
        positionY: gap,
        hingesSide: 'LEFT'
      });
      break;

    case 'BASE_TWO_DOOR':
      const doorWidth = (width - gap * 3) / 2;
      fronts.push(
        {
          type: 'DOOR_SINGLE',
          width: doorWidth,
          height: height - gap * 2,
          positionX: gap,
          positionY: gap,
          hingesSide: 'LEFT'
        },
        {
          type: 'DOOR_SINGLE',
          width: doorWidth,
          height: height - gap * 2,
          positionX: gap * 2 + doorWidth,
          positionY: gap,
          hingesSide: 'RIGHT'
        }
      );
      break;

    case 'BASE_WITH_DRAWERS':
      const drawerCount = drawerQuantity || 3;
      const drawerHeight = (height - gap * (drawerCount + 1)) / drawerCount;
      for (let i = 0; i < drawerCount; i++) {
        fronts.push({
          type: 'DRAWER',
          width: width - gap * 2,
          height: drawerHeight,
          positionX: gap,
          positionY: gap + i * (drawerHeight + gap)
        });
      }
      break;

    default:
      // Domyślnie pojedyncze drzwi
      fronts.push({
        type: 'DOOR_SINGLE',
        width: width - gap * 2,
        height: height - gap * 2,
        positionX: gap,
        positionY: gap,
        hingesSide: 'LEFT'
      });
  }

  return fronts;
}

/**
 * Oblicza wysokość użytkową szafki (bez cokołu/nóżek i blatu)
 */
export function getUsableHeight(
  totalHeight: number,
  baseConfig: PlinthConfig | FeetConfig | null,
  hasCountertop: boolean,
  countertopThickness: number = 40
): number {
  let usable = totalHeight;

  // Odejmij podstawę
  if (baseConfig) {
    usable -= baseConfig.height;
  }

  // Odejmij blat
  if (hasCountertop) {
    usable -= countertopThickness;
  }

  return usable;
}
