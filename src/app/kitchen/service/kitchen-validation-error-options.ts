import { ApiErrorDisplayOptions } from '../../core/error/api-error.model';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { WALL_TYPES } from '../model/kitchen-project.model';

/** Argumenty z ID szafki: `cabinetId`, `cabinetId1`, `cabinetId2` oraz `blockingCabinetId` (ostrzeżenia narożnika). */
const CABINET_ARGUMENT_PATTERN = /^(?:cabinetId(\d*)|(blocking)CabinetId)$/;

export interface CabinetLabel {
  /** Numer i nazwa szafki, np. `#2 „Zlew”`. */
  cabinet: string;
  /** Kontekst ściany, np. `Ściana główna` albo `Wyspa kuchenna, strona FRONT`. */
  wall: string;
}

/**
 * Zamienia techniczne ID szafki na jej aktualną pozycję widoczną na danej ścianie.
 * Numer jest wyliczany z bieżącej kolejności kart, a nie z licznika użytego do utworzenia ID.
 * Ściana jest dopisywana do etykiety, chyba że komunikat ma własny argument ściany dla tej szafki
 * (`wallType`, `wallType1`, `wallType2`, `blockingWallType` — np. narożnik), żeby nie powtarzać jej dwa razy.
 */
export function createKitchenValidationErrorOptions(walls: WallWithCabinets[]): ApiErrorDisplayOptions {
  const cabinetLabels = buildCabinetLabels(walls);

  return {
    formatArgument: (key, value, args) => {
      const match = CABINET_ARGUMENT_PATTERN.exec(key);
      const label = match ? cabinetLabels.get(value) : undefined;
      if (!match || !label) {
        return value;
      }
      const wallKey = match[2] ? 'blockingWallType' : `wallType${match[1]}`;
      return args?.[wallKey] ? label.cabinet : `${label.cabinet} (${label.wall})`;
    }
  };
}

/**
 * Etykiety szafek widoczne dla użytkownika: numer z bieżącej kolejności kart ściany (na wyspie — osobno dla każdej
 * strony) i nazwa nadana przez użytkownika. Nazwa równa ID szafki (wczytany projekt bez nazwy) jest pomijana.
 */
export function buildCabinetLabels(walls: readonly WallWithCabinets[]): Map<string, CabinetLabel> {
  const cabinetLabels = new Map<string, CabinetLabel>();

  for (const wall of walls) {
    const wallLabel = WALL_TYPES.find(type => type.value === wall.type)?.label ?? wall.type;
    const islandSideCounters = { FRONT: 0, BACK: 0 };

    wall.cabinets.forEach((cabinet, index) => {
      const side = cabinet.cabinetSide ?? 'FRONT';
      const cabinetNumber = wall.type === 'ISLAND'
        ? ++islandSideCounters[side]
        : index + 1;
      const rawName = cabinet.name?.trim();
      const name = rawName && rawName !== cabinet.id ? rawName : undefined;
      const islandSideLabel = wall.type === 'ISLAND' ? `, strona ${side}` : '';
      cabinetLabels.set(cabinet.id, {
        cabinet: `#${cabinetNumber}${name ? ` „${name}”` : ''}`,
        wall: `${wallLabel}${islandSideLabel}`
      });
    });
  }
  return cabinetLabels;
}
