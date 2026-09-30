import {
  DEFAULT_FRONT_MOUNTING_TYPE,
  FrontMountingType
} from '../../../shared/model/front-mounting-type';
import { KitchenCabinetType } from './kitchen-cabinet-type';

const INSET_FRONT_CABINET_TYPES = new Set<KitchenCabinetType>([
  KitchenCabinetType.BASE_ONE_DOOR,
  KitchenCabinetType.BASE_TWO_DOOR,
  KitchenCabinetType.BASE_WITH_DRAWERS,
  KitchenCabinetType.BASE_SINK,
  KitchenCabinetType.BASE_CARGO,
  KitchenCabinetType.BASE_OVEN,
  KitchenCabinetType.TALL_CABINET,
  KitchenCabinetType.UPPER_ONE_DOOR,
  KitchenCabinetType.UPPER_TWO_DOOR,
  KitchenCabinetType.UPPER_LIFT_UP
]);

export { DEFAULT_FRONT_MOUNTING_TYPE };
export type { FrontMountingType };

export interface InsetFrontMountingContext {
  liftMechanismType?: string | null;
  ovenLowerSectionType?: string | null;
  sinkFrontType?: string | null;
}

/** Profile z potwierdzoną geometrią i kompletnym BOM dla frontu wpuszczanego. */
export function supportsInsetFrontMounting(
  type: KitchenCabinetType | null | undefined,
  context: InsetFrontMountingContext = {}
): boolean {
  if (!type || !INSET_FRONT_CABINET_TYPES.has(type)) return false;
  if (type === KitchenCabinetType.UPPER_LIFT_UP) {
    return (context.liftMechanismType ?? 'GAS_GTV') === 'GAS_GTV';
  }
  if (type === KitchenCabinetType.BASE_OVEN) {
    return (context.ovenLowerSectionType ?? 'LOW_DRAWER') !== 'NONE';
  }
  if (type === KitchenCabinetType.BASE_SINK) {
    return (context.sinkFrontType ?? 'TWO_DOORS') !== 'DRAWER';
  }
  return true;
}
