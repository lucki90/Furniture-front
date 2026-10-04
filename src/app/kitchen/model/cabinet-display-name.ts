import { CABINET_TYPE_PICKER_LABELS } from '../cabinet-form/types/cabinet-type-labels';
import { KitchenCabinet } from './kitchen-state.model';

/** Nazwa szafki albo typ z szerokością, np. „Dolna - 1 drzwi 600”. */
export function cabinetDisplayName(cabinet: Pick<KitchenCabinet, 'name' | 'type' | 'width'>): string {
  const name = cabinet.name?.trim();
  return name || `${CABINET_TYPE_PICKER_LABELS[cabinet.type] ?? cabinet.type} ${cabinet.width}`;
}
