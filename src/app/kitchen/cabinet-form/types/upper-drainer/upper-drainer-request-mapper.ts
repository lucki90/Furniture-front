import { KitchenCabinetRequestMapper } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';

/**
 * Request mapper dla szafki wiszącej z ociekaczem (UPPER_DRAINER).
 * Mapuje dane formularza na CabinetRequest wysyłany do backendu.
 */
export class UpperDrainerRequestMapper implements KitchenCabinetRequestMapper {

  map(form: any): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'UPPER_DRAINER',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: 0,  // Brak półek — system ociekacza zastępuje półki

      needBacks: true,
      isHanging: true,
      isHangingOnRail: true,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: false,
      varnishedFront: false,

      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'HANDLE',

      // Typ frontu ociekacza
      drainerFrontType: form.drainerFrontType ?? 'OPEN',

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
