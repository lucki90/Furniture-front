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

/** Zakres Etapu F1: proste korpusy, również z dolnym wieńcem na podłodze, bez segmentów i klap. */
export function supportsInsetFrontMounting(
  type: KitchenCabinetType | null | undefined
): boolean {
  return !!type && INSET_FRONT_CABINET_TYPES.has(type);
}
