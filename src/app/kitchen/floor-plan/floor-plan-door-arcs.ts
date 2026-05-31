import { CabinetZone } from '../model/kitchen-state.model';
import { CabinetSide, WallType } from '../model/kitchen-project.model';

/**
 * Rodzaj otwarcia widoczny na rzucie z góry:
 * - SINGLE_DOOR — jedno skrzydło (łuk ćwiartki koła) na zadanym pod-przedziale frontu,
 * - DOUBLE_DOOR — dwa skrzydła spotykające się w środku (dwa łuki),
 * - DRAWER — szuflada/kosz (prostokąt symbolizujący wysuw, NIE łuk),
 * - NONE — brak frontu (np. szafka otwarta) → brak rysunku.
 */
export type FloorPlanOpeningKind = 'SINGLE_DOOR' | 'DOUBLE_DOOR' | 'DRAWER' | 'NONE';

/**
 * Opis sposobu otwierania szafki na floor planie. Liczony w `floor-plan-layout.builder`
 * z pełnego modelu `KitchenCabinet`, bo `CabinetOnFloorPlan` ma już tylko geometrię w px.
 *
 * `spanStartFraction`/`spanEndFraction` (0..1 wzdłuż biegu frontu od początku korpusu) pozwalają
 * narysować łuk TYLKO na otwieranej części — kluczowe dla szafki ślepej (Type B), gdzie otwiera się
 * jedynie front uchylny, a nie cała szerokość korpusu.
 */
export interface FloorPlanOpening {
  kind: FloorPlanOpeningKind;
  /** Strona zawiasów dla pojedynczego skrzydła. */
  hingeSide?: 'LEFT' | 'RIGHT';
  /** Początek otwieranego pod-przedziału (0..1 od początku biegu frontu). Domyślnie 0. */
  spanStartFraction?: number;
  /** Koniec otwieranego pod-przedziału (0..1). Domyślnie 1. */
  spanEndFraction?: number;
}

export interface CabinetOnFloorPlan {
  cabinetId: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  zone: CabinetZone;
  isCorner: boolean;
  isFreestanding: boolean;
  hasDepthCollision?: boolean;
  wallType: WallType;
  cabinetSide?: CabinetSide;
  isReversed?: boolean;
  /** Opis otwierania (door/drawer/none). Gdy brak — domyślnie pojedyncze drzwi na całej szerokości. */
  opening?: FloorPlanOpening;
}

export interface FloorPlanArc {
  /** Unikalny identyfikator kształtu (cabinetId + indeks skrzydła) — dla trackBy w *ngFor. */
  id: string;
  cabinetId: string;
  /** Rodzaj kształtu — pozwala odróżnić szufladę (prostokąt) od drzwi (łuk) w tooltipie/legendzie. */
  kind: FloorPlanOpeningKind;
  pathD: string;
  hasCollision: boolean;
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
}

export function buildFloorPlanArcs(cabinets: CabinetOnFloorPlan[]): FloorPlanArc[] {
  const blockingRects = cabinets
    .filter(cabinet => cabinet.zone !== 'TOP')
    .map(cabinet => ({
      id: cabinet.cabinetId,
      x: cabinet.x,
      y: cabinet.y,
      w: cabinet.width,
      h: cabinet.depth
    }));

  const arcs = cabinets
    .filter(cabinet => !cabinet.isFreestanding && cabinet.zone !== 'TOP')
    .flatMap(cabinet => buildCabinetOpeningShapes(cabinet));

  for (const arc of arcs) {
    for (const rect of blockingRects) {
      if (rect.id === arc.cabinetId) {
        continue;
      }

      if (rectsOverlap(arc.bboxX, arc.bboxY, arc.bboxW, arc.bboxH, rect.x, rect.y, rect.w, rect.h)) {
        arc.hasCollision = true;
        break;
      }
    }
  }

  return arcs;
}

/**
 * Buduje wszystkie kształty otwarcia dla jednej szafki (1 dla single-door, 2 dla double-door,
 * 1 prostokąt dla szuflady, 0 dla braku frontu).
 */
export function buildCabinetOpeningShapes(cabinet: CabinetOnFloorPlan): FloorPlanArc[] {
  const opening = cabinet.opening ?? { kind: 'SINGLE_DOOR' as const };

  switch (opening.kind) {
    case 'NONE':
      return [];
    case 'DRAWER': {
      const rect = buildDrawerRect(cabinet, `${cabinet.cabinetId}-drawer`);
      return rect ? [rect] : [];
    }
    case 'DOUBLE_DOOR': {
      const left = buildDoorLeaf(cabinet, 0, 0.5, 'LEFT', `${cabinet.cabinetId}-door-l`);
      const right = buildDoorLeaf(cabinet, 0.5, 1, 'RIGHT', `${cabinet.cabinetId}-door-r`);
      return [left, right].filter((arc): arc is FloorPlanArc => arc !== null);
    }
    case 'SINGLE_DOOR':
    default: {
      const start = clampFraction(opening.spanStartFraction ?? 0);
      const end = clampFraction(opening.spanEndFraction ?? 1);
      const arc = buildDoorLeaf(cabinet, start, end, opening.hingeSide ?? 'LEFT', `${cabinet.cabinetId}-door`);
      return arc ? [arc] : [];
    }
  }
}

/**
 * Łuk ćwiartki koła dla pojedynczego skrzydła na pod-przedziale `[startFraction, endFraction]`
 * biegu frontu. Domyślne wywołanie (cały bieg, hinge LEFT) odtwarza dotychczasową geometrię 1:1.
 */
export function buildFloorPlanArc(cabinet: CabinetOnFloorPlan, hingeSide: 'LEFT' | 'RIGHT' = 'LEFT'): FloorPlanArc | null {
  return buildDoorLeaf(cabinet, 0, 1, hingeSide, `${cabinet.cabinetId}-door`);
}

function buildDoorLeaf(
  cabinet: CabinetOnFloorPlan,
  startFraction: number,
  endFraction: number,
  hingeSide: 'LEFT' | 'RIGHT',
  id: string
): FloorPlanArc | null {
  const lo = Math.min(startFraction, endFraction);
  const hi = Math.max(startFraction, endFraction);
  if (hi - lo <= 0) {
    return null;
  }

  let pathD: string;
  let bboxX: number;
  let bboxY: number;
  let bboxW: number;
  let bboxH: number;

  switch (cabinet.wallType) {
    case 'MAIN':
    case 'CORNER_LEFT':
    case 'CORNER_RIGHT':
    case 'ISLAND': {
      // Bieg frontu wzdłuż osi X. Pod-przedział [s0, s1], promień = długość skrzydła.
      const s0 = cabinet.x + lo * cabinet.width;
      const s1 = cabinet.x + hi * cabinet.width;
      const radius = s1 - s0;

      // Kierunek otwierania zależy od umiejscowienia frontu względem korpusu:
      // - MAIN / CORNER_*: front "do góry" (od ściany w stronę pomieszczenia).
      // - ISLAND FRONT: front po DOLNEJ stronie korpusu (cabinet.y + depth) → otwiera się w dół.
      // - ISLAND BACK: front po GÓRNEJ stronie → otwiera się w górę.
      const opensDownward = cabinet.wallType === 'ISLAND' && cabinet.cabinetSide === 'FRONT';
      const frontY = opensDownward ? cabinet.y + cabinet.depth : cabinet.y;

      if (opensDownward) {
        if (hingeSide === 'LEFT') {
          pathD = `M ${s1},${frontY} A ${radius},${radius} 0 0 1 ${s0},${frontY + radius} L ${s0},${frontY} Z`;
        } else {
          pathD = `M ${s0},${frontY} A ${radius},${radius} 0 0 0 ${s1},${frontY + radius} L ${s1},${frontY} Z`;
        }
        bboxX = s0;
        bboxY = frontY;
        bboxW = radius;
        bboxH = radius;
      } else {
        if (hingeSide === 'LEFT') {
          pathD = `M ${s1},${frontY} A ${radius},${radius} 0 0 0 ${s0},${frontY - radius} L ${s0},${frontY} Z`;
        } else {
          pathD = `M ${s0},${frontY} A ${radius},${radius} 0 0 1 ${s1},${frontY - radius} L ${s1},${frontY} Z`;
        }
        bboxX = s0;
        bboxY = frontY - radius;
        bboxW = radius;
        bboxH = radius;
      }
      break;
    }
    case 'LEFT': {
      // Bieg frontu wzdłuż osi Y; front wychodzi w prawo (frontX = prawa krawędź korpusu).
      const s0 = cabinet.y + lo * cabinet.depth;
      const s1 = cabinet.y + hi * cabinet.depth;
      const radius = s1 - s0;
      const frontX = cabinet.x + cabinet.width;

      if (hingeSide === 'LEFT') {
        pathD = `M ${frontX},${s0} A ${radius},${radius} 0 0 1 ${frontX + radius},${s1} L ${frontX},${s1} Z`;
      } else {
        pathD = `M ${frontX},${s1} A ${radius},${radius} 0 0 0 ${frontX + radius},${s0} L ${frontX},${s0} Z`;
      }
      bboxX = frontX;
      bboxY = s0;
      bboxW = radius;
      bboxH = radius;
      break;
    }
    case 'RIGHT': {
      // Bieg frontu wzdłuż osi Y; front wychodzi w lewo (frontX = lewa krawędź korpusu).
      const s0 = cabinet.y + lo * cabinet.depth;
      const s1 = cabinet.y + hi * cabinet.depth;
      const radius = s1 - s0;
      const frontX = cabinet.x;

      if (hingeSide === 'LEFT') {
        pathD = `M ${frontX},${s1} A ${radius},${radius} 0 0 1 ${frontX - radius},${s0} L ${frontX},${s0} Z`;
      } else {
        pathD = `M ${frontX},${s0} A ${radius},${radius} 0 0 0 ${frontX - radius},${s1} L ${frontX},${s1} Z`;
      }
      bboxX = frontX - radius;
      bboxY = s0;
      bboxW = radius;
      bboxH = radius;
      break;
    }
    default:
      return null;
  }

  return {
    id,
    cabinetId: cabinet.cabinetId,
    kind: 'SINGLE_DOOR',
    pathD,
    hasCollision: false,
    bboxX,
    bboxY,
    bboxW,
    bboxH
  };
}

/**
 * Prostokąt symbolizujący wysuw szuflady/kosza — rysowany przed frontem, na całą szerokość biegu,
 * wysunięty prostopadle do ściany o `pullOut` (część głębokości korpusu).
 */
function buildDrawerRect(cabinet: CabinetOnFloorPlan, id: string): FloorPlanArc | null {
  // Część głębokości korpusu, na jaką szuflada się wysuwa (czytelny prostokąt, niepełna kolizja).
  const PULL_OUT_FRACTION = 0.8;

  let bboxX: number;
  let bboxY: number;
  let bboxW: number;
  let bboxH: number;

  switch (cabinet.wallType) {
    case 'MAIN':
    case 'CORNER_LEFT':
    case 'CORNER_RIGHT':
    case 'ISLAND': {
      const opensDownward = cabinet.wallType === 'ISLAND' && cabinet.cabinetSide === 'FRONT';
      const frontY = opensDownward ? cabinet.y + cabinet.depth : cabinet.y;
      const pullOut = cabinet.depth * PULL_OUT_FRACTION;
      bboxX = cabinet.x;
      bboxY = opensDownward ? frontY : frontY - pullOut;
      bboxW = cabinet.width;
      bboxH = pullOut;
      break;
    }
    case 'LEFT': {
      const frontX = cabinet.x + cabinet.width;
      const pullOut = cabinet.width * PULL_OUT_FRACTION;
      bboxX = frontX;
      bboxY = cabinet.y;
      bboxW = pullOut;
      bboxH = cabinet.depth;
      break;
    }
    case 'RIGHT': {
      const frontX = cabinet.x;
      const pullOut = cabinet.width * PULL_OUT_FRACTION;
      bboxX = frontX - pullOut;
      bboxY = cabinet.y;
      bboxW = pullOut;
      bboxH = cabinet.depth;
      break;
    }
    default:
      return null;
  }

  const pathD = `M ${bboxX},${bboxY} L ${bboxX + bboxW},${bboxY} L ${bboxX + bboxW},${bboxY + bboxH} L ${bboxX},${bboxY + bboxH} Z`;

  return {
    id,
    cabinetId: cabinet.cabinetId,
    kind: 'DRAWER',
    pathD,
    hasCollision: false,
    bboxX,
    bboxY,
    bboxW,
    bboxH
  };
}

function clampFraction(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
