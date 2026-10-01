import { WallConnectionRequest, WallConnectionType, WallType } from '../../model/kitchen-project.model';
import { WallWithCabinets } from '../../model/kitchen-state.model';
import { WallCorner, WallEnd, WallTopology } from './corner-layout.model';

interface CornerRule {
  sideWallType: Extract<WallType, 'LEFT' | 'RIGHT'>;
  fallbackHorizontalType: Extract<WallType, 'CORNER_LEFT' | 'CORNER_RIGHT'>;
  connectionType: WallConnectionType;
  endA: WallEnd;
  endB: WallEnd;
}

/**
 * Reguły połączeń w widoku z wnętrza kuchni. Ściana LEFT dochodzi do lewego końca ściany poziomej swoim prawym
 * końcem; ściana RIGHT dochodzi do prawego końca ściany poziomej swoim lewym końcem.
 * Spójne z backendem: WallTopologyResolver i javadoc WallConnectionType.
 */
const CORNER_RULES: readonly CornerRule[] = [
  { sideWallType: 'LEFT', fallbackHorizontalType: 'CORNER_LEFT', connectionType: 'L_CORNER_LEFT', endA: 'START', endB: 'END' },
  { sideWallType: 'RIGHT', fallbackHorizontalType: 'CORNER_RIGHT', connectionType: 'L_CORNER_RIGHT', endA: 'END', endB: 'START' }
];

/**
 * Wyznacza narożniki projektu wyłącznie z typów ścian — nie z kolejności ścian ani zapisanych indeksów
 * (kolejność zmienia się po ponownym wczytaniu projektu).
 *
 * Ściana LEFT łączy się z MAIN, a gdy jej brak — z pierwszą ścianą CORNER_LEFT. Analogicznie RIGHT
 * z MAIN albo CORNER_RIGHT. Połączenie dostaje tylko pierwsza ściana LEFT i pierwsza ściana RIGHT.
 */
export function resolveWallTopology(walls: readonly WallWithCabinets[]): WallTopology {
  const main = walls.find(wall => wall.type === 'MAIN');
  const corners: WallCorner[] = [];

  for (const rule of CORNER_RULES) {
    const sideWall = walls.find(wall => wall.type === rule.sideWallType);
    const horizontalWall = main ?? walls.find(wall => wall.type === rule.fallbackHorizontalType);
    if (!sideWall || !horizontalWall) {
      continue;
    }
    corners.push({
      id: `${horizontalWall.id}:${sideWall.id}`,
      connectionType: rule.connectionType,
      a: { wallId: horizontalWall.id, wallType: horizontalWall.type, end: rule.endA },
      b: { wallId: sideWall.id, wallType: sideWall.type, end: rule.endB }
    });
  }

  return { corners };
}

/** Narożnik na danym końcu ściany albo `undefined`, gdy ten koniec nie styka się z inną ścianą. */
export function cornerAt(topology: WallTopology, wallId: string, end: WallEnd): WallCorner | undefined {
  return topology.corners.find(corner =>
    (corner.a.wallId === wallId && corner.a.end === end)
    || (corner.b.wallId === wallId && corner.b.end === end)
  );
}

/**
 * Mapuje topologię na połączenia requestu. Indeksy odpowiadają kolejności `walls`, w której budowane są ściany
 * requestu (`ProjectRequestBuilderService.buildProjectWalls`).
 */
export function toWallConnectionRequests(
  topology: WallTopology,
  walls: readonly WallWithCabinets[]
): WallConnectionRequest[] {
  const indexById = new Map(walls.map((wall, index) => [wall.id, index]));

  return topology.corners.flatMap(corner => {
    const wallIndexA = indexById.get(corner.a.wallId);
    const wallIndexB = indexById.get(corner.b.wallId);
    if (wallIndexA === undefined || wallIndexB === undefined) {
      return [];
    }
    return [{ wallIndexA, wallIndexB, connectionType: corner.connectionType }];
  });
}
