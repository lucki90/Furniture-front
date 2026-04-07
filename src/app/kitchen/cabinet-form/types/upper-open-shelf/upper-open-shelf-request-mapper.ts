import { KitchenCabinetRequestMapper, MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';

/**
 * Request mapper dla szafki wiszącej otwartej — bez drzwi (UPPER_OPEN_SHELF).
 */
export class UpperOpenShelfRequestMapper implements KitchenCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'UPPER_OPEN_SHELF',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: form.shelfQuantity ?? 2,

      needBacks: true,
      isHanging: true,
      isHangingOnRail: true,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      frontType: 'OPEN',
      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'NONE',

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
