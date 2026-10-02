import { CornerJointSettings, CornerJointType, CornerPassThrough } from '../model/countertop.model';
import { WallType } from '../model/kitchen-project.model';
import { CountertopConfig, WallWithCabinets } from '../model/kitchen-state.model';
import { resolveCornerJointConfig } from '../service/corner-layout/corner-joint-config';
import { WallTopology } from '../service/corner-layout/corner-layout.model';
import { CountertopCornerJoint } from '../service/corner-layout/corner-run-trims';

/** Wybór blatu przechodzącego: `AUTO` albo identyfikator ściany, której blat przechodzi przez narożnik. */
export type PassThroughChoice = 'AUTO' | string;

export interface PassThroughOption {
  value: PassThroughChoice;
  label: string;
}

/**
 * Ustawienia połączenia blatów jednego narożnika aktualnej ściany.
 * - `sideWallId` — ściana B narożnika, w której konfiguracji blatu zapisane jest połączenie,
 * - `joined` — czy blaty w tym narożniku się stykają (bez tego ustawienie nie zmienia wyniku).
 */
export interface CornerJointSettingsView {
  cornerId: string;
  title: string;
  sideWallId: string;
  type: CornerJointType;
  passThroughChoice: PassThroughChoice;
  passThroughOptions: readonly PassThroughOption[];
  joined: boolean;
}

/**
 * Narożniki aktualnej ściany z ustawieniami połączenia blatów. Ustawienie jest widoczne na obu ścianach narożnika,
 * a zapisywane zawsze w konfiguracji blatu ściany B (`resolveCornerJointConfig`).
 */
export function buildCornerJointSettingsViews(
  selectedWallId: string | null,
  topology: WallTopology,
  walls: readonly WallWithCabinets[],
  joints: readonly CountertopCornerJoint[],
  wallLabel: (type: WallType) => string
): CornerJointSettingsView[] {
  if (!selectedWallId) {
    return [];
  }
  return topology.corners
    .filter(corner => corner.a.wallId === selectedWallId || corner.b.wallId === selectedWallId)
    .map(corner => {
      const neighbor = corner.a.wallId === selectedWallId ? corner.b : corner.a;
      const neighborLabel = `«${wallLabel(neighbor.wallType)}»`;
      const config = resolveCornerJointConfig(corner, walls);
      const joint = joints.find(candidate => candidate.cornerId === corner.id);
      return {
        cornerId: corner.id,
        title: `Narożnik z ${neighborLabel}`,
        sideWallId: corner.b.wallId,
        type: config.type,
        passThroughChoice: config.passThroughWallId ?? 'AUTO',
        passThroughOptions: [
          { value: 'AUTO', label: autoLabel(joint, selectedWallId, neighborLabel) },
          { value: selectedWallId, label: 'Ta ściana' },
          { value: neighbor.wallId, label: neighborLabel }
        ],
        joined: joint !== undefined
      };
    });
}

/** Ustawienie z wyboru w panelu, zapisywane z punktu widzenia ściany B narożnika. */
export function toCornerPassThrough(
  choice: PassThroughChoice,
  view: Pick<CornerJointSettingsView, 'sideWallId'>
): CornerPassThrough {
  if (choice === 'AUTO') {
    return 'AUTO';
  }
  return choice === view.sideWallId ? 'THIS_WALL' : 'NEIGHBOR';
}

/** Konfiguracja blatu ściany B z nowym ustawieniem połączenia narożnego. */
export function withCornerJointSettings(
  sideWall: WallWithCabinets | undefined,
  patch: CornerJointSettings
): CountertopConfig {
  const config = sideWall?.countertopConfig ?? { enabled: true };
  return { ...config, cornerJoint: { ...config.cornerJoint, ...patch } };
}

function autoLabel(joint: CountertopCornerJoint | undefined, selectedWallId: string, neighborLabel: string): string {
  if (!joint) {
    return 'Automatycznie';
  }
  return joint.ruleOwnerWallId === selectedWallId
    ? 'Automatycznie (ta ściana)'
    : `Automatycznie (${neighborLabel})`;
}
