import { KitchenCabinetRequestMapper } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';

export class BaseDishwasherFreestandingRequestMapper implements KitchenCabinetRequestMapper {

  map(form: any): any {
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
      varnishedFront: false,

      openingType: 'NONE',
      drawerRequest: null,

      materialRequest: {
        boxMaterial: 'CHIPBOARD',
        boxBoardThickness: 18,
        boxColor: 'WHITE',
        frontMaterial: 'CHIPBOARD',
        frontBoardThickness: 18,
        frontColor: 'WHITE',
        frontVeneerColor: 'WHITE',
        boxVeneerColor: 'WHITE'
      }
    };
  }
}
