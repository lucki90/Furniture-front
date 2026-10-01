import { CornerJointSettings, CornerJointType, CornerPassThrough } from '../../model/countertop.model';
import { WallWithCabinets } from '../../model/kitchen-state.model';
import { WallCorner } from './corner-layout.model';

/** Sposób łączenia blatów, gdy ściana boczna narożnika nie ma zapisanego ustawienia. */
export const DEFAULT_CORNER_JOINT_TYPE: CornerJointType = 'LYZWA';

/**
 * Połączenie blatów w narożniku po rozstrzygnięciu ustawień. Spójne z backendem: `CornerJointConfig`.
 * - `passThroughWallId` — ściana, której blat przechodzi przez narożnik z wyboru użytkownika; `null` — decyduje
 *   reguła z układu narożnika (`resolveCornerOwnership`).
 */
export interface CornerJointConfig {
  type: CornerJointType;
  passThroughWallId: string | null;
}

/**
 * Jedyne miejsce fallbacków połączenia blatów w narożniku: ustawienie `cornerJoint` w konfiguracji blatu ściany B
 * (LEFT/RIGHT), a bez niego łyżwa i blat przechodzący z reguły. Frontend nie wysyła starszej podpowiedzi
 * `WallConnectionRequest.cornerJointType`, więc jej nie uwzględnia.
 *
 * Spójne z backendem: `CornerJointConfigResolver`.
 */
export function resolveCornerJointConfig(corner: WallCorner, walls: readonly WallWithCabinets[]): CornerJointConfig {
  const settings = cornerJointSettingsOf(corner, walls);
  return {
    type: settings?.type ?? DEFAULT_CORNER_JOINT_TYPE,
    passThroughWallId: passThroughWallId(settings?.passThrough, corner)
  };
}

/** Zapisane ustawienie połączenia narożnego — zawsze w konfiguracji blatu ściany B narożnika. */
export function cornerJointSettingsOf(
  corner: WallCorner,
  walls: readonly WallWithCabinets[]
): CornerJointSettings | undefined {
  return walls.find(wall => wall.id === corner.b.wallId)?.countertopConfig?.cornerJoint;
}

function passThroughWallId(passThrough: CornerPassThrough | null | undefined, corner: WallCorner): string | null {
  switch (passThrough) {
    case 'THIS_WALL':
      return corner.b.wallId;
    case 'NEIGHBOR':
      return corner.a.wallId;
    default:
      return null;
  }
}
