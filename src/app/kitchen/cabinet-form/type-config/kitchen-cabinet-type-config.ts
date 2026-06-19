import {KitchenCabinetType} from "../model/kitchen-cabinet-type";
import {BaseTwoDoorCabinetValidator} from "../types/base-two-doors/base-two-door-cabinet-validator";
import {BaseOneDoorCabinetValidator} from "../types/base-one-door/base-one-door-cabinet-validator";
import {BaseOpenCabinetPreparer} from "../types/base-open/base-open-cabinet-preparer";
import {BaseOpenCabinetValidator} from "../types/base-open/base-open-cabinet-validator";
import {BaseOpenRequestMapper} from "../types/base-open/base-open-request-mapper";
import {PantryPassageCabinetPreparer} from "../types/pantry-passage/pantry-passage-cabinet-preparer";
import {PantryPassageCabinetValidator} from "../types/pantry-passage/pantry-passage-cabinet-validator";
import {PantryPassageRequestMapper} from "../types/pantry-passage/pantry-passage-request-mapper";
import {BaseWithDrawersCabinetPreparer} from "../types/base-with-drawers/base-with-drawers-cabinet-preparer";
import {BaseWithDrawersCabinetValidator} from "../types/base-with-drawers/base-with-drawers-cabinet-validator";
import {BaseWithDrawersRequestMapper} from "../types/base-with-drawers/base-with-drawers-request-mapper";
import {BaseCargoCabinetPreparer} from "../types/base-cargo/base-cargo-cabinet-preparer";
import {BaseCargoCabinetValidator} from "../types/base-cargo/base-cargo-cabinet-validator";
import {BaseCargoRequestMapper} from "../types/base-cargo/base-cargo-request-mapper";
import {TallCabinetPreparer} from "../types/tall-cabinet/tall-cabinet-preparer";
import {TallCabinetValidator} from "../types/tall-cabinet/tall-cabinet-validator";
import {TallCabinetRequestMapper} from "../types/tall-cabinet/tall-cabinet-request-mapper";
import {CornerCabinetPreparer} from "../types/corner-cabinet/corner-cabinet-preparer";
import {CornerCabinetValidator} from "../types/corner-cabinet/corner-cabinet-validator";
import {CornerCabinetRequestMapper} from "../types/corner-cabinet/corner-cabinet-request-mapper";
import {UpperOneDoorCabinetValidator} from "../types/upper-one-door/upper-one-door-cabinet-validator";
import {UpperLiftUpCabinetPreparer} from "../types/upper-lift-up/upper-lift-up-cabinet-preparer";
import {UpperLiftUpCabinetValidator} from "../types/upper-lift-up/upper-lift-up-cabinet-validator";
import {UpperLiftUpRequestMapper} from "../types/upper-lift-up/upper-lift-up-request-mapper";
import {UpperTwoDoorCabinetValidator} from "../types/upper-two-door/upper-two-door-cabinet-validator";
import {UpperOpenShelfCabinetPreparer} from "../types/upper-open-shelf/upper-open-shelf-cabinet-preparer";
import {UpperOpenShelfCabinetValidator} from "../types/upper-open-shelf/upper-open-shelf-cabinet-validator";
import {UpperOpenShelfRequestMapper} from "../types/upper-open-shelf/upper-open-shelf-request-mapper";
import {UpperCascadeCabinetPreparer} from "../types/upper-cascade/upper-cascade-cabinet-preparer";
import {UpperCascadeCabinetValidator} from "../types/upper-cascade/upper-cascade-cabinet-validator";
import {UpperCascadeRequestMapper} from "../types/upper-cascade/upper-cascade-request-mapper";
import {BaseSinkCabinetPreparer} from "../types/base-sink/base-sink-cabinet-preparer";
import {BaseSinkCabinetValidator} from "../types/base-sink/base-sink-cabinet-validator";
import {BaseSinkRequestMapper} from "../types/base-sink/base-sink-request-mapper";
import {BaseCooktopCabinetPreparer} from "../types/base-cooktop/base-cooktop-cabinet-preparer";
import {BaseCooktopCabinetValidator} from "../types/base-cooktop/base-cooktop-cabinet-validator";
import {BaseCooktopRequestMapper} from "../types/base-cooktop/base-cooktop-request-mapper";
import {BaseDishwasherCabinetPreparer} from "../types/base-dishwasher/base-dishwasher-cabinet-preparer";
import {BaseDishwasherCabinetValidator} from "../types/base-dishwasher/base-dishwasher-cabinet-validator";
import {BaseDishwasherRequestMapper} from "../types/base-dishwasher/base-dishwasher-request-mapper";
import {BaseDishwasherFreestandingCabinetPreparer} from "../types/base-dishwasher-freestanding/base-dishwasher-freestanding-cabinet-preparer";
import {BaseDishwasherFreestandingCabinetValidator} from "../types/base-dishwasher-freestanding/base-dishwasher-freestanding-cabinet-validator";
import {BaseDishwasherFreestandingRequestMapper} from "../types/base-dishwasher-freestanding/base-dishwasher-freestanding-request-mapper";
import {UpperHoodCabinetPreparer} from "../types/upper-hood/upper-hood-cabinet-preparer";
import {UpperHoodCabinetValidator} from "../types/upper-hood/upper-hood-cabinet-validator";
import {UpperHoodRequestMapper} from "../types/upper-hood/upper-hood-request-mapper";
import {BaseOvenCabinetPreparer} from "../types/base-oven/base-oven-cabinet-preparer";
import {BaseOvenCabinetValidator} from "../types/base-oven/base-oven-cabinet-validator";
import {BaseOvenRequestMapper} from "../types/base-oven/base-oven-request-mapper";
import {BaseOvenFreestandingCabinetPreparer} from "../types/base-oven/base-oven-freestanding-cabinet-preparer";
import {BaseOvenFreestandingCabinetValidator} from "../types/base-oven/base-oven-freestanding-cabinet-validator";
import {BaseOvenFreestandingRequestMapper} from "../types/base-oven/base-oven-freestanding-request-mapper";
import {BaseFridgeCabinetPreparer} from "../types/base-fridge/base-fridge-cabinet-preparer";
import {BaseFridgeCabinetValidator} from "../types/base-fridge/base-fridge-cabinet-validator";
import {BaseFridgeRequestMapper} from "../types/base-fridge/base-fridge-request-mapper";
import {BaseFridgeFreestandingCabinetPreparer} from "../types/base-fridge/base-fridge-freestanding-cabinet-preparer";
import {BaseFridgeFreestandingCabinetValidator} from "../types/base-fridge/base-fridge-freestanding-cabinet-validator";
import {BaseFridgeFreestandingRequestMapper} from "../types/base-fridge/base-fridge-freestanding-request-mapper";
import {UpperDrainerCabinetPreparer} from "../types/upper-drainer/upper-drainer-cabinet-preparer";
import {UpperDrainerCabinetValidator} from "../types/upper-drainer/upper-drainer-cabinet-validator";
import {UpperDrainerRequestMapper} from "../types/upper-drainer/upper-drainer-request-mapper";
import {createSimpleDoorPreparer} from "./preparer/cabinet-preparer.utils";
import {createSimpleDoorRequestMapper} from "./request-mapper/abstract-cabinet-request-mapper";

export const KitchenCabinetTypeConfig = {
  [KitchenCabinetType.BASE_ONE_DOOR]: {
    preparer: createSimpleDoorPreparer({ level: 'BASE', width: 400 }),
    validator: new BaseOneDoorCabinetValidator(),
    requestMapper: createSimpleDoorRequestMapper({
      kitchenCabinetType: 'BASE_ONE_DOOR',
      frontType: 'ONE_DOOR',
      level: 'BASE'
    })
  },
  [KitchenCabinetType.BASE_OPEN]: {
    preparer: new BaseOpenCabinetPreparer(),
    validator: new BaseOpenCabinetValidator(),
    requestMapper: new BaseOpenRequestMapper()
  },
  [KitchenCabinetType.PANTRY_PASSAGE]: {
    preparer: new PantryPassageCabinetPreparer(),
    validator: new PantryPassageCabinetValidator(),
    requestMapper: new PantryPassageRequestMapper()
  },
  [KitchenCabinetType.BASE_TWO_DOOR]: {
    preparer: createSimpleDoorPreparer({ level: 'BASE', width: 600 }),
    validator: new BaseTwoDoorCabinetValidator(),
    requestMapper: createSimpleDoorRequestMapper({
      kitchenCabinetType: 'BASE_TWO_DOOR',
      frontType: 'TWO_DOORS',
      level: 'BASE'
    })
  },
  [KitchenCabinetType.BASE_WITH_DRAWERS]: {
    preparer: new BaseWithDrawersCabinetPreparer(),
    validator: new BaseWithDrawersCabinetValidator(),
    requestMapper: new BaseWithDrawersRequestMapper()
  },
  [KitchenCabinetType.BASE_CARGO]: {
    preparer: new BaseCargoCabinetPreparer(),
    validator: new BaseCargoCabinetValidator(),
    requestMapper: new BaseCargoRequestMapper()
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
    preparer: createSimpleDoorPreparer({ level: 'UPPER', width: 400, resetLiftUp: true }),
    validator: new UpperOneDoorCabinetValidator(),
    requestMapper: createSimpleDoorRequestMapper({
      kitchenCabinetType: 'UPPER_ONE_DOOR',
      frontType: 'ONE_DOOR',
      level: 'UPPER',
      allowLiftUp: true
    })
  },
  [KitchenCabinetType.UPPER_LIFT_UP]: {
    preparer: new UpperLiftUpCabinetPreparer(),
    validator: new UpperLiftUpCabinetValidator(),
    requestMapper: new UpperLiftUpRequestMapper()
  },
  [KitchenCabinetType.UPPER_TWO_DOOR]: {
    preparer: createSimpleDoorPreparer({ level: 'UPPER', width: 600 }),
    validator: new UpperTwoDoorCabinetValidator(),
    requestMapper: createSimpleDoorRequestMapper({
      kitchenCabinetType: 'UPPER_TWO_DOOR',
      frontType: 'TWO_DOORS',
      level: 'UPPER'
    })
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
  },
  [KitchenCabinetType.BASE_SINK]: {
    preparer: new BaseSinkCabinetPreparer(),
    validator: new BaseSinkCabinetValidator(),
    requestMapper: new BaseSinkRequestMapper()
  },
  [KitchenCabinetType.BASE_COOKTOP]: {
    preparer: new BaseCooktopCabinetPreparer(),
    validator: new BaseCooktopCabinetValidator(),
    requestMapper: new BaseCooktopRequestMapper()
  },
  [KitchenCabinetType.BASE_DISHWASHER]: {
    preparer: new BaseDishwasherCabinetPreparer(),
    validator: new BaseDishwasherCabinetValidator(),
    requestMapper: new BaseDishwasherRequestMapper()
  },
  [KitchenCabinetType.BASE_DISHWASHER_FREESTANDING]: {
    preparer: new BaseDishwasherFreestandingCabinetPreparer(),
    validator: new BaseDishwasherFreestandingCabinetValidator(),
    requestMapper: new BaseDishwasherFreestandingRequestMapper()
  },
  [KitchenCabinetType.UPPER_HOOD]: {
    preparer: new UpperHoodCabinetPreparer(),
    validator: new UpperHoodCabinetValidator(),
    requestMapper: new UpperHoodRequestMapper()
  },
  [KitchenCabinetType.BASE_OVEN]: {
    preparer: new BaseOvenCabinetPreparer(),
    validator: new BaseOvenCabinetValidator(),
    requestMapper: new BaseOvenRequestMapper()
  },
  [KitchenCabinetType.BASE_OVEN_FREESTANDING]: {
    preparer: new BaseOvenFreestandingCabinetPreparer(),
    validator: new BaseOvenFreestandingCabinetValidator(),
    requestMapper: new BaseOvenFreestandingRequestMapper()
  },
  [KitchenCabinetType.BASE_FRIDGE]: {
    preparer: new BaseFridgeCabinetPreparer(),
    validator: new BaseFridgeCabinetValidator(),
    requestMapper: new BaseFridgeRequestMapper()
  },
  [KitchenCabinetType.BASE_FRIDGE_FREESTANDING]: {
    preparer: new BaseFridgeFreestandingCabinetPreparer(),
    validator: new BaseFridgeFreestandingCabinetValidator(),
    requestMapper: new BaseFridgeFreestandingRequestMapper()
  },
  [KitchenCabinetType.UPPER_DRAINER]: {
    preparer: new UpperDrainerCabinetPreparer(),
    validator: new UpperDrainerCabinetValidator(),
    requestMapper: new UpperDrainerRequestMapper()
  }
} as const;
