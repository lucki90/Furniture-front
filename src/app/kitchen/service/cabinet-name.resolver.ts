import { CabinetPlacementResponse } from '../model/kitchen-project.model';

/** Identyfikator szafki nadawany przez front (`KitchenWorkspaceStore.generateCabinetId`, mapper odczytu projektu). */
const GENERATED_CABINET_ID = /^cabinet-\d+$/;

/**
 * Nazwa szafki z odczytu projektu — jedyne miejsce zgodności ze starszymi zapisami.
 *
 * Zapis z polem `name` zwraca je wprost. Zapis sprzed pola trzymał nazwę w `cabinetId` (front wysyłał
 * `name || id`), więc `cabinetId` inny niż techniczny `cabinet-N` traktujemy jak nazwę nadaną przez użytkownika.
 */
export function resolveLoadedCabinetName(
  response: Pick<CabinetPlacementResponse, 'cabinetId' | 'name'>
): string | undefined {
  const name = response.name?.trim();
  if (name) {
    return name;
  }
  const legacyId = response.cabinetId?.trim();
  return legacyId && !GENERATED_CABINET_ID.test(legacyId) ? legacyId : undefined;
}
