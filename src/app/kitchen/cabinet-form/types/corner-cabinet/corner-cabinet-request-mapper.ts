import { MaterialDefaults } from "../../type-config/request-mapper/kitchen-cabinet-request-mapper";
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";
import {
  CornerHandedness,
  CornerHandleType,
  CornerMechanismType,
  CornerOpeningType,
  CornerSystemLine,
  isLeMans,
  isMagicCorner,
  isBlindType
} from "../../model/corner-cabinet.model";

/**
 * Request mapper dla szafki narożnej (CORNER_CABINET).
 * Routuje do Type A (L-shaped) lub Type B (Blind) na podstawie mechanizmu.
 */
export class CornerCabinetRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    const mechanism = (form.cornerMechanism ?? CornerMechanismType.FIXED_SHELVES) as CornerMechanismType;
    const typeB = isBlindType(mechanism);

    return typeB ? this.mapTypeB(form, mechanism, materialDefaults) : this.mapTypeA(form, mechanism, materialDefaults);
  }

  // ==================== TYPE A (L-SHAPED) ====================

  private mapTypeA(form: any, mechanism: CornerMechanismType, materialDefaults: MaterialDefaults): any {
    const isUpper = form.isUpperCorner ?? false;
    const openingType = (form.cornerOpeningType ?? CornerOpeningType.TWO_DOORS) as CornerOpeningType;

    // Front type depends on openingType.
    const frontType = openingType === CornerOpeningType.BIFOLD
      ? 'CORNER_BIFOLD'
      : openingType === CornerOpeningType.BLIND
        ? 'ONE_DOOR'
        : 'TWO_DOORS';

    const cornerRequest = {
      widthA: form.cornerWidthA,
      widthB: form.cornerWidthB,
      mechanism: mechanism,
      shelfQuantity: mechanism === CornerMechanismType.FIXED_SHELVES
        ? (form.cornerShelfQuantity ?? 2)
        : null,
      upperCabinet: isUpper,
      cornerOpeningType: openingType,
      // Iter.5b [A2 C]: UI dropdown exists now, but null still means backend default SPLIT_RECTANGLES.
      wreathConstructionType: form.wreathConstructionType ?? null
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
    const blindPanelSplitEnabled = form.blindPanelSplitEnabled ?? form.blindPanelVisibleWidthMm != null;
    // Iter.6 (Faza 1): pola systemowe (handedness/angle/thickness/line) mają znaczenie tylko dla
    // jednostronnych systemów Type B (Magic Corner, Le Mans); dla BLIND_CORNER zostają null.
    const isSystemMechanism = isMagicCorner(mechanism) || isLeMans(mechanism);
    // Wiszący ślepy narożnik: wariant wiszący istnieje wyłącznie dla BLIND_CORNER (Magic/Le Mans tylko dolne).
    const isUpper = mechanism === CornerMechanismType.BLIND_CORNER && (form.isUpperCorner ?? false);
    const cornerRequest = {
      widthA: form.cornerWidthA,
      widthB: null,  // Type B nie ma widthB
      mechanism: mechanism,
      shelfQuantity: mechanism === CornerMechanismType.BLIND_CORNER
        ? (form.cornerShelfQuantity ?? 0)
        : null,
      upperCabinet: isUpper,  // Type B dolna, z wyjątkiem wiszącego ślepego narożnika
      frontUchylnyWidthMm: form.cornerFrontUchylnyWidthMm ?? 500,
      cornerHandleType: (form.cornerHandleType ?? CornerHandleType.SCREWED) as CornerHandleType,
      // Iteracja 2 [B1] — split FS1 (mat. frontu, widoczna) + FS2 (mat. korpusu, ukryta).
      // Wysyłamy do backendu tylko gdy split włączony przez użytkownika; null = brak splitu (backward compat).
      blindPanelVisibleWidthMm: blindPanelSplitEnabled
        ? (form.blindPanelVisibleWidthMm ?? 150)
        : null,
      // Strona narożnika (handedness) dotyczy wszystkich Type B (ślepy + Magic/Le Mans) —
      // decyduje, po której stronie jest aktywny front uchylny. Reszta parametrów (kąt/grubość/linia)
      // ma sens tylko dla jednostronnych systemów (Magic Corner, Le Mans).
      handedness: (form.cornerHandedness ?? null) as CornerHandedness | null,
      openingAngleDeg: isSystemMechanism ? (form.cornerOpeningAngleDeg ?? null) : null,
      frontThicknessMm: isSystemMechanism ? (form.cornerFrontThicknessMm ?? null) : null,
      systemLine: isSystemMechanism ? ((form.cornerSystemLine ?? null) as CornerSystemLine | null) : null
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
      // Wiszący ślepy narożnik: brak nóżek/blatu, montaż na szynie + opcjonalny przedłużany front (jak szafki wiszące).
      isHanging: isUpper,
      isHangingOnRail: isUpper,
      isStandingOnFeet: !isUpper,
      isBackInGroove: false,
      isFrontExtended: isUpper ? (form.isFrontExtended ?? false) : false,
      isCoveredWithCounterTop: !isUpper,
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

}
