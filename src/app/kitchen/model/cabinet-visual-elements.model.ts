/**
 * Model danych dla wizualizacji elementów szafki:
 * - Cokół (plinth/toe kick)
 * - Nóżki (feet)
 * - Uchwyty (handles)
 * - Fronty (doors/drawers)
 *
 * Te dane będą używane do renderowania szczegółów szafek
 * na widoku frontalnym i z góry.
 */

// ============ COKÓŁ / NÓŻKI ============

/**
 * Typ podstawy szafki
 */
export type CabinetBaseType = 'PLINTH' | 'FEET' | 'NONE';

/**
 * Konfiguracja cokołu
 */
export interface PlinthConfig {
  height: number;       // Wysokość cokołu (mm), typowo 100-150mm
  setback: number;      // Cofnięcie od frontu (mm), typowo 30-50mm
  material: string;     // Materiał (zgodny z korpusem lub inny)
  color: string;        // Kolor
}

/**
 * Typ nóżki
 */
export type FeetType = 'ROUND' | 'SQUARE' | 'ADJUSTABLE';

/**
 * Konfiguracja nóżek
 */
export interface FeetConfig {
  type: FeetType;
  height: number;       // Wysokość regulowana (mm), typowo 100-150mm
  quantity: number;     // Ilość nóżek
  color: string;        // Kolor (czarny, srebrny, biały)
}

// ============ UCHWYTY ============

/**
 * Typ uchwytu
 */
export type HandleType =
  | 'BAR'           // Reling / uchwyt listwowy
  | 'KNOB'          // Gałka
  | 'SHELL'         // Muszelka
  | 'EDGE'          // Uchwyt krawędziowy (frezowany w płycie)
  | 'INTEGRATED'    // Zintegrowany w froncie
  | 'PUSH_TO_OPEN'  // Bez uchwytu - system tip-on
  | 'NONE';         // Brak

/**
 * Pozycja uchwytu na froncie
 */
export type HandlePosition = 'TOP' | 'MIDDLE' | 'BOTTOM' | 'CENTER';

/**
 * Orientacja uchwytu
 */
export type HandleOrientation = 'HORIZONTAL' | 'VERTICAL';

/**
 * Konfiguracja uchwytu
 */
export interface HandleConfig {
  type: HandleType;
  model?: string;       // Model/nazwa uchwytu
  length?: number;      // Długość (mm) - dla typu BAR
  position: HandlePosition;
  orientation: HandleOrientation;
  color: string;        // Kolor (chrom, złoto, czarny mat, etc.)
  offsetFromEdge: number; // Odległość od krawędzi frontu (mm)
}

// ============ FRONTY ============

/**
 * Typ frontu
 */
export type FrontType =
  | 'DOOR_SINGLE'     // Pojedyncze drzwi
  | 'DOOR_DOUBLE'     // Podwójne drzwi
  | 'DRAWER'          // Szuflada
  | 'FLAP_UP'         // Klapa podnoszona do góry
  | 'FLAP_DOWN'       // Klapa opuszczana
  | 'GLASS'           // Przeszklenie
  | 'OPEN';           // Otwarty (bez frontu)

/**
 * Kierunek otwierania drzwi
 */
export type DoorOpeningDirection = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

/**
 * Pojedynczy front (drzwi lub szuflada)
 */
export interface FrontElement {
  type: FrontType;
  width: number;        // Szerokość frontu (mm)
  height: number;       // Wysokość frontu (mm)
  positionX: number;    // Pozycja X od lewej krawędzi szafki (mm)
  positionY: number;    // Pozycja Y od dołu szafki (mm)
  openingDirection?: DoorOpeningDirection;
  handle?: HandleConfig;
  material: string;     // Materiał frontu
  color: string;        // Kolor frontu
  isGlass?: boolean;    // Czy przeszklony
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

  // Domyślne uchwyty (jeśli nie określone per front)
  defaultHandle?: HandleConfig;
}

// ============ STAŁE DOMYŚLNE ============

export const DEFAULT_PLINTH_CONFIG: PlinthConfig = {
  height: 100,
  setback: 40,
  material: 'CHIPBOARD',
  color: 'WHITE'
};

export const DEFAULT_FEET_CONFIG: FeetConfig = {
  type: 'ADJUSTABLE',
  height: 100,
  quantity: 4,
  color: 'BLACK'
};

export const DEFAULT_HANDLE_CONFIG: HandleConfig = {
  type: 'BAR',
  length: 128,
  position: 'TOP',
  orientation: 'HORIZONTAL',
  color: 'CHROME',
  offsetFromEdge: 30
};

// ============ HELPER FUNCTIONS ============

/**
 * Generuje domyślną konfigurację frontów dla szafki
 */
export function generateDefaultFronts(
  cabinetWidth: number,
  cabinetHeight: number,
  frontType: 'ONE_DOOR' | 'TWO_DOORS' | 'DRAWERS',
  drawerCount?: number
): FrontElement[] {
  const fronts: FrontElement[] = [];
  const gap = 3; // Szczelina między frontami (mm)

  switch (frontType) {
    case 'ONE_DOOR':
      fronts.push({
        type: 'DOOR_SINGLE',
        width: cabinetWidth - 2 * gap,
        height: cabinetHeight - 2 * gap,
        positionX: gap,
        positionY: gap,
        openingDirection: 'LEFT',
        material: 'CHIPBOARD',
        color: 'WHITE'
      });
      break;

    case 'TWO_DOORS':
      const doorWidth = (cabinetWidth - 3 * gap) / 2;
      fronts.push({
        type: 'DOOR_SINGLE',
        width: doorWidth,
        height: cabinetHeight - 2 * gap,
        positionX: gap,
        positionY: gap,
        openingDirection: 'LEFT',
        material: 'CHIPBOARD',
        color: 'WHITE'
      });
      fronts.push({
        type: 'DOOR_SINGLE',
        width: doorWidth,
        height: cabinetHeight - 2 * gap,
        positionX: doorWidth + 2 * gap,
        positionY: gap,
        openingDirection: 'RIGHT',
        material: 'CHIPBOARD',
        color: 'WHITE'
      });
      break;

    case 'DRAWERS':
      const count = drawerCount ?? 3;
      const drawerHeight = (cabinetHeight - (count + 1) * gap) / count;
      for (let i = 0; i < count; i++) {
        fronts.push({
          type: 'DRAWER',
          width: cabinetWidth - 2 * gap,
          height: drawerHeight,
          positionX: gap,
          positionY: gap + i * (drawerHeight + gap),
          material: 'CHIPBOARD',
          color: 'WHITE'
        });
      }
      break;
  }

  return fronts;
}

/**
 * Oblicza wysokość użytkową szafki (bez cokołu/nóżek)
 */
export function getUsableHeight(
  totalHeight: number,
  baseType: CabinetBaseType,
  plinthHeight?: number,
  feetHeight?: number
): number {
  switch (baseType) {
    case 'PLINTH':
      return totalHeight - (plinthHeight ?? DEFAULT_PLINTH_CONFIG.height);
    case 'FEET':
      return totalHeight - (feetHeight ?? DEFAULT_FEET_CONFIG.height);
    case 'NONE':
    default:
      return totalHeight;
  }
}
