import { KitchenCabinetRequestMapper, MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';

/**
 * Request mapper dla szafki wiszącej z dwojgiem drzwi (UPPER_TWO_DOOR).
 */
export class UpperTwoDoorRequestMapper implements KitchenCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'UPPER_TWO_DOOR',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: form.shelfQuantity ?? 1,

      needBacks: true,
      isHanging: true,
      isHangingOnRail: true,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: form.isFrontExtended ?? false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      // Lift-up niedostępny dla szafki z dwojgiem drzwi — zawsze TWO_DOORS
      frontType: 'TWO_DOORS',
      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'HANDLE',

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
