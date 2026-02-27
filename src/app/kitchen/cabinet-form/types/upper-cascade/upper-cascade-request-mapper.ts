import { KitchenCabinetRequestMapper } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';

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
export class UpperCascadeRequestMapper implements KitchenCabinetRequestMapper {

  map(form: any): any {
    const lowerHeight = form.cascadeLowerHeight ?? 400;
    const lowerDepth = form.cascadeLowerDepth ?? 300;
    const upperHeight = form.cascadeUpperHeight ?? 320;
    const upperDepth = form.cascadeUpperDepth ?? 400;

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
      isFrontExtended: false,
      isCoveredWithCounterTop: false,
      varnishedFront: false,

      frontType: 'ONE_DOOR',
      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'HANDLE',

      drawerRequest: null,

      cascadeSegments: [
        {
          orderIndex: 0,                // Dolny segment (płytszy)
          height: lowerHeight,
          depth: lowerDepth,
          frontType: 'ONE_DOOR',
          shelfQuantity: 0
        },
        {
          orderIndex: 1,                // Górny segment (głębszy)
          height: upperHeight,
          depth: upperDepth,
          frontType: 'ONE_DOOR',
          shelfQuantity: 0
        }
      ],

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
