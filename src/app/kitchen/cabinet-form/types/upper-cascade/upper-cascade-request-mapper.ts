import { MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";

/**
 * Request mapper dla szafki wiszącej kaskadowej (UPPER_CASCADE).
 *
 * Logika głębokości:
 *   - Dolny segment (płytszy, bliżej blatu):  cascadeLowerDepth (250-400 mm)
 *   - Górny segment (głębszy, bliżej sufitu): cascadeUpperDepth (300-560 mm)
 *
 * Wymiary do backendu:
 *   - height = cascadeLowerHeight + cascadeUpperHeight (suma segmentów)
 *   - depth  = cascadeUpperDepth (głębszy, górny segment — używany do kalkulacji materiałów)
 */
export class UpperCascadeRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    const lowerHeight = form.cascadeLowerHeight ?? 400;
    const lowerDepth = form.cascadeLowerDepth ?? 300;
    const upperHeight = form.cascadeUpperHeight ?? 320;
    const upperDepth = form.cascadeUpperDepth ?? 400;

    // Per-segment opcje
    const lowerIsLiftUp: boolean = form.cascadeLowerIsLiftUp ?? false;
    const lowerIsFrontExtended: boolean = form.cascadeLowerIsFrontExtended ?? false;
    const upperIsLiftUp: boolean = form.cascadeUpperIsLiftUp ?? false;

    return {
      lang: 'pl',
      kitchenCabinetType: 'UPPER_CASCADE',
      width: form.width,
      height: lowerHeight + upperHeight,
      depth: upperDepth,   // głębszy (górny) segment decyduje o głębokości kalkulacji

      shelfQuantity: 0,

      needBacks: true,
      isHanging: true,
      isHangingOnRail: true,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: false,   // per-segment tylko (cascadeSegments[0].isFrontExtended)
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      frontType: 'ONE_DOOR',    // per-segment (getEffectiveFrontType() wywołuje backend)
      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'HANDLE',

      drawerRequest: null,

      cascadeSegments: [
        {
          orderIndex: 0,                // Segment dolny (płytszy, bliżej blatu)
          height: lowerHeight,
          depth: lowerDepth,
          frontType: lowerIsLiftUp ? 'UPWARDS' : 'ONE_DOOR',
          shelfQuantity: 0,
          isLiftUp: lowerIsLiftUp,
          isFrontExtended: lowerIsFrontExtended
        },
        {
          orderIndex: 1,                // Segment górny (głębszy, bliżej sufitu)
          height: upperHeight,
          depth: upperDepth,
          frontType: upperIsLiftUp ? 'UPWARDS' : 'ONE_DOOR',
          shelfQuantity: 0,
          isLiftUp: upperIsLiftUp,
          isFrontExtended: false         // przedłużony front tylko dla dolnego
        }
      ],
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
