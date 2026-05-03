import { CabinetPosition, CabinetZone, getCabinetZone, KitchenCabinet, requiresCountertop, WallWithCabinets } from '../model/kitchen-state.model';
import { WallType } from '../model/kitchen-project.model';
import { CabinetOnFloorPlan } from './floor-plan-door-arcs';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { DEFAULT_COUNTERTOP_REQUEST } from '../model/countertop.model';
import { kitchenGeometrySharedSingleton } from '../service/kitchen-geometry.service';
import { ProjectWallAddonsRequestBuilder } from '../service/project-wall-addons-request.builder';

/** Default w `ProjectWallAddonsRequestBuilder.buildCountertopRequest` (sideOverhangExtraMm). */
const DEFAULT_SIDE_OVERHANG_EXTRA_MM = 5;
/** Default fillerWidthMm gdy ustawienia uzytkownika nie sa propagowane do floor plan. */
const DEFAULT_FILLER_WIDTH_MM = 50;
const DEFAULT_PLINTH_HEIGHT_MM = 100;

const geometryService = kitchenGeometrySharedSingleton;
const addonsBuilder = new ProjectWallAddonsRequestBuilder();
const DEFAULT_UPPER_FILLER_HEIGHT_MM = 0;

/** Settings needed for UPPER auto-repositioning in the floor plan. */
export interface FloorPlanCabinetsSettings {
  plinthHeightMm: number;
  upperFillerHeightMm: number;
  fillerWidthMm?: number;
}

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

export interface CountertopRunMm {
  startMm: number;
  endMm: number;
  lengthMm: number;
}

export interface FloorPlanLayoutSettings {
  svgWidth: number;
  svgHeight: number;
  wallThickness: number;
  padding: number;
  countertopOverhang: number;
  countertopStandardDepth: number;
  /** Globalna szerokosc blendy bocznej (mm). Uzywana do liczenia overhangow LEFT/RIGHT na wyspie. */
  fillerWidthMm?: number;
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
    const islandDepthMm = island.islandDepthMm ?? island.countertopConfig?.manualDepthMm ?? 900;
    const depth = islandDepthMm * scale;
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

export function buildCabinetsForWall(
  pos: WallPosition,
  wallThickness: number,
  cabSettings?: FloorPlanCabinetsSettings
): CabinetOnFloorPlan[] {
  if (pos.wall.type === 'ISLAND') {
    return buildIslandCabinetsForWall(pos, wallThickness, cabSettings);
  }

  return buildLinearCabinetsForWall(pos, wallThickness, cabSettings, pos.wall.cabinets);
}

function buildLinearCabinetsForWall(
  pos: WallPosition,
  wallThickness: number,
  cabSettings: FloorPlanCabinetsSettings | undefined,
  cabinets: WallWithCabinets['cabinets']
): CabinetOnFloorPlan[] {
  const wall = pos.wall;
  const scale = pos.scale;
  const positions = geometryService.calculateLinearCabinetPositions(
    cabinets,
    buildGeometrySettings(pos, cabSettings)
  );
  const positionMap = new Map(positions.map(position => [position.cabinetId, position]));

  const bottomCabinets: CabinetOnFloorPlan[] = [];
  const topCabinets: CabinetOnFloorPlan[] = [];
  const fullCabinets: CabinetOnFloorPlan[] = [];
  const referenceFrontDepth = Math.max(
    0,
    ...cabinets
      .filter(cabinet => getCabinetZone(cabinet) !== 'TOP')
      .map(cabinet => cabinet.depth * scale)
  );

  for (const cabinet of cabinets) {
    const zone = getCabinetZone(cabinet);
    const geometryPosition = positionMap.get(cabinet.id);
    if (!geometryPosition) {
      continue;
    }
    const cabinetWidth = cabinet.width * scale;
    const cabinetDepth = cabinet.depth * scale;
    const isCorner = cabinet.type === KitchenCabinetType.CORNER_CABINET;

    const isFreestanding = !requiresCountertop(cabinet.type) && zone === 'BOTTOM';
    const cabinetOnPlan = createCabinetOnFloorPlan(
      cabinet.id,
      cabinet.name,
      pos,
      wall.type,
      geometryPosition.x * scale,
      cabinetWidth,
      cabinetDepth,
      zone,
      isCorner,
      isFreestanding,
      wallThickness,
      cabinet.cabinetSide ?? 'FRONT',
      cabinet.type === KitchenCabinetType.PANTRY_PASSAGE ? referenceFrontDepth : undefined
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

function buildIslandCabinetsForWall(
  pos: WallPosition,
  wallThickness: number,
  cabSettings?: FloorPlanCabinetsSettings
): CabinetOnFloorPlan[] {
  const geometryPositions = geometryService.calculateCabinetPositions(
    pos.wall.cabinets,
    buildGeometrySettings(pos, cabSettings, pos.wall.type)
  );
  const positionsById = new Map(geometryPositions.map(position => [position.cabinetId, position]));
  const islandCabinets = pos.wall.cabinets
    .map(cabinet => {
      const geometryPosition = positionsById.get(cabinet.id);
      if (!geometryPosition) {
        return null;
      }

      const cabinetSide = cabinet.cabinetSide ?? 'FRONT';
      const cabinetDepth = cabinet.depth * pos.scale;

      return {
        ...createCabinetOnFloorPlan(
          cabinet.id,
          cabinet.name,
          pos,
          pos.wall.type,
          geometryPosition.x * pos.scale,
          cabinet.width * pos.scale,
          cabinetDepth,
          getCabinetZone(cabinet),
          cabinet.type === KitchenCabinetType.CORNER_CABINET,
          !requiresCountertop(cabinet.type) && getCabinetZone(cabinet) === 'BOTTOM',
          wallThickness,
          cabinetSide
        ),
        y: cabinetSide === 'BACK'
          ? pos.y
          : pos.y + pos.height - cabinetDepth,
        cabinetSide,
        isReversed: cabinetSide === 'BACK'
      } as CabinetOnFloorPlan;
    })
    .filter((cabinet): cabinet is CabinetOnFloorPlan => !!cabinet);

  markIslandDepthCollisions(islandCabinets);
  return islandCabinets;
}

export function buildCountertopsForWall(pos: WallPosition, settings: Pick<FloorPlanLayoutSettings, 'wallThickness' | 'countertopOverhang' | 'countertopStandardDepth' | 'fillerWidthMm'>): CountertopOnFloorPlan[] {
  const wall = pos.wall;
  if (wall.type === 'ISLAND') {
    if (wall.countertopConfig?.enabled === false) return [];
    return [buildIslandCountertop(pos, settings)];
  }

  const result: CountertopOnFloorPlan[] = [];
  let runStartMm: number | null = null;
  let runEndMm: number | null = null;
  const positions = geometryService.calculateLinearCabinetPositions(
    wall.cabinets,
    buildGeometrySettings(pos, {
      plinthHeightMm: DEFAULT_PLINTH_HEIGHT_MM,
      // Countertop runs only depend on the bottom/full lane, so TOP filler is irrelevant here.
      upperFillerHeightMm: DEFAULT_UPPER_FILLER_HEIGHT_MM,
      fillerWidthMm: settings.fillerWidthMm
    })
  );
  const positionMap = new Map(positions.map(position => [position.cabinetId, position]));
  const fillerWidthMm = settings.fillerWidthMm ?? DEFAULT_FILLER_WIDTH_MM;
  return computeCountertopRunsMm(wall, positions, fillerWidthMm)
    .map(run => buildCountertopSegment(pos, run.startMm, run.lengthMm, settings));
  /*

  for (const cabinet of wall.cabinets) {
    const zone = getCabinetZone(cabinet);
    if (zone === 'TOP') continue; // Wiszące nie wpływają na pozycje blatów

    const geometryPosition = positionMap.get(cabinet.id);
    if (!geometryPosition) {
      continue;
    }

    const startMm = geometryPosition.x - addonsBuilder.enclosureOuterWidthMm(cabinet, 'left', fillerWidthMm);
    const endMm = geometryPosition.x + cabinet.width + addonsBuilder.enclosureOuterWidthMm(cabinet, 'right', fillerWidthMm);

    if (requiresCountertop(cabinet.type)) {
      if (runStartMm === null) {
        runStartMm = startMm;
        runEndMm = endMm;
      } else {
        runEndMm = endMm;
      }
    } else if (runStartMm !== null) {
      result.push(buildCountertopSegment(pos, runStartMm, (runEndMm ?? runStartMm) - runStartMm, settings));
      runStartMm = null;
      runEndMm = null;
    }
  }

  if (runStartMm !== null && runEndMm !== null) {
    result.push(buildCountertopSegment(pos, runStartMm, runEndMm - runStartMm, settings));
  }

  return result;
  */
}

export function computeCountertopRunsMm(
  wall: Pick<WallWithCabinets, 'widthMm' | 'countertopConfig'> & { cabinets: KitchenCabinet[] },
  cabinetPositions: CabinetPosition[],
  fillerWidthMm = DEFAULT_FILLER_WIDTH_MM
): CountertopRunMm[] {
  const positionMap = new Map(cabinetPositions.map(position => [position.cabinetId, position]));
  const sideExtra = wall.countertopConfig?.sideOverhangExtraMm ?? DEFAULT_SIDE_OVERHANG_EXTRA_MM;
  const result: CountertopRunMm[] = [];

  let firstCabinet: KitchenCabinet | null = null;
  let lastCabinet: KitchenCabinet | null = null;
  let firstPosition: CabinetPosition | null = null;
  let lastPosition: CabinetPosition | null = null;

  const flushRun = () => {
    if (!firstCabinet || !lastCabinet || !firstPosition || !lastPosition) {
      return;
    }

    const rawStartMm = firstPosition.x
      - addonsBuilder.enclosureOuterWidthMm(firstCabinet, 'left', fillerWidthMm)
      - sideExtra;
    const rawEndMm = lastPosition.x
      + lastCabinet.width
      + addonsBuilder.enclosureOuterWidthMm(lastCabinet, 'right', fillerWidthMm)
      + sideExtra;
    const startMm = Math.max(0, rawStartMm);
    const endMm = Math.min(wall.widthMm, rawEndMm);

    if (endMm > startMm) {
      result.push({
        startMm,
        endMm,
        lengthMm: endMm - startMm
      });
    }

    firstCabinet = null;
    lastCabinet = null;
    firstPosition = null;
    lastPosition = null;
  };

  for (const cabinet of wall.cabinets) {
    if (getCabinetZone(cabinet) === 'TOP') {
      continue;
    }

    const position = positionMap.get(cabinet.id);
    if (!position) {
      continue;
    }

    if (requiresCountertop(cabinet.type)) {
      if (!firstCabinet) {
        firstCabinet = cabinet;
        firstPosition = position;
      }
      lastCabinet = cabinet;
      lastPosition = position;
      continue;
    }

    flushRun();
  }

  flushRun();
  return result;
}

function buildIslandCountertop(
  pos: WallPosition,
  settings: Pick<FloorPlanLayoutSettings, 'countertopStandardDepth' | 'fillerWidthMm'>
): CountertopOnFloorPlan {
  const wall = pos.wall;
  // Priorytet MUSI byc identyczny z `ProjectWallAddonsRequestBuilder.buildCountertopRequest`:
  // manualDepthMm (jesli user ustawil) > islandDepthMm (korpus wyspy) > standard. Inaczej rzut z gory
  // klamie wzgledem requestu — user moze ustawic blat plytszy/glebszy od korpusu, a floor plan
  // pokaze sam korpus.
  const baseDepthMm = wall.countertopConfig?.manualDepthMm ?? wall.islandDepthMm ?? settings.countertopStandardDepth;
  const baseWidthMm = wall.widthMm;

  // 4D overhangi musza odzwierciedlac to, co `ProjectWallAddonsRequestBuilder.buildCountertopRequest`
  // wysyla do backendu — inaczej rzut z gory klamie wzgledem BOM/cen.
  const overhangs = computeIslandOverhangs(wall, settings.fillerWidthMm ?? DEFAULT_FILLER_WIDTH_MM);
  const widthMm = baseWidthMm + overhangs.leftMm + overhangs.rightMm;
  const depthMm = baseDepthMm + overhangs.frontMm + overhangs.backMm;

  const width = widthMm * pos.scale;
  const depth = depthMm * pos.scale;
  // FRONT na floor planie = dol prostokata (pos.y + pos.height); BACK = gora (pos.y).
  // Overhang BACK rosnie do gory (zmniejsza y), LEFT rosnie w lewo (zmniejsza x).
  const x = pos.x - overhangs.leftMm * pos.scale;
  const y = pos.y - overhangs.backMm * pos.scale;

  return {
    x,
    y,
    width,
    depth,
    lengthMm: widthMm,
    depthMm,
    lengthLabelX: x + width / 2,
    lengthLabelY: y + depth + 10,
    depthLabelX: x - 5,
    depthLabelY: y + depth / 2,
    isHorizontal: true
  };
}

interface IslandOverhangs {
  frontMm: number;
  backMm: number;
  leftMm: number;
  rightMm: number;
}

function computeIslandOverhangs(wall: WallWithCabinets, fillerWidthMm: number): IslandOverhangs {
  const config = wall.countertopConfig;
  // Brak configu (jeszcze niezapisany blat) → renderujemy "bazowy" prostokat wyspy bez naddatkow.
  // To pozwala zachowac obecne zachowanie dla niezdefiniowanego blatu (test: depthMm == islandDepthMm).
  if (!config) {
    return { frontMm: 0, backMm: 0, leftMm: 0, rightMm: 0 };
  }

  const adjacentSide = wall.adjacentToWall ?? 'NONE';
  const sideExtra = config.sideOverhangExtraMm ?? DEFAULT_SIDE_OVERHANG_EXTRA_MM;
  // Defaulty MUSZA byc identyczne z `ProjectWallAddonsRequestBuilder.buildCountertopRequest`
  // (front = DEFAULT_COUNTERTOP_REQUEST.frontOverhangMm = 30, back = DEFAULT_COUNTERTOP_REQUEST.backOverhangMm = 0),
  // zeby floor plan rysowal dokladnie to, co poleci do backendu.
  const frontMm = config.frontOverhangMm ?? DEFAULT_COUNTERTOP_REQUEST.frontOverhangMm;
  const backMm = adjacentSide === 'BACK'
    ? 0
    : (config.backOverhangMm ?? DEFAULT_COUNTERTOP_REQUEST.backOverhangMm);

  // LEFT/RIGHT overhang = max(enclosure outer width FRONT, enclosure outer width BACK) + sideExtra,
  // 0 jesli ten bok jest peninsula (przyklejony do sciany).
  const leftMm = adjacentSide === 'LEFT'
    ? 0
    : computeIslandSideEnclosureMm(wall, 'left', fillerWidthMm) + sideExtra;
  const rightMm = adjacentSide === 'RIGHT'
    ? 0
    : computeIslandSideEnclosureMm(wall, 'right', fillerWidthMm) + sideExtra;

  return { frontMm, backMm, leftMm, rightMm };
}

function computeIslandSideEnclosureMm(wall: WallWithCabinets, side: 'left' | 'right', fillerWidthMm: number): number {
  const cabinetSides = ['FRONT', 'BACK'] as const;
  return cabinetSides.reduce((maxMm, cabinetSide) => {
    const sideCabinets = wall.cabinets.filter(cabinet =>
      (cabinet.cabinetSide ?? 'FRONT') === cabinetSide && requiresCountertop(cabinet.type)
    );
    if (sideCabinets.length === 0) return maxMm;
    const edge = side === 'left' ? sideCabinets[0] : sideCabinets[sideCabinets.length - 1];
    return Math.max(maxMm, addonsBuilder.enclosureOuterWidthMm(edge, side, fillerWidthMm));
  }, 0);
}

function buildCountertopSegment(
  pos: WallPosition,
  startMm: number,
  widthMm: number,
  settings: Pick<FloorPlanLayoutSettings, 'wallThickness' | 'countertopOverhang' | 'countertopStandardDepth'>
): CountertopOnFloorPlan {
  const scale = pos.scale;
  const countertopDepthMm = settings.countertopStandardDepth;
  const countertopWidthMm = widthMm;
  const countertopWidth = countertopWidthMm * scale;
  const countertopDepth = countertopDepthMm * scale;
  // Linear countertop width must mirror backend clipping:
  // start = max(0, firstCabinetX - leftOverhang), end = min(wallWidth, lastCabinetEndX + rightOverhang).
  // The front overhang affects countertop depth, not its length along the wall.

  if (pos.isHorizontal) {
    const x = pos.x + startMm * scale;
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
    const x = pos.x + settings.wallThickness;
    const y = pos.y + startMm * scale;
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

  const x = pos.x - countertopDepth;
  const y = pos.y + startMm * scale;
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
  wallThickness: number,
  cabinetSide: 'FRONT' | 'BACK' = 'FRONT',
  frontAlignedDepth?: number
): CabinetOnFloorPlan {
  if (pos.isHorizontal) {
    const alignedFrontDepth = frontAlignedDepth && frontAlignedDepth > cabinetDepth
      ? frontAlignedDepth
      : cabinetDepth;
    return {
      cabinetId,
      name,
      x: pos.x + posX,
      y: pos.y - alignedFrontDepth,
      width: cabinetWidth,
      depth: cabinetDepth,
      zone,
      isCorner,
      isFreestanding,
      wallType,
      cabinetSide,
      isReversed: wallType === 'ISLAND' && cabinetSide === 'BACK'
    };
  }

  if (wallType === 'LEFT') {
    const alignedFrontDepth = frontAlignedDepth && frontAlignedDepth > cabinetDepth
      ? frontAlignedDepth
      : cabinetDepth;
    return {
      cabinetId,
      name,
      x: pos.x + wallThickness + (alignedFrontDepth - cabinetDepth),
      y: pos.y + posX,
      width: cabinetDepth,
      depth: cabinetWidth,
      zone,
      isCorner,
      isFreestanding,
      wallType,
      cabinetSide
    };
  }

  return {
    cabinetId,
    name,
    x: pos.x - (frontAlignedDepth && frontAlignedDepth > cabinetDepth ? frontAlignedDepth : cabinetDepth),
    y: pos.y + posX,
    width: cabinetDepth,
    depth: cabinetWidth,
    zone,
    isCorner,
    isFreestanding,
    wallType,
    cabinetSide
  };
}

function markIslandDepthCollisions(cabinets: CabinetOnFloorPlan[]): void {
  const frontCabinets = cabinets.filter(cabinet => cabinet.cabinetSide !== 'BACK');
  const backCabinets = cabinets.filter(cabinet => cabinet.cabinetSide === 'BACK');

  for (const front of frontCabinets) {
    for (const back of backCabinets) {
      if (!rectanglesOverlap(front, back)) {
        continue;
      }

      front.hasDepthCollision = true;
      back.hasDepthCollision = true;
    }
  }
}

function rectanglesOverlap(a: Pick<CabinetOnFloorPlan, 'x' | 'y' | 'width' | 'depth'>, b: Pick<CabinetOnFloorPlan, 'x' | 'y' | 'width' | 'depth'>): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.depth
    && a.y + a.depth > b.y;
}

function buildGeometrySettings(
  pos: WallPosition,
  cabSettings?: FloorPlanCabinetsSettings,
  wallType?: WallType
) {
  return {
    wallType,
    wallHeightMm: pos.wall.heightMm,
    plinthHeightMm: cabSettings?.plinthHeightMm ?? DEFAULT_PLINTH_HEIGHT_MM,
    countertopThicknessMm: pos.wall.countertopConfig?.thicknessMm ?? DEFAULT_COUNTERTOP_REQUEST.thicknessMm,
    upperFillerHeightMm: cabSettings?.upperFillerHeightMm ?? DEFAULT_UPPER_FILLER_HEIGHT_MM,
    fillerWidthMm: cabSettings?.fillerWidthMm ?? DEFAULT_FILLER_WIDTH_MM
  };
}
