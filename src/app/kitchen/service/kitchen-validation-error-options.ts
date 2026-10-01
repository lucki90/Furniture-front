import { ApiErrorDisplayOptions } from '../../core/error/api-error.model';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { WALL_TYPES } from '../model/kitchen-project.model';

const CABINET_ARGUMENT_PATTERN = /^cabinetId\d*$/;

/**
 * Zamienia techniczne ID szafki na jej aktualną pozycję widoczną na danej ścianie.
 * Numer jest wyliczany z bieżącej kolejności kart, a nie z licznika użytego do utworzenia ID.
 */
export function createKitchenValidationErrorOptions(walls: WallWithCabinets[]): ApiErrorDisplayOptions {
  const cabinetLabels = new Map<string, string>();

  for (const wall of walls) {
    const wallLabel = WALL_TYPES.find(type => type.value === wall.type)?.label ?? wall.type;
    const islandSideCounters = { FRONT: 0, BACK: 0 };

    wall.cabinets.forEach((cabinet, index) => {
      const side = cabinet.cabinetSide ?? 'FRONT';
      const cabinetNumber = wall.type === 'ISLAND'
        ? ++islandSideCounters[side]
        : index + 1;
      const name = cabinet.name?.trim();
      const islandSideLabel = wall.type === 'ISLAND' ? `, strona ${side}` : '';
      cabinetLabels.set(
        cabinet.id,
        `#${cabinetNumber}${name ? ` „${name}”` : ''} (${wallLabel}${islandSideLabel})`
      );
    });
  }

  return {
    formatArgument: (key, value) => CABINET_ARGUMENT_PATTERN.test(key)
      ? cabinetLabels.get(value) ?? value
      : value
  };
}
