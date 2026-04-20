import { CabinetZone } from '../model/kitchen-state.model';
import { WallType } from '../model/kitchen-project.model';

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
  wallType: WallType;
}

export interface FloorPlanArc {
  cabinetId: string;
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
    .map(cabinet => buildFloorPlanArc(cabinet))
    .filter((arc): arc is FloorPlanArc => arc !== null);

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

export function buildFloorPlanArc(cabinet: CabinetOnFloorPlan, hingeSide: 'LEFT' | 'RIGHT' = 'LEFT'): FloorPlanArc | null {
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
      const radius = cabinet.width;
      const centerX = hingeSide === 'LEFT' ? cabinet.x : cabinet.x + radius;
      const frontY = cabinet.y;

      if (hingeSide === 'LEFT') {
        pathD = `M ${centerX + radius},${frontY} A ${radius},${radius} 0 0 0 ${centerX},${frontY - radius} L ${centerX},${frontY} Z`;
        bboxX = centerX;
        bboxY = frontY - radius;
        bboxW = radius;
        bboxH = radius;
      } else {
        pathD = `M ${centerX - radius},${frontY} A ${radius},${radius} 0 0 1 ${centerX},${frontY - radius} L ${centerX},${frontY} Z`;
        bboxX = centerX - radius;
        bboxY = frontY - radius;
        bboxW = radius;
        bboxH = radius;
      }
      break;
    }
    case 'LEFT': {
      const radius = cabinet.depth;
      const frontX = cabinet.x + cabinet.width;

      if (hingeSide === 'LEFT') {
        pathD = `M ${frontX},${cabinet.y} A ${radius},${radius} 0 0 1 ${frontX + radius},${cabinet.y + radius} L ${frontX},${cabinet.y + radius} Z`;
        bboxX = frontX;
        bboxY = cabinet.y;
        bboxW = radius;
        bboxH = radius;
      } else {
        pathD = `M ${frontX},${cabinet.y + radius} A ${radius},${radius} 0 0 0 ${frontX + radius},${cabinet.y} L ${frontX},${cabinet.y} Z`;
        bboxX = frontX;
        bboxY = cabinet.y;
        bboxW = radius;
        bboxH = radius;
      }
      break;
    }
    case 'RIGHT': {
      const radius = cabinet.depth;
      const frontX = cabinet.x;

      if (hingeSide === 'LEFT') {
        pathD = `M ${frontX},${cabinet.y + radius} A ${radius},${radius} 0 0 1 ${frontX - radius},${cabinet.y} L ${frontX},${cabinet.y} Z`;
        bboxX = frontX - radius;
        bboxY = cabinet.y;
        bboxW = radius;
        bboxH = radius;
      } else {
        pathD = `M ${frontX},${cabinet.y} A ${radius},${radius} 0 0 0 ${frontX - radius},${cabinet.y + radius} L ${frontX},${cabinet.y + radius} Z`;
        bboxX = frontX - radius;
        bboxY = cabinet.y;
        bboxW = radius;
        bboxH = radius;
      }
      break;
    }
    default:
      return null;
  }

  return {
    cabinetId: cabinet.cabinetId,
    pathD,
    hasCollision: false,
    bboxX,
    bboxY,
    bboxW,
    bboxH
  };
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
