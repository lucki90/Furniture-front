import {KitchenCabinetType} from "../model/kitchen-cabinet-type";
import {BaseTwoDoorCabinetPreparer} from "../types/base-two-doors/base-two-door-cabinet-preparer";
import {BaseTwoDoorCabinetValidator} from "../types/base-two-doors/base-two-door-cabinet-validator";
import {BaseOneDoorCabinetPreparer} from "../types/base-one-door/base-one-door-cabinet-preparer";
import {BaseOneDoorCabinetValidator} from "../types/base-one-door/base-one-door-cabinet-validator";
import {BaseOneDoorRequestMapper} from "../types/base-one-door/base-one-door-request-mapper";
import {BaseTwoDoorRequestMapper} from "../types/base-two-doors/base-two-door-request-mapper";
import {BaseWithDrawersCabinetPreparer} from "../types/base-with-drawers/base-with-drawers-cabinet-preparer";
import {BaseWithDrawersCabinetValidator} from "../types/base-with-drawers/base-with-drawers-cabinet-validator";
import {BaseWithDrawersRequestMapper} from "../types/base-with-drawers/base-with-drawers-request-mapper";

export const KitchenCabinetTypeConfig = {
  [KitchenCabinetType.BASE_ONE_DOOR]: {
    preparer: new BaseOneDoorCabinetPreparer(),
    validator: new BaseOneDoorCabinetValidator(),
    requestMapper: new BaseOneDoorRequestMapper()
  },
  [KitchenCabinetType.BASE_TWO_DOOR]: {
    preparer: new BaseTwoDoorCabinetPreparer(),
    validator: new BaseTwoDoorCabinetValidator(),
    requestMapper: new BaseTwoDoorRequestMapper()
  },
  [KitchenCabinetType.BASE_WITH_DRAWERS]: {
    preparer: new BaseWithDrawersCabinetPreparer(),
    validator: new BaseWithDrawersCabinetValidator(),
    requestMapper: new BaseWithDrawersRequestMapper()
  }
} as const;
