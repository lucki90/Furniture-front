import { KitchenCabinetRequestMapper, MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';

export class BaseDishwasherFreestandingRequestMapper implements KitchenCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'BASE_DISHWASHER_FREESTANDING',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: 0,
      needBacks: false,
      isHanging: false,
      isHangingOnRail: false,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: true,
      varnishedFront: materialDefaults.varnishedFront,

      openingType: 'NONE',
      drawerRequest: null,

      materialRequest: {
        boxMaterial: materialDefaults.boxMaterial,
        boxBoardThickness: materialDefaults.boxBoardThickness,
        boxColor: materialDefaults.boxColor,
        frontMaterial: materialDefaults.frontMaterial,
        frontBoardThickness: materialDefaults.frontBoardThickness,
        frontColor: materialDefaults.frontColor,
        frontVeneerColor: materialDefaults.frontColor,
        boxVeneerColor: materialDefaults.boxColor
      }
    };
  }
}
