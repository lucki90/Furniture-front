import {KitchenCabinetRequestMapper} from "../../type-config/request-mapper/kitchen-cabinet-request-mapper";

export class BaseOneDoorRequestMapper
  implements KitchenCabinetRequestMapper {

  map(form: any): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'BASE_ONE_DOOR',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: form.shelfQuantity ?? 1,
      drawerQuantity: 0,

      needBacks: true,
      isHanging: false,
      isHangingOnRail: false,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: false,
      varnishedFront: false,

      frontType: 'ONE_DOOR',
      cabinetType: 'STANDARD',
      openingType: 'HANDLE',

      materialRequest: {
        boxMaterial: 'CHIPBOARD',
        boxBoardThickness: 18,
        boxColor: 'white',
        frontMaterial: 'CHIPBOARD',
        frontBoardThickness: 18,
        frontColor: 'white',
        frontVeneerColor: 'white',
        boxVeneerColor: 'white'
      }
    };
  }
}
