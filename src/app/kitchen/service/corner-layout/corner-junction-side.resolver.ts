import { WallWithCabinets } from '../../model/kitchen-state.model';
import { CORNER_LEVELS, CornerGeometrySettings, CornerJunctionSide, WallTopology } from './corner-layout.model';
import { buildCornerFootprints, CabinetPositionsByWallId, isCornerCabinetAtCorner } from './corner-footprint.builder';

/**
 * Strona styku szafek narożnych stojących w narożniku projektu: narożnik na START ściany → lewa strona elewacji,
 * na END → prawa. Szafki narożne poza narożnikiem nie mają wpisu.
 */
export function resolveCornerJunctionSides(
  topology: WallTopology,
  walls: readonly WallWithCabinets[],
  positionsByWallId: CabinetPositionsByWallId,
  settings: CornerGeometrySettings
): Map<string, CornerJunctionSide> {
  const sides = new Map<string, CornerJunctionSide>();
  for (const corner of topology.corners) {
    for (const level of CORNER_LEVELS) {
      for (const footprint of buildCornerFootprints(corner, walls, positionsByWallId, level, settings)) {
        if (isCornerCabinetAtCorner(footprint)) {
          sides.set(footprint.cabinet.id, footprint.wallEnd === 'START' ? 'LEFT' : 'RIGHT');
        }
      }
    }
  }
  return sides;
}

/**
 * Strona styku szafki narożnej na elewacji: z topologii projektu, a dla ściany bez połączonego narożnika — z położenia
 * szafki (środek w lewej połowie ściany → lewa strona). Pozycja i szerokość ściany w tych samych jednostkach.
 */
export function resolveCornerJunctionSide(
  cabinetId: string,
  junctionSides: ReadonlyMap<string, CornerJunctionSide> | undefined,
  position: { x: number; width: number; wallWidth: number }
): CornerJunctionSide {
  const fromTopology = junctionSides?.get(cabinetId);
  if (fromTopology) {
    return fromTopology;
  }
  return position.x + position.width / 2 <= position.wallWidth / 2 ? 'LEFT' : 'RIGHT';
}
