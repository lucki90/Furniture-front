import { MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";

/**
 * Request mapper dla szafki na wbudowany piekarnik (BASE_OVEN).
 */
export class BaseOvenRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    const ovenApronEnabled: boolean = form.ovenApronEnabled ?? false;

    return {
      lang: 'pl',
      kitchenCabinetType: 'BASE_OVEN',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: 0,

      needBacks: true,
      isHanging: false,
      isHangingOnRail: false,
      isStandingOnFeet: true,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      cabinetType: 'BASE_OVEN',
      openingType: form.openingType ?? 'HANDLE',

      // Pola specyficzne dla piekarnika wbudowanego
      ovenHeightType: form.ovenHeightType ?? 'STANDARD',
      ovenLowerSectionType: form.ovenLowerSectionType ?? 'LOW_DRAWER',
      ovenApronEnabled: ovenApronEnabled,
      ovenApronHeightMm: ovenApronEnabled ? (form.ovenApronHeightMm ?? 50) : 0,

      // Szuflada niska — wyślij model prowadnicy (backend liczy prowadnicę jako komponent)
      // drawerQuantity: 1 żeby przejść walidację @Min(1); preparer i tak ustawia 0 wewnętrznie
      drawerRequest: (form.ovenLowerSectionType === 'LOW_DRAWER' || form.ovenLowerSectionType == null)
        ? {
            drawerModel: form.drawerModel ?? 'ANTARO_TANDEMBOX',
            drawerQuantity: 1,
            drawerBaseHdf: false,
            drawerFrontDetails: null
          }
        : null,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
