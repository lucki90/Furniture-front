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
import {TallCabinetPreparer} from "../types/tall-cabinet/tall-cabinet-preparer";
import {TallCabinetValidator} from "../types/tall-cabinet/tall-cabinet-validator";
import {TallCabinetRequestMapper} from "../types/tall-cabinet/tall-cabinet-request-mapper";
import {CornerCabinetPreparer} from "../types/corner-cabinet/corner-cabinet-preparer";
import {CornerCabinetValidator} from "../types/corner-cabinet/corner-cabinet-validator";
import {CornerCabinetRequestMapper} from "../types/corner-cabinet/corner-cabinet-request-mapper";
import {UpperOneDoorCabinetPreparer} from "../types/upper-one-door/upper-one-door-cabinet-preparer";
import {UpperOneDoorCabinetValidator} from "../types/upper-one-door/upper-one-door-cabinet-validator";
import {UpperOneDoorRequestMapper} from "../types/upper-one-door/upper-one-door-request-mapper";
import {UpperTwoDoorCabinetPreparer} from "../types/upper-two-door/upper-two-door-cabinet-preparer";
import {UpperTwoDoorCabinetValidator} from "../types/upper-two-door/upper-two-door-cabinet-validator";
import {UpperTwoDoorRequestMapper} from "../types/upper-two-door/upper-two-door-request-mapper";
import {UpperOpenShelfCabinetPreparer} from "../types/upper-open-shelf/upper-open-shelf-cabinet-preparer";
import {UpperOpenShelfCabinetValidator} from "../types/upper-open-shelf/upper-open-shelf-cabinet-validator";
import {UpperOpenShelfRequestMapper} from "../types/upper-open-shelf/upper-open-shelf-request-mapper";
import {UpperCascadeCabinetPreparer} from "../types/upper-cascade/upper-cascade-cabinet-preparer";
import {UpperCascadeCabinetValidator} from "../types/upper-cascade/upper-cascade-cabinet-validator";
import {UpperCascadeRequestMapper} from "../types/upper-cascade/upper-cascade-request-mapper";

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
  },
  [KitchenCabinetType.TALL_CABINET]: {
    preparer: new TallCabinetPreparer(),
    validator: new TallCabinetValidator(),
    requestMapper: new TallCabinetRequestMapper()
  },
  [KitchenCabinetType.CORNER_CABINET]: {
    preparer: new CornerCabinetPreparer(),
    validator: new CornerCabinetValidator(),
    requestMapper: new CornerCabinetRequestMapper()
  },
  [KitchenCabinetType.UPPER_ONE_DOOR]: {
    preparer: new UpperOneDoorCabinetPreparer(),
    validator: new UpperOneDoorCabinetValidator(),
    requestMapper: new UpperOneDoorRequestMapper()
  },
  [KitchenCabinetType.UPPER_TWO_DOOR]: {
    preparer: new UpperTwoDoorCabinetPreparer(),
    validator: new UpperTwoDoorCabinetValidator(),
    requestMapper: new UpperTwoDoorRequestMapper()
  },
  [KitchenCabinetType.UPPER_OPEN_SHELF]: {
    preparer: new UpperOpenShelfCabinetPreparer(),
    validator: new UpperOpenShelfCabinetValidator(),
    requestMapper: new UpperOpenShelfRequestMapper()
  },
  [KitchenCabinetType.UPPER_CASCADE]: {
    preparer: new UpperCascadeCabinetPreparer(),
    validator: new UpperCascadeCabinetValidator(),
    requestMapper: new UpperCascadeRequestMapper()
  }
} as const;
