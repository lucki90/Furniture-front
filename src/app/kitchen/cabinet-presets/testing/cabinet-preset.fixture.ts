import { KitchenCabinetType } from '../../cabinet-form/model/kitchen-cabinet-type';
import { CabinetPresetResponse } from '../../model/cabinet-preset.model';
import { CabinetPlacementResponse } from '../../model/kitchen-project.model';

/** Wbudowany preset „dolna 600 z 3 szufladami” w kształcie odpowiedzi backendu (bez pozycji i materiałów). */
export function drawersPresetFixture(overrides: Partial<CabinetPresetResponse> = {}): CabinetPresetResponse {
  return {
    id: 1,
    name: null,
    translationKey: 'CABINET_PRESET.BASE_WITH_DRAWERS_600',
    system: true,
    kitchenCabinetType: KitchenCabinetType.BASE_WITH_DRAWERS,
    widthMm: 600,
    heightMm: 720,
    depthMm: 500,
    cabinet: {
      cabinetType: KitchenCabinetType.BASE_WITH_DRAWERS,
      positionX: 0,
      positionY: 0,
      widthMm: 600,
      heightMm: 720,
      depthMm: 500,
      openingType: 'HANDLE',
      frontMountingType: 'OVERLAY',
      shelfQuantity: 0,
      drawerQuantity: 3,
      drawerModel: 'ANTARO_TANDEMBOX',
      drawerLayoutType: 'EQUAL',
      gapBeforeMm: 0,
      cabinetSide: 'FRONT',
      materialRequest: null,
      materialPresetCode: null,
      varnishedFront: false
    } as unknown as CabinetPlacementResponse,
    ...overrides
  };
}
