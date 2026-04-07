import { KitchenCabinetRequestMapper, MaterialDefaults } from "../../type-config/request-mapper/kitchen-cabinet-request-mapper";
import {
  CornerMechanismType,
  CornerOpeningType,
  isBlindType
} from "../../model/corner-cabinet.model";

/**
 * Request mapper dla szafki narożnej (CORNER_CABINET).
 * Routuje do Type A (L-shaped) lub Type B (Blind) na podstawie mechanizmu.
 */
export class CornerCabinetRequestMapper implements KitchenCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    const mechanism = (form.cornerMechanism ?? CornerMechanismType.FIXED_SHELVES) as CornerMechanismType;
    const typeB = isBlindType(mechanism);

    return typeB ? this.mapTypeB(form, mechanism, materialDefaults) : this.mapTypeA(form, mechanism, materialDefaults);
  }

  // ==================== TYPE A (L-SHAPED) ====================

  private mapTypeA(form: any, mechanism: CornerMechanismType, materialDefaults: MaterialDefaults): any {
    const isUpper = form.isUpperCorner ?? false;
    const openingType = (form.cornerOpeningType ?? CornerOpeningType.TWO_DOORS) as CornerOpeningType;

    // Front type zależy od openingType (tylko dla dolnej — górna zawsze TWO_DOORS)
    const frontType = (!isUpper && openingType === CornerOpeningType.BIFOLD)
      ? 'CORNER_BIFOLD'
      : 'TWO_DOORS';

    const cornerRequest = {
      widthA: form.cornerWidthA,
      widthB: form.cornerWidthB,
      mechanism: mechanism,
      shelfQuantity: mechanism === CornerMechanismType.FIXED_SHELVES
        ? (form.cornerShelfQuantity ?? 2)
        : null,
      upperCabinet: isUpper,
      cornerOpeningType: !isUpper ? openingType : CornerOpeningType.TWO_DOORS
    };

    return {
      lang: 'pl',
      kitchenCabinetType: 'CORNER_CABINET',

      // width = widthA (ściana główna)
      width: form.cornerWidthA,
      height: form.height,
      depth: form.depth,

      shelfQuantity: mechanism === CornerMechanismType.FIXED_SHELVES
        ? (form.cornerShelfQuantity ?? 2)
        : 0,

      needBacks: true,
      isHanging: isUpper,
      isHangingOnRail: isUpper,
      isStandingOnFeet: !isUpper,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: !isUpper,
      varnishedFront: materialDefaults.varnishedFront,

      frontType: frontType,
      cabinetType: 'CORNER',
      openingType: form.openingType ?? 'HANDLE',

      drawerRequest: null,
      segments: null,

      cornerRequest: cornerRequest,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }

  // ==================== TYPE B (BLIND/RECTANGULAR) ====================

  private mapTypeB(form: any, mechanism: CornerMechanismType, materialDefaults: MaterialDefaults): any {
    const cornerRequest = {
      widthA: form.cornerWidthA,
      widthB: null,  // Type B nie ma widthB
      mechanism: mechanism,
      shelfQuantity: mechanism === CornerMechanismType.BLIND_CORNER
        ? (form.cornerShelfQuantity ?? 0)
        : null,
      upperCabinet: false,  // Type B zawsze dolna
      frontUchylnyWidthMm: form.cornerFrontUchylnyWidthMm ?? 500
    };

    return {
      lang: 'pl',
      kitchenCabinetType: 'CORNER_CABINET',

      width: form.cornerWidthA,
      height: form.height,
      depth: form.depth,

      shelfQuantity: mechanism === CornerMechanismType.BLIND_CORNER
        ? (form.cornerShelfQuantity ?? 0)
        : 0,

      needBacks: true,
      isHanging: false,
      isHangingOnRail: false,
      isStandingOnFeet: true,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: true,
      varnishedFront: materialDefaults.varnishedFront,

      frontType: 'CORNER_BLIND',
      cabinetType: 'CORNER_BLIND',
      openingType: form.openingType ?? 'HANDLE',

      drawerRequest: null,
      segments: null,

      cornerRequest: cornerRequest,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }

  // ==================== COMMON ====================

  private buildMaterialRequest(materialDefaults: MaterialDefaults): any {
    return {
      boxMaterial: materialDefaults.boxMaterial,
      boxBoardThickness: materialDefaults.boxBoardThickness,
      boxColor: materialDefaults.boxColor,
      frontMaterial: materialDefaults.frontMaterial,
      frontBoardThickness: materialDefaults.frontBoardThickness,
      frontColor: materialDefaults.frontColor,
      frontVeneerColor: materialDefaults.frontColor,
      boxVeneerColor: materialDefaults.boxColor
    };
  }
}
