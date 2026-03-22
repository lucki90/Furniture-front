import { KitchenCabinetRequestMapper } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';

/**
 * Request mapper dla wolnostojącej lodówki (BASE_FRIDGE_FREESTANDING).
 * Wizualizacja — 0 płyt (używa formuły DISHWASHER).
 */
export class BaseFridgeFreestandingRequestMapper implements KitchenCabinetRequestMapper {

  map(form: any): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'BASE_FRIDGE_FREESTANDING',
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
      isCoveredWithCounterTop: false,
      varnishedFront: false,

      cabinetType: 'DISHWASHER',
      openingType: form.openingType ?? 'NONE',

      // Typ wizualizacji SVG (SINGLE_DOOR / TWO_DOORS / SIDE_BY_SIDE)
      fridgeFreestandingType: form.fridgeFreestandingType ?? 'TWO_DOORS',

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
