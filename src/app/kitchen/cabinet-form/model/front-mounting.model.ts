import {
  DEFAULT_FRONT_MOUNTING_TYPE,
  FrontMountingType
} from '../../../shared/model/front-mounting-type';
import { KitchenCabinetType } from './kitchen-cabinet-type';

const INSET_FRONT_CABINET_TYPES = new Set<KitchenCabinetType>([
  KitchenCabinetType.BASE_ONE_DOOR,
  KitchenCabinetType.BASE_TWO_DOOR,
  KitchenCabinetType.BASE_WITH_DRAWERS,
  KitchenCabinetType.UPPER_ONE_DOOR,
  KitchenCabinetType.UPPER_TWO_DOOR
]);

export { DEFAULT_FRONT_MOUNTING_TYPE };
export type { FrontMountingType };

/** Zakres Etapu E: proste korpusy bez segmentów, klap i wieńca dolnego na podłodze. */
export function supportsInsetFrontMounting(
  type: KitchenCabinetType | null | undefined,
  bottomWreathOnFloor = false
): boolean {
  if (!type || !INSET_FRONT_CABINET_TYPES.has(type)) {
    return false;
  }

  const isBase = type === KitchenCabinetType.BASE_ONE_DOOR
    || type === KitchenCabinetType.BASE_TWO_DOOR
    || type === KitchenCabinetType.BASE_WITH_DRAWERS;
  return !isBase || !bottomWreathOnFloor;
}
