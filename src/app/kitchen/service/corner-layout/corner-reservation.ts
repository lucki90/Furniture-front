import { CornerFootprint, CornerGeometrySettings } from './corner-layout.model';
import { isBlindCornerFootprint, partnerWallArmLengthMm } from './corner-footprint.builder';

/** Dane do wyznaczenia strefy narożnej na ścianie dostawionej (nie-właścicielu narożnika) na jednym poziomie. */
export interface CornerReservationInput {
  /** Rzuty szafek ściany-właściciela na tym poziomie. */
  ownerFootprints: readonly CornerFootprint[];
  /** Szafka narożna właściciela stojąca w narożniku albo `null`. */
  ownerCornerCabinet: CornerFootprint | null;
  /** Największy zasięg szafek ściany dostawionej na tym poziomie; 0, gdy nie ma tam szafek. */
  partnerMaxReachMm: number;
  settings: CornerGeometrySettings;
}

/**
 * Długość strefy narożnej, od której zaczyna się układ ściany dostawionej (mm od narożnika):
 * - szafka L właściciela — długość jej ramienia wzdłuż ściany dostawionej (`cornerWidthB`),
 * - szafka narożna typu B właściciela — jej zasięg (korpus i front); blenda X należy do ślepej części,
 * - bez szafki narożnej — największy zasięg szafek właściciela stojących w kwadracie narożnym i luz narożny;
 *   0, gdy w kwadracie nie stoi żadna szafka właściciela albo ściana dostawiona nie ma szafek tego poziomu.
 *
 * Twarda kolizja backendu (`ex.cabinets.overlap.cross.wall`) zawsze mieści się w tej strefie.
 */
export function resolveCornerReservationMm(input: CornerReservationInput): number {
  const { ownerFootprints, ownerCornerCabinet, partnerMaxReachMm, settings } = input;

  if (ownerCornerCabinet) {
    const armLengthMm = partnerWallArmLengthMm(ownerCornerCabinet.cabinet);
    if (armLengthMm !== null) {
      return armLengthMm;
    }
    if (isBlindCornerFootprint(ownerCornerCabinet)) {
      return ownerCornerCabinet.reachMm;
    }
  }

  if (partnerMaxReachMm <= 0) {
    return 0;
  }
  const ownerReachInSquareMm = ownerFootprints
    .filter(footprint => footprint.nearEdgeMm < partnerMaxReachMm)
    .reduce((max, footprint) => Math.max(max, footprint.reachMm), 0);

  return ownerReachInSquareMm > 0 ? ownerReachInSquareMm + settings.cornerClearanceMm : 0;
}
