import { KitchenCabinetType } from '../../cabinet-form/model/kitchen-cabinet-type';
import { CornerHandleType, CornerMechanismType } from '../../cabinet-form/model/corner-cabinet.model';
import { WallType } from '../../model/kitchen-project.model';
import { CabinetPosition, KitchenCabinet, WallWithCabinets } from '../../model/kitchen-state.model';
import { CornerGeometrySettings, WallTopology } from './corner-layout.model';
import { CabinetPositionsByWallId } from './corner-footprint.builder';
import { resolveWallTopology } from './wall-topology.resolver';

/**
 * Wspólne dane specy geometrii narożnika. Przypadki wzorcowe G1–G8 mają te same nazwy i wartości co testy backendu
 * (`CornerFixtures`, `CornerIssueDetectorTest`) — patrz `_docs/plan-narozniki-cross-wall.md`.
 */

/** Front 18 mm, luz narożny i blenda obudowy 50 mm. */
export const CORNER_TEST_SETTINGS: CornerGeometrySettings = {
  defaultFrontThicknessMm: 18,
  cornerClearanceMm: 50,
  enclosureFillerWidthMm: 50
};

/** Szafka z pozycją X lewej krawędzi korpusu na jej ścianie. */
export interface PlacedCabinet {
  cabinet: KitchenCabinet;
  x: number;
}

export interface CornerTestWall {
  wall: WallWithCabinets;
  positions: CabinetPosition[];
}

export interface CornerTestProject {
  walls: WallWithCabinets[];
  positionsByWallId: CabinetPositionsByWallId;
  topology: WallTopology;
}

export function testWall(type: WallType, widthMm: number, ...placed: PlacedCabinet[]): CornerTestWall {
  return {
    wall: { id: type.toLowerCase(), type, widthMm, heightMm: 2600, cabinets: placed.map(item => item.cabinet) },
    positions: placed.map(item => ({
      cabinetId: item.cabinet.id,
      x: item.x,
      y: 0,
      width: item.cabinet.width,
      height: item.cabinet.height
    }))
  };
}

export function testProject(...walls: CornerTestWall[]): CornerTestProject {
  const wallList = walls.map(item => item.wall);
  return {
    walls: wallList,
    positionsByWallId: new Map(walls.map(item => [item.wall.id, item.positions])),
    topology: resolveWallTopology(wallList)
  };
}

export function base(id: string, x: number, width: number): PlacedCabinet {
  return placed(id, KitchenCabinetType.BASE_ONE_DOOR, x, width, 720, 560);
}

export function upper(id: string, x: number, width: number): PlacedCabinet {
  return placed(id, KitchenCabinetType.UPPER_ONE_DOOR, x, width, 720, 320);
}

export function tall(id: string, x: number, width: number): PlacedCabinet {
  return placed(id, KitchenCabinetType.TALL_CABINET, x, width, 2100, 560);
}

export function lCorner(id: string, x: number, widthA: number, widthB: number): PlacedCabinet {
  return placed(id, KitchenCabinetType.CORNER_CABINET, x, widthA, 720, 510, {
    cornerWidthA: widthA,
    cornerWidthB: widthB,
    cornerMechanism: CornerMechanismType.FIXED_SHELVES,
    isUpperCorner: false
  });
}

export function blindCorner(
  id: string,
  x: number,
  width: number,
  openingFrontMm: number,
  overrides: Record<string, unknown> = {}
): PlacedCabinet {
  return placed(id, KitchenCabinetType.CORNER_CABINET, x, width, 720, 510, {
    cornerWidthA: width,
    cornerMechanism: CornerMechanismType.BLIND_CORNER,
    isUpperCorner: false,
    cornerFrontUchylnyWidthMm: openingFrontMm,
    cornerHandleType: CornerHandleType.SCREWED,
    ...overrides
  });
}

export function upperBlindCorner(id: string, x: number, width: number, openingFrontMm: number): PlacedCabinet {
  return placed(id, KitchenCabinetType.CORNER_CABINET, x, width, 720, 320, {
    cornerWidthA: width,
    cornerMechanism: CornerMechanismType.BLIND_CORNER,
    isUpperCorner: true,
    cornerFrontUchylnyWidthMm: openingFrontMm,
    cornerHandleType: CornerHandleType.SCREWED
  });
}

export function placed(
  id: string,
  type: KitchenCabinetType,
  x: number,
  width: number,
  height: number,
  depth: number,
  extra: Record<string, unknown> = {}
): PlacedCabinet {
  const cabinet = { id, type, width, height, depth, openingType: 'LEFT', shelfQuantity: 1, ...extra } as unknown as KitchenCabinet;
  return { cabinet, x };
}
