import { CornerFootprint, CornerOwnership, WallCorner } from './corner-layout.model';
import { isCornerCabinetAtCorner } from './corner-footprint.builder';

/**
 * Właściciel narożnika z geometrii: ściana, której szafka narożna stoi w narożniku. Bez szafki narożnej
 * właścicielem jest ściana A (MAIN albo CORNER_LEFT/CORNER_RIGHT). Gdy szafki narożne stoją po obu stronach,
 * właścicielem pozostaje ściana A, a konflikt zgłasza detektor problemów.
 *
 * Spójne z backendem: `CornerOwnershipResolver`.
 */
export function resolveCornerOwnership(corner: WallCorner, footprints: readonly CornerFootprint[]): CornerOwnership {
  const cornerCabinetsAtCorner = footprints
    .filter(isCornerCabinetAtCorner)
    .sort((left, right) => left.nearEdgeMm - right.nearEdgeMm);

  const onWallA = cornerCabinetsAtCorner.find(footprint => footprint.wallId === corner.a.wallId) ?? null;
  const onWallB = cornerCabinetsAtCorner.find(footprint => footprint.wallId === corner.b.wallId) ?? null;

  if (onWallB && !onWallA) {
    return { ownerWallId: corner.b.wallId, ownerCornerCabinet: onWallB, cornerCabinetsAtCorner };
  }
  return { ownerWallId: corner.a.wallId, ownerCornerCabinet: onWallA, cornerCabinetsAtCorner };
}

/** Czy w narożniku stoją szafki narożne z obu ścian. */
export function hasCornerCabinetsOnBothWalls(ownership: CornerOwnership): boolean {
  return new Set(ownership.cornerCabinetsAtCorner.map(footprint => footprint.wallId)).size > 1;
}
