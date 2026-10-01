import { CabinetPosition, CabinetZone, getCabinetZone, KitchenCabinet, cabinetRequiresCountertop, WallWithCabinets } from '../model/kitchen-state.model';
import { WallType } from '../model/kitchen-project.model';
import { CabinetOnFloorPlan, FloorPlanOpening } from './floor-plan-door-arcs';
import { buildHorizontalLCornerShape, buildVerticalLCornerShape, HorizontalLCornerShape } from './floor-plan-corner-footprint';
import { planEndForElevationSide, verticalSegmentTopPx } from './floor-plan-orientation';
import { CornerJunctionSide, WallCornerConstraints, WallTopology } from '../service/corner-layout/corner-layout.model';
import { resolveCornerJunctionSide } from '../service/corner-layout/corner-junction-side.resolver';
import { resolveWallTopology } from '../service/corner-layout/wall-topology.resolver';
import { CountertopRunTrim } from '../service/corner-layout/corner-run-trims';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { isBlindType } from '../cabinet-form/model/corner-cabinet.model';
import { DEFAULT_COUNTERTOP_REQUEST } from '../model/countertop.model';
import { kitchenGeometrySharedSingleton } from '../service/kitchen-geometry.service';
import { ProjectWallAddonsRequestBuilder } from '../service/project-wall-addons-request.builder';

/** Default w `ProjectWallAddonsRequestBuilder.buildCountertopRequest` (sideOverhangExtraMm). */
const DEFAULT_SIDE_OVERHANG_EXTRA_MM = 5;
/** Default fillerWidthMm gdy ustawienia uzytkownika nie sa propagowane do floor plan. */
const DEFAULT_FILLER_WIDTH_MM = 50;
const DEFAULT_PLINTH_HEIGHT_MM = 100;
const FLOOR_PLAN_REFERENCE_WIDTH_MM = 4800;
const FLOOR_PLAN_REFERENCE_HEIGHT_MM = 3600;
const FLOOR_PLAN_ISLAND_VERTICAL_BUFFER_MM = 1200;
const FLOOR_PLAN_CAMERA_ZOOM = 0.82;

const geometryService = kitchenGeometrySharedSingleton;
const addonsBuilder = new ProjectWallAddonsRequestBuilder();
const DEFAULT_UPPER_FILLER_HEIGHT_MM = 0;

/** Settings needed for UPPER auto-repositioning in the floor plan. */
export interface FloorPlanCabinetsSettings {
  plinthHeightMm: number;
  upperFillerHeightMm: number;
  fillerWidthMm?: number;
  /** Strefy narożne i przypięcia ściany (`KitchenProjectLayoutService`); brak = ściana bez narożnika. */
  cornerConstraints?: WallCornerConstraints;
  /** Strona styku szafek narożnych z topologii projektu; bez wpisu — wnioskowana z położenia. */
  cornerJunctionSides?: ReadonlyMap<string, CornerJunctionSide>;
  /** Szafki objęte błędem narożnika (kolizja z szafką sąsiedniej ściany, dwie szafki narożne). */
  cornerConflictCabinetIds?: ReadonlySet<string>;
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
  /** Ściana na linii bazowej rzutu (na dole): MAIN albo zastępująca ją połączona CORNER_LEFT/RIGHT (D2). */
  isBaseLine?: boolean;
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
  /** Strefy narożne i przypięcia ściany — blat biegnie razem z przesuniętymi szafkami. */
  cornerConstraints?: WallCornerConstraints;
  /** Przycięcie przebiegu blatu w narożnikach (`ProjectCornerLayout.countertopTrimsByWallId`). */
  countertopTrim?: CountertopRunTrim;
  roomWidthMm?: number | null;
  roomDepthMm?: number | null;
  islandOffsetXmm?: number;
  islandOffsetYmm?: number;
}

export function buildWallPositions(
  walls: WallWithCabinets[],
  settings: Pick<FloorPlanLayoutSettings, 'svgWidth' | 'svgHeight' | 'wallThickness' | 'padding' | 'roomWidthMm' | 'roomDepthMm' | 'islandOffsetXmm' | 'islandOffsetYmm'>
): WallPosition[] {
  const positions: WallPosition[] = [];
  const mainWall = walls.find(wall => wall.type === 'MAIN');
  const leftWall = walls.find(wall => wall.type === 'LEFT');
  const rightWall = walls.find(wall => wall.type === 'RIGHT');
  const cornerLeft = walls.find(wall => wall.type === 'CORNER_LEFT');
  const cornerRight = walls.find(wall => wall.type === 'CORNER_RIGHT');
  const island = walls.find(wall => wall.type === 'ISLAND');

  const mainWidthMm = mainWall?.widthMm ?? 3000;
  // D2: bez ściany MAIN połączona ściana CORNER_LEFT/RIGHT przejmuje jej miejsce na dole rzutu.
  const topology = resolveWallTopology(walls);
  const baseCornerLeft = !mainWall && cornerLeft && isCornerWallA(topology, cornerLeft) ? cornerLeft : undefined;
  const baseCornerRight = !mainWall && cornerRight && isCornerWallA(topology, cornerRight) ? cornerRight : undefined;
  const baseLineWidthMm = mainWall?.widthMm
    ?? (((baseCornerLeft?.widthMm ?? 0) + (baseCornerRight?.widthMm ?? 0)) || 3000);
  const cornerLeftWidthMm = cornerLeft?.widthMm ?? 0;
  const cornerRightWidthMm = cornerRight?.widthMm ?? 0;
  const islandWidthMm = island?.widthMm ?? 0;
  const islandDepthMm = island?.islandDepthMm ?? island?.countertopConfig?.manualDepthMm ?? 900;
  const islandOffsetXmm = settings.islandOffsetXmm ?? 0;
  const islandOffsetYmm = settings.islandOffsetYmm ?? 0;
  const roomWidthMm = normalizePositiveDimension(settings.roomWidthMm);
  const roomDepthMm = normalizePositiveDimension(settings.roomDepthMm);
  const referenceWidthMm = roomWidthMm ?? FLOOR_PLAN_REFERENCE_WIDTH_MM;
  const referenceHeightMm = roomDepthMm ?? FLOOR_PLAN_REFERENCE_HEIGHT_MM;

  // Floor-plan zoom should stay reasonably stable when LEFT/RIGHT walls are added.
  // Using left/right lengths as horizontal footprint made the view jump dramatically,
  // even though those walls mostly expand the plan vertically, not horizontally.
  const footprintWidthMm = Math.max(
    referenceWidthMm,
    mainWidthMm + cornerLeftWidthMm + cornerRightWidthMm,
    islandWidthMm + Math.abs(islandOffsetXmm) * 2
  );

  const footprintHeightMm = Math.max(
    referenceHeightMm,
    (leftWall?.widthMm ?? 0) + cornerLeftWidthMm,
    (rightWall?.widthMm ?? 0) + cornerRightWidthMm,
    island ? islandDepthMm + FLOOR_PLAN_ISLAND_VERTICAL_BUFFER_MM + Math.max(islandOffsetYmm, 0) : 0
  );

  const scaleX = (settings.svgWidth - 2 * settings.padding) / footprintWidthMm;
  const scaleY = (settings.svgHeight - 2 * settings.padding) / footprintHeightMm;
  const scale = Math.min(scaleX, scaleY, 0.12) * FLOOR_PLAN_CAMERA_ZOOM;

  const centerX = settings.svgWidth / 2;
  // Tighter baseline + smaller outer padding make the floor-plan legible at 100% browser zoom
  // without changing the actual wall/cabinet proportions or the geometry source of truth.
  const centerY = settings.svgHeight - settings.padding - 16;

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
    const mainWidth = baseLineWidthMm * scale;
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
    const mainWidth = baseLineWidthMm * scale;
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

  if (baseCornerLeft) {
    const width = baseCornerLeft.widthMm * scale;
    const x = centerX - baseLineWidthMm * scale / 2;
    positions.push(baseLineWallPosition(baseCornerLeft, x, width, centerY, settings.wallThickness, scale));
  } else if (cornerLeft) {
    // TODO(naroznik-floor-L, FE-58): ściana „Narożnik lewy” (CORNER_LEFT) łączy się w topologii tylko wtedy, gdy projekt
    // NIE ma ściany głównej (MAIN) — zastępuje ją wtedy na dole rzutu (gałąź wyżej). Gdy MAIN istnieje, ściana LEWA łączy
    // się z MAIN, a CORNER_LEFT nie łączy się z niczym: nie ma stref narożnych, walidacji kolizji, cieni na elewacji ani
    // przycięć blatu. Rzut rysuje ją wtedy umownie nad ścianą LEWĄ, a jej szafki — po zewnętrznej stronie linii ściany
    // (poza pomieszczeniem). Do ustalenia, czym ta ściana ma być w takim projekcie (np. trzecie ramię kuchni przy
    // START ściany LEWEJ) i z którą ścianą się łączy. Analogicznie CORNER_RIGHT poniżej.
    const mainWidth = baseLineWidthMm * scale;
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

  if (baseCornerRight) {
    const width = baseCornerRight.widthMm * scale;
    const x = centerX + baseLineWidthMm * scale / 2 - width;
    positions.push(baseLineWallPosition(baseCornerRight, x, width, centerY, settings.wallThickness, scale));
  } else if (cornerRight) {
    // TODO(naroznik-floor-L, FE-58): niepołączona CORNER_RIGHT — jak CORNER_LEFT wyżej (rysowana nad ścianą PRAWĄ).
    const mainWidth = baseLineWidthMm * scale;
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
      x: centerX - width / 2 + islandOffsetXmm * scale,
      y: centerY - settings.wallThickness - 80 - depth - islandOffsetYmm * scale,
      width,
      height: depth,
      rotation: 0,
      labelX: centerX + islandOffsetXmm * scale,
      labelY: centerY - settings.wallThickness - 80 - depth / 2 - islandOffsetYmm * scale,
      isHorizontal: true,
      scale
    });
  }

  return positions;
}

/** Ściana A narożnika (MAIN albo zastępująca ją CORNER_LEFT/RIGHT) — rysowana na linii bazowej rzutu. */
function isCornerWallA(topology: WallTopology, wall: WallWithCabinets): boolean {
  return topology.corners.some(corner => corner.a.wallId === wall.id);
}

function baseLineWallPosition(
  wall: WallWithCabinets,
  x: number,
  width: number,
  centerY: number,
  wallThickness: number,
  scale: number
): WallPosition {
  return {
    wall,
    x,
    y: centerY - wallThickness,
    width,
    height: wallThickness,
    rotation: 0,
    labelX: x + width / 2,
    labelY: centerY + 12,
    isHorizontal: true,
    scale,
    isBaseLine: true
  };
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

    const isFreestanding = !cabinetRequiresCountertop(cabinet) && zone === 'BOTTOM';
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
      cabinet.type === KitchenCabinetType.PANTRY_PASSAGE ? referenceFrontDepth : undefined,
      classifyFloorPlanOpening(cabinet)
    );

    if (cabSettings?.cornerConflictCabinetIds?.has(cabinet.id)) {
      cabinetOnPlan.hasCornerCollision = true;
    }
    applyCornerLFootprint(cabinetOnPlan, cabinet, pos, geometryPosition.x, cabSettings?.cornerJunctionSides);

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
          !cabinetRequiresCountertop(cabinet) && getCabinetZone(cabinet) === 'BOTTOM',
          wallThickness,
          cabinetSide,
          undefined,
          classifyFloorPlanOpening(cabinet)
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

function normalizePositiveDimension(value: number | null | undefined): number | null {
  return typeof value === 'number' && value > 0 ? value : null;
}

export function buildCountertopsForWall(
  pos: WallPosition,
  settings: Pick<FloorPlanLayoutSettings, 'wallThickness' | 'countertopOverhang' | 'countertopStandardDepth' | 'fillerWidthMm' | 'cornerConstraints' | 'countertopTrim'>
): CountertopOnFloorPlan[] {
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
      fillerWidthMm: settings.fillerWidthMm,
      cornerConstraints: settings.cornerConstraints
    })
  );
  const positionMap = new Map(positions.map(position => [position.cabinetId, position]));
  const fillerWidthMm = settings.fillerWidthMm ?? DEFAULT_FILLER_WIDTH_MM;
  return computeCountertopRunsMm(wall, positions, fillerWidthMm, settings.countertopTrim)
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

    if (cabinetRequiresCountertop(cabinet)) {
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

/**
 * Przebiegi blatu ściany wzdłuż szafek z blatem, przerywane słupkami i wolnostojącym AGD. Przycięcie z narożnika
 * zmienia początek pierwszego i koniec ostatniego przebiegu (jak backend: `CountertopCalculationService`);
 * przycięcie, które odwróciłoby przebieg, jest pomijane.
 */
export function computeCountertopRunsMm(
  wall: Pick<WallWithCabinets, 'widthMm' | 'countertopConfig'> & { cabinets: KitchenCabinet[] },
  cabinetPositions: CabinetPosition[],
  fillerWidthMm = DEFAULT_FILLER_WIDTH_MM,
  trim?: CountertopRunTrim
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

    if (cabinetRequiresCountertop(cabinet)) {
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
  return applyCountertopRunTrim(result, trim, wall.widthMm);
}

function applyCountertopRunTrim(
  runs: CountertopRunMm[],
  trim: CountertopRunTrim | undefined,
  wallWidthMm: number
): CountertopRunMm[] {
  if (!trim || runs.length === 0) {
    return runs;
  }
  const clamp = (valueMm: number) => Math.max(0, Math.min(wallWidthMm, valueMm));
  const trimmed = runs.map(run => ({ ...run }));
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if (trim.startMm !== undefined) {
    first.startMm = clamp(trim.startMm);
  }
  if (trim.endMm !== undefined) {
    last.endMm = clamp(trim.endMm);
  }
  if (trimmed.some(run => run.endMm <= run.startMm)) {
    return runs;
  }
  return trimmed.map(run => ({ ...run, lengthMm: run.endMm - run.startMm }));
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
      (cabinet.cabinetSide ?? 'FRONT') === cabinetSide && cabinetRequiresCountertop(cabinet)
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
  const y = verticalSegmentTopPx(pos.wall.type, pos.y, pos.height, startMm * scale, countertopWidth);
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
  frontAlignedDepth?: number,
  opening?: FloorPlanOpening
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
      isReversed: wallType === 'ISLAND' && cabinetSide === 'BACK',
      opening
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
      cabinetSide,
      opening
    };
  }

  return {
    cabinetId,
    name,
    x: pos.x - (frontAlignedDepth && frontAlignedDepth > cabinetDepth ? frontAlignedDepth : cabinetDepth),
    y: verticalSegmentTopPx(wallType, pos.y, pos.height, posX, cabinetWidth),
    width: cabinetDepth,
    depth: cabinetWidth,
    zone,
    isCorner,
    isFreestanding,
    wallType,
    cabinetSide,
    opening
  };
}

/**
 * Klasyfikuje sposób otwierania szafki na floor planie z pełnego modelu `KitchenCabinet`.
 * Kluczowe przypadki (zgłoszenie usera):
 * - szafka ślepa (CORNER_CABINET Type B) → pojedyncze drzwi TYLKO na froncie uchylnym
 *   (`cornerFrontUchylnyWidthMm` z całości `width`), umiejscowione po stronie zawiasów (`cornerHandedness`),
 * - szafki z szufladami / koszami cargo / frontem szufladowym → prostokąt wysuwu (DRAWER), nie łuk.
 * Pozostałe typy zachowują dotychczasowe zachowanie (pojedyncze albo podwójne drzwi).
 */
export function classifyFloorPlanOpening(cabinet: KitchenCabinet): FloorPlanOpening {
  switch (cabinet.type) {
    case KitchenCabinetType.BASE_OPEN:
    case KitchenCabinetType.UPPER_OPEN_SHELF:
      return { kind: 'NONE' };

    case KitchenCabinetType.BASE_WITH_DRAWERS:
    case KitchenCabinetType.BASE_CARGO:
      return { kind: 'DRAWER' };

    case KitchenCabinetType.BASE_SINK:
      if (cabinet.sinkFrontType === 'DRAWER') return { kind: 'DRAWER' };
      if (cabinet.sinkFrontType === 'TWO_DOORS') return { kind: 'DOUBLE_DOOR' };
      return { kind: 'SINGLE_DOOR' };

    case KitchenCabinetType.BASE_COOKTOP:
      if (cabinet.cooktopFrontType === 'DRAWERS') return { kind: 'DRAWER' };
      if (cabinet.cooktopFrontType === 'TWO_DOORS') return { kind: 'DOUBLE_DOOR' };
      return { kind: 'SINGLE_DOOR' };

    case KitchenCabinetType.BASE_OVEN:
      if (cabinet.ovenLowerSectionType === 'LOW_DRAWER') return { kind: 'DRAWER' };
      if (cabinet.ovenLowerSectionType === 'HINGED_DOOR') return { kind: 'SINGLE_DOOR' };
      return { kind: 'NONE' };

    case KitchenCabinetType.BASE_TWO_DOOR:
      return { kind: 'DOUBLE_DOOR' };

    case KitchenCabinetType.PANTRY_PASSAGE:
      return { kind: cabinet.pantryPassageFrontType === 'TWO_DOORS' ? 'DOUBLE_DOOR' : 'SINGLE_DOOR' };

    case KitchenCabinetType.CORNER_CABINET:
      return classifyCornerOpening(cabinet);

    default:
      return { kind: 'SINGLE_DOOR' };
  }
}

function classifyCornerOpening(cabinet: KitchenCabinet & { type: KitchenCabinetType.CORNER_CABINET }): FloorPlanOpening {
  // Type B (ślepy narożnik): otwiera się tylko front uchylny — wąski wycinek całej szerokości.
  if (isBlindType(cabinet.cornerMechanism)) {
    const totalWidth = cabinet.width > 0 ? cabinet.width : cabinet.cornerWidthA;
    const frontWidth = cabinet.cornerFrontUchylnyWidthMm ?? 0;
    if (!(totalWidth > 0) || !(frontWidth > 0)) {
      return { kind: 'SINGLE_DOOR' };
    }
    const fraction = Math.min(1, frontWidth / totalWidth);
    // Front uchylny stoi po stronie zawiasów (handedness); domyślnie LEFT.
    if (cabinet.cornerHandedness === 'RIGHT') {
      return { kind: 'SINGLE_DOOR', hingeSide: 'RIGHT', spanStartFraction: 1 - fraction, spanEndFraction: 1 };
    }
    return { kind: 'SINGLE_DOOR', hingeSide: 'LEFT', spanStartFraction: 0, spanEndFraction: fraction };
  }

  // Type A: dwoje drzwi spotykających się w środku, harmonijka = jedno składane skrzydło (pełna szerokość).
  if (cabinet.cornerOpeningType === 'BIFOLD') {
    return { kind: 'SINGLE_DOOR' };
  }
  return { kind: 'DOUBLE_DOOR' };
}

/**
 * Dla szafki narożnej Type A (L-kształt, NIE ślepej) dokleja do `CabinetOnFloorPlan` obrys „L"
 * (`cornerFootprintPath`) oraz gotowe łuki otwierania frontów spotykające się w rogu wewnętrznym „L"
 * (`cornerDoorArcs`).
 *
 * <p>Strona styku (ramię boczne) pochodzi z `cornerHandedness`, a w razie braku — z topologii narożników projektu
 * (`junctionSides`); dla szafki poza narożnikiem — z położenia na ścianie. Ramię boczne leży wzdłuż sąsiedniej
 * ściany, której szafki zaczynają się za strefą narożną, więc narożnik jest widoczny po obu stronach styku.
 * Obsługiwane są ściany na linii bazowej (MAIN i połączona CORNER_LEFT/RIGHT wg D2) oraz pionowe LEFT/RIGHT.</p>
 */
function applyCornerLFootprint(
  cabinetOnPlan: CabinetOnFloorPlan,
  cabinet: KitchenCabinet,
  pos: WallPosition,
  geometryXmm: number,
  junctionSides?: ReadonlyMap<string, CornerJunctionSide>
): void {
  if (cabinet.type !== KitchenCabinetType.CORNER_CABINET) {
    return;
  }
  const wall = pos.wall;
  const onBaseLine = wall.type === 'MAIN' || pos.isBaseLine === true;
  // TODO(naroznik-floor-L, FE-58): szafka narożna na niepołączonej ścianie CORNER_LEFT/RIGHT (opis w
  // `buildWallPositions`) i na wyspie zostaje prostokątem — bez obrysu „L”.
  if (!onBaseLine && wall.type !== 'LEFT' && wall.type !== 'RIGHT') {
    return;
  }
  // Ślepy narożnik (Type B) jest prostokątny — bez obrysu „L".
  if (isBlindType(cabinet.cornerMechanism)) {
    return;
  }

  const armSideMm = cabinet.cornerWidthB;
  if (!armSideMm || !(armSideMm > 0)) {
    return;
  }

  // Tylko TWO_DOORS daje front na obu ramionach (2 łuki). BIFOLD (harmonijka na ramieniu głównym)
  // i BLIND (ramię boczne bez frontu — mapowane na ONE_DOOR) mają jeden front → 1 łuk.
  const doubleDoor = cabinet.cornerOpeningType === 'TWO_DOORS';
  const armSidePx = armSideMm * pos.scale;
  // Strona styku w elewacji (LEFT = od START ściany).
  const elevationSide: CornerJunctionSide = cabinet.cornerHandedness === 'LEFT'
    ? 'LEFT'
    : cabinet.cornerHandedness === 'RIGHT'
      ? 'RIGHT'
      : resolveCornerJunctionSide(cabinet.id, junctionSides, {
        x: geometryXmm,
        width: cabinet.width,
        wallWidth: wall.widthMm
      });

  let shape: HorizontalLCornerShape | null;
  if (onBaseLine) {
    shape = buildHorizontalLCornerShape({
      cabinetId: cabinetOnPlan.cabinetId,
      x: cabinetOnPlan.x,
      wallY: cabinetOnPlan.y + cabinetOnPlan.depth,
      armMainPx: cabinetOnPlan.width,
      armSidePx,
      depthPx: cabinetOnPlan.depth,
      junction: elevationSide,
      doubleDoor
    });
  } else {
    // Ściana pionowa: ramię główne biegnie pionowo wzdłuż ściany (cabinetOnPlan.depth = widthA × skala),
    // korpus wychodzi w głąb pomieszczenia (cabinetOnPlan.width = głębokość × skala).
    const side: 'LEFT' | 'RIGHT' = wall.type === 'LEFT' ? 'LEFT' : 'RIGHT';
    // wallX = krawędź korpusu przy ścianie: LEFT → lewa (korpus w prawo), RIGHT → prawa (korpus w lewo).
    const wallX = side === 'LEFT' ? cabinetOnPlan.x : cabinetOnPlan.x + cabinetOnPlan.width;
    // Strona styku w elewacji → koniec prostokąta na rzucie; ściana RIGHT jest odwrócona.
    const junction = planEndForElevationSide(wall.type, elevationSide);

    shape = buildVerticalLCornerShape({
      cabinetId: cabinetOnPlan.cabinetId,
      side,
      wallX,
      anchorY: cabinetOnPlan.y,
      armMainPx: cabinetOnPlan.depth,
      armSidePx,
      depthPx: cabinetOnPlan.width,
      junction,
      doubleDoor
    });
  }

  if (!shape) {
    return;
  }

  cabinetOnPlan.cornerFootprintPath = shape.pathD;
  cabinetOnPlan.cornerDoorArcs = shape.doorArcs;
  cabinetOnPlan.cornerBlockingRects = shape.blockingRects;
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
    fillerWidthMm: cabSettings?.fillerWidthMm ?? DEFAULT_FILLER_WIDTH_MM,
    wallWidthMm: pos.wall.widthMm,
    cornerConstraints: cabSettings?.cornerConstraints
  };
}
