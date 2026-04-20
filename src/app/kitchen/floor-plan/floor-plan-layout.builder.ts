import { CabinetZone, getCabinetZone, requiresCountertop, WallWithCabinets } from '../model/kitchen-state.model';
import { WallType } from '../model/kitchen-project.model';
import { CabinetOnFloorPlan } from './floor-plan-door-arcs';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

export interface WallPosition {
  wall: WallWithCabinets;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  labelX: number;
  labelY: number;
  isHorizontal: boolean;
  scale: number;
}

export interface CountertopOnFloorPlan {
  x: number;
  y: number;
  width: number;
  depth: number;
  lengthMm: number;
  depthMm: number;
  lengthLabelX: number;
  lengthLabelY: number;
  depthLabelX: number;
  depthLabelY: number;
  isHorizontal: boolean;
}

export interface FloorPlanLayoutSettings {
  svgWidth: number;
  svgHeight: number;
  wallThickness: number;
  padding: number;
  countertopOverhang: number;
  countertopStandardDepth: number;
}

export function buildWallPositions(
  walls: WallWithCabinets[],
  settings: Pick<FloorPlanLayoutSettings, 'svgWidth' | 'svgHeight' | 'wallThickness' | 'padding'>
): WallPosition[] {
  const positions: WallPosition[] = [];
  const mainWall = walls.find(wall => wall.type === 'MAIN');
  const leftWall = walls.find(wall => wall.type === 'LEFT');
  const rightWall = walls.find(wall => wall.type === 'RIGHT');
  const cornerLeft = walls.find(wall => wall.type === 'CORNER_LEFT');
  const cornerRight = walls.find(wall => wall.type === 'CORNER_RIGHT');
  const island = walls.find(wall => wall.type === 'ISLAND');

  const maxWidth = Math.max(
    mainWall?.widthMm ?? 0,
    (leftWall?.widthMm ?? 0) + (mainWall?.widthMm ?? 0) + (rightWall?.widthMm ?? 0)
  );
  const maxHeight = Math.max(leftWall?.widthMm ?? 0, rightWall?.widthMm ?? 0, 2000);

  const scaleX = (settings.svgWidth - 2 * settings.padding) / Math.max(maxWidth, 1000);
  const scaleY = (settings.svgHeight - 2 * settings.padding) / Math.max(maxHeight, 1000);
  const scale = Math.min(scaleX, scaleY, 0.12);

  const centerX = settings.svgWidth / 2;
  const centerY = settings.svgHeight - settings.padding - 15;

  if (mainWall) {
    const width = mainWall.widthMm * scale;
    positions.push({
      wall: mainWall,
      x: centerX - width / 2,
      y: centerY - settings.wallThickness,
      width,
      height: settings.wallThickness,
      rotation: 0,
      labelX: centerX,
      labelY: centerY + 12,
      isHorizontal: true,
      scale
    });
  }

  if (leftWall) {
    const mainWidth = (mainWall?.widthMm ?? 3000) * scale;
    const height = leftWall.widthMm * scale;
    const x = centerX - mainWidth / 2 - settings.wallThickness;
    positions.push({
      wall: leftWall,
      x,
      y: centerY - settings.wallThickness - height,
      width: settings.wallThickness,
      height,
      rotation: 0,
      labelX: x - 8,
      labelY: centerY - settings.wallThickness - height / 2,
      isHorizontal: false,
      scale
    });
  }

  if (rightWall) {
    const mainWidth = (mainWall?.widthMm ?? 3000) * scale;
    const height = rightWall.widthMm * scale;
    const x = centerX + mainWidth / 2;
    positions.push({
      wall: rightWall,
      x,
      y: centerY - settings.wallThickness - height,
      width: settings.wallThickness,
      height,
      rotation: 0,
      labelX: x + settings.wallThickness + 8,
      labelY: centerY - settings.wallThickness - height / 2,
      isHorizontal: false,
      scale
    });
  }

  if (cornerLeft) {
    const mainWidth = (mainWall?.widthMm ?? 3000) * scale;
    const leftHeight = (leftWall?.widthMm ?? 0) * scale;
    const width = cornerLeft.widthMm * scale;
    positions.push({
      wall: cornerLeft,
      x: centerX - mainWidth / 2 - settings.wallThickness,
      y: centerY - settings.wallThickness - leftHeight - width,
      width,
      height: settings.wallThickness,
      rotation: 0,
      labelX: centerX - mainWidth / 2 - settings.wallThickness + width / 2,
      labelY: centerY - settings.wallThickness - leftHeight - width - 8,
      isHorizontal: true,
      scale
    });
  }

  if (cornerRight) {
    const mainWidth = (mainWall?.widthMm ?? 3000) * scale;
    const rightHeight = (rightWall?.widthMm ?? 0) * scale;
    const width = cornerRight.widthMm * scale;
    positions.push({
      wall: cornerRight,
      x: centerX + mainWidth / 2 + settings.wallThickness - width,
      y: centerY - settings.wallThickness - rightHeight - width,
      width,
      height: settings.wallThickness,
      rotation: 0,
      labelX: centerX + mainWidth / 2 + settings.wallThickness - width / 2,
      labelY: centerY - settings.wallThickness - rightHeight - width - 8,
      isHorizontal: true,
      scale
    });
  }

  if (island) {
    const width = island.widthMm * scale;
    const depth = 600 * scale;
    positions.push({
      wall: island,
      x: centerX - width / 2,
      y: centerY - settings.wallThickness - 80 - depth,
      width,
      height: depth,
      rotation: 0,
      labelX: centerX,
      labelY: centerY - settings.wallThickness - 80 - depth / 2,
      isHorizontal: true,
      scale
    });
  }

  return positions;
}

export function buildCabinetsForWall(pos: WallPosition, wallThickness: number): CabinetOnFloorPlan[] {
  const wall = pos.wall;
  const scale = pos.scale;
  let currentXBottom = 0;
  let currentXTop = 0;

  const bottomCabinets: CabinetOnFloorPlan[] = [];
  const topCabinets: CabinetOnFloorPlan[] = [];
  const fullCabinets: CabinetOnFloorPlan[] = [];

  for (const cabinet of wall.cabinets) {
    const zone = getCabinetZone(cabinet);
    const cabinetWidth = cabinet.width * scale;
    const cabinetDepth = cabinet.depth * scale;
    const isCorner = cabinet.type === KitchenCabinetType.CORNER_CABINET;

    let posX: number;
    switch (zone) {
      case 'FULL':
        posX = Math.max(currentXBottom, currentXTop);
        currentXBottom = posX + cabinet.width;
        currentXTop = posX + cabinet.width;
        break;
      case 'TOP':
        posX = currentXTop;
        currentXTop += cabinet.width;
        break;
      case 'BOTTOM':
      default:
        posX = currentXBottom;
        currentXBottom += cabinet.width;
        break;
    }

    const isFreestanding = !requiresCountertop(cabinet.type) && zone === 'BOTTOM';
    const cabinetOnPlan = createCabinetOnFloorPlan(
      cabinet.id,
      cabinet.name,
      pos,
      wall.type,
      posX * scale,
      cabinetWidth,
      cabinetDepth,
      zone,
      isCorner,
      isFreestanding,
      wallThickness
    );

    switch (zone) {
      case 'BOTTOM':
        bottomCabinets.push(cabinetOnPlan);
        break;
      case 'TOP':
        topCabinets.push(cabinetOnPlan);
        break;
      case 'FULL':
        fullCabinets.push(cabinetOnPlan);
        break;
    }
  }

  return [...bottomCabinets, ...fullCabinets, ...topCabinets];
}

export function buildCountertopsForWall(pos: WallPosition, settings: Pick<FloorPlanLayoutSettings, 'wallThickness' | 'countertopOverhang' | 'countertopStandardDepth'>): CountertopOnFloorPlan[] {
  const wall = pos.wall;
  let currentXBottom = 0;
  let currentXTop = 0;
  const result: CountertopOnFloorPlan[] = [];
  let runStartMm: number | null = null;
  let runWidthMm = 0;

  for (const cabinet of wall.cabinets) {
    const zone = getCabinetZone(cabinet);

    let posX: number;
    switch (zone) {
      case 'FULL':
        posX = Math.max(currentXBottom, currentXTop);
        currentXBottom = posX + cabinet.width;
        currentXTop = posX + cabinet.width;
        break;
      case 'TOP':
        posX = currentXTop;
        currentXTop += cabinet.width;
        break;
      case 'BOTTOM':
      default:
        posX = currentXBottom;
        currentXBottom += cabinet.width;
        break;
    }

    if (zone === 'TOP') {
      continue;
    }

    if (requiresCountertop(cabinet.type)) {
      if (runStartMm === null) {
        runStartMm = posX;
        runWidthMm = cabinet.width;
      } else {
        runWidthMm += cabinet.width;
      }
    } else if (runStartMm !== null) {
      result.push(buildCountertopSegment(pos, runStartMm, runWidthMm, settings));
      runStartMm = null;
      runWidthMm = 0;
    }
  }

  if (runStartMm !== null) {
    result.push(buildCountertopSegment(pos, runStartMm, runWidthMm, settings));
  }

  return result;
}

function buildCountertopSegment(
  pos: WallPosition,
  startMm: number,
  widthMm: number,
  settings: Pick<FloorPlanLayoutSettings, 'wallThickness' | 'countertopOverhang' | 'countertopStandardDepth'>
): CountertopOnFloorPlan {
  const scale = pos.scale;
  const countertopDepthMm = settings.countertopStandardDepth;
  const countertopWidthMm = widthMm + settings.countertopOverhang;
  const countertopWidth = countertopWidthMm * scale;
  const countertopDepth = countertopDepthMm * scale;
  const overhang = settings.countertopOverhang * scale / 2;

  if (pos.isHorizontal) {
    const x = pos.x + startMm * scale - overhang;
    const y = pos.y - countertopDepth;
    return {
      x, y,
      width: countertopWidth,
      depth: countertopDepth,
      lengthMm: countertopWidthMm,
      depthMm: countertopDepthMm,
      lengthLabelX: x + countertopWidth / 2,
      lengthLabelY: y + countertopDepth + 8,
      depthLabelX: x - 3,
      depthLabelY: y + countertopDepth / 2,
      isHorizontal: true
    };
  }

  if (pos.wall.type === 'LEFT') {
    const x = pos.x + settings.wallThickness - overhang;
    const y = pos.y + startMm * scale - overhang;
    return {
      x, y,
      width: countertopDepth,
      depth: countertopWidth,
      lengthMm: countertopWidthMm,
      depthMm: countertopDepthMm,
      lengthLabelX: x - 3,
      lengthLabelY: y + countertopWidth / 2,
      depthLabelX: x + countertopDepth / 2,
      depthLabelY: y - 3,
      isHorizontal: false
    };
  }

  const x = pos.x - countertopDepth + overhang;
  const y = pos.y + startMm * scale - overhang;
  return {
    x, y,
    width: countertopDepth,
    depth: countertopWidth,
    lengthMm: countertopWidthMm,
    depthMm: countertopDepthMm,
    lengthLabelX: x + countertopDepth + 3,
    lengthLabelY: y + countertopWidth / 2,
    depthLabelX: x + countertopDepth / 2,
    depthLabelY: y - 3,
    isHorizontal: false
  };
}

function createCabinetOnFloorPlan(
  cabinetId: string,
  name: string | undefined,
  pos: WallPosition,
  wallType: WallType,
  posX: number,
  cabinetWidth: number,
  cabinetDepth: number,
  zone: CabinetZone,
  isCorner: boolean,
  isFreestanding: boolean,
  wallThickness: number
): CabinetOnFloorPlan {
  if (pos.isHorizontal) {
    return {
      cabinetId,
      name,
      x: pos.x + posX,
      y: pos.y - cabinetDepth,
      width: cabinetWidth,
      depth: cabinetDepth,
      zone,
      isCorner,
      isFreestanding,
      wallType
    };
  }

  if (wallType === 'LEFT') {
    return {
      cabinetId,
      name,
      x: pos.x + wallThickness,
      y: pos.y + posX,
      width: cabinetDepth,
      depth: cabinetWidth,
      zone,
      isCorner,
      isFreestanding,
      wallType
    };
  }

  return {
    cabinetId,
    name,
    x: pos.x - cabinetDepth,
    y: pos.y + posX,
    width: cabinetDepth,
    depth: cabinetWidth,
    zone,
    isCorner,
    isFreestanding,
    wallType
  };
}
