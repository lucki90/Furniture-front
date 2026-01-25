import {KitchenCabinetType} from "../model/kitchen-cabinet-type";
import {BaseTwoDoorCabinetPreparer} from "../types/base-two-doors/base-two-door-cabinet-preparer";
import {BaseTwoDoorCabinetValidator} from "../types/base-two-doors/base-two-door-cabinet-validator";
import {BaseOneDoorCabinetPreparer} from "../types/base-one-door/base-one-door-cabinet-preparer";
import {BaseOneDoorCabinetValidator} from "../types/base-one-door/base-one-door-cabinet-validator";
import {BaseOneDoorRequestMapper} from "../types/base-one-door/base-one-door-request-mapper";
import {BaseTwoDoorRequestMapper} from "../types/base-two-doors/base-two-door-request-mapper";

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
  }
} as const;
