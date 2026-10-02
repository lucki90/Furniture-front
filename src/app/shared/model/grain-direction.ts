/** Kierunek słoja w osiach formatki — nadaje backend (`BoardDto.grainAxis`). */
export type GrainAxis = 'ALONG_SIDE_X' | 'ALONG_SIDE_Y' | 'ANY';

export type FrontGrainDirection = 'ALONG_HEIGHT' | 'ALONG_WIDTH' | 'ANY';
export type SideGrainDirection = 'ALONG_HEIGHT' | 'ALONG_DEPTH' | 'ANY';
export type PanelGrainDirection = 'ALONG_WIDTH' | 'ALONG_DEPTH' | 'ANY';

/** Kierunki słoja frontów, boków i płyt poziomych; `null` w projekcie oznacza ustawienie użytkownika. */
export interface GrainDirections {
  front: FrontGrainDirection | null;
  side: SideGrainDirection | null;
  panel: PanelGrainDirection | null;
}

export interface EffectiveGrainDirections {
  front: FrontGrainDirection;
  side: SideGrainDirection;
  panel: PanelGrainDirection;
}

/** Jak `GrainDirections.DEFAULT` w backendzie: fronty i boki pionowo, płyty poziome wzdłuż szerokości szafki. */
export const DEFAULT_GRAIN_DIRECTIONS: EffectiveGrainDirections = {
  front: 'ALONG_HEIGHT',
  side: 'ALONG_HEIGHT',
  panel: 'ALONG_WIDTH'
};

export const NO_GRAIN_OVERRIDE: GrainDirections = { front: null, side: null, panel: null };

export interface GrainOption<T> {
  value: T;
  label: string;
}

export const FRONT_GRAIN_OPTIONS: readonly GrainOption<FrontGrainDirection>[] = [
  { value: 'ALONG_HEIGHT', label: 'Pionowo — wzdłuż wysokości' },
  { value: 'ALONG_WIDTH', label: 'Poziomo — wzdłuż szerokości' },
  { value: 'ANY', label: 'Dowolny' }
];

export const SIDE_GRAIN_OPTIONS: readonly GrainOption<SideGrainDirection>[] = [
  { value: 'ALONG_HEIGHT', label: 'Pionowo — wzdłuż wysokości' },
  { value: 'ALONG_DEPTH', label: 'Poziomo — wzdłuż głębokości' },
  { value: 'ANY', label: 'Dowolny' }
];

export const PANEL_GRAIN_OPTIONS: readonly GrainOption<PanelGrainDirection>[] = [
  { value: 'ALONG_WIDTH', label: 'Wzdłuż szerokości szafki' },
  { value: 'ALONG_DEPTH', label: 'Wzdłuż głębokości szafki' },
  { value: 'ANY', label: 'Dowolny' }
];

export function grainOptionLabel<T>(options: readonly GrainOption<T>[], value: T): string {
  return options.find(option => option.value === value)?.label ?? String(value);
}

/** Ustawienia użytkownika z odpowiedzi API; brakujące pola (starszy backend) przyjmują wartości domyślne. */
export function userGrainDirections(settings: {
  frontGrainDirection?: FrontGrainDirection | null;
  sideGrainDirection?: SideGrainDirection | null;
  panelGrainDirection?: PanelGrainDirection | null;
}): EffectiveGrainDirections {
  return {
    front: settings.frontGrainDirection ?? DEFAULT_GRAIN_DIRECTIONS.front,
    side: settings.sideGrainDirection ?? DEFAULT_GRAIN_DIRECTIONS.side,
    panel: settings.panelGrainDirection ?? DEFAULT_GRAIN_DIRECTIONS.panel
  };
}

export interface OrderDimensions {
  length: number;
  lengthVeneer: number;
  width: number;
  widthVeneer: number;
}

/**
 * Wymiary formatki w zamówieniu płyt: „Długość” to wymiar wzdłuż słoja, a okleina idzie razem ze swoim wymiarem
 * (`veneerX` to liczba okleinowanych krawędzi o długości `sideX`). Słój dowolny albo brak adnotacji — dłuższy bok.
 */
export function orientBoardForOrder(board: {
  sideX: number;
  sideY: number;
  veneerX?: number | null;
  veneerY?: number | null;
  grainAxis?: GrainAxis | null;
}): OrderDimensions {
  const veneerX = board.veneerX ?? 0;
  const veneerY = board.veneerY ?? 0;
  const lengthAlongX = board.grainAxis === 'ALONG_SIDE_X'
    || (board.grainAxis !== 'ALONG_SIDE_Y' && board.sideX > board.sideY);
  return lengthAlongX
    ? { length: board.sideX, lengthVeneer: veneerX, width: board.sideY, widthVeneer: veneerY }
    : { length: board.sideY, lengthVeneer: veneerY, width: board.sideX, widthVeneer: veneerX };
}
