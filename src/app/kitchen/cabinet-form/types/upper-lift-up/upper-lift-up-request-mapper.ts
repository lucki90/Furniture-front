import { MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { AbstractCabinetRequestMapper } from '../../type-config/request-mapper/abstract-cabinet-request-mapper';

/**
 * Request mapper dla osobnego typu szafki wiszacej z klapa unoszona do gory (UPPER_LIFT_UP).
 * V1 mapuje na istniejaca logike UPWARDS / gas-lift.
 */
export class UpperLiftUpRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'UPPER_LIFT_UP',
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

      isLiftUp: true,
      liftMechanismType: form.liftMechanismType ?? 'GAS_GTV',
      allowThirdLiftMechanism: form.allowThirdLiftMechanism ?? false,
      // Fronty asymetryczne HF (TKH): tylko AVENTOS_HF_TOP; null = symetryczny (parytet z walidatorem BE)
      hfUpperFrontHeightMm: form.liftMechanismType === 'AVENTOS_HF_TOP' ? (form.hfUpperFrontHeightMm ?? null) : null,
      frontType: 'UPWARDS',
      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'HANDLE',

      drawerRequest: null,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
