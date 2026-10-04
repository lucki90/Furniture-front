import { KitchenCabinetType } from '../../cabinet-form/model/kitchen-cabinet-type';
import { KitchenCabinet } from '../../model/kitchen-state.model';
import { MaterialPresetResponse } from '../../service/material-preset.service';

export function cabinetFixture(id: string, type: KitchenCabinetType,
                               overrides: Record<string, unknown> = {}): KitchenCabinet {
  return {
    id,
    type,
    name: '',
    openingType: 'HANDLE',
    frontMountingType: 'OVERLAY',
    width: 600,
    height: 720,
    depth: 500,
    positionY: 0,
    shelfQuantity: 1,
    ...overrides
  } as KitchenCabinet;
}

export const OAK_PRESET: MaterialPresetResponse = {
  code: 'OAK',
  translationKey: 'MATERIAL_PRESET.OAK',
  defaultPreset: false,
  sortOrder: 2,
  varnishedFront: true,
  materialRequest: {
    boxMaterial: 'CHIPBOARD', boxBoardThickness: 18, boxColor: 'OAK',
    frontMaterial: 'MDF', frontBoardThickness: 18, frontColor: 'OAK'
  },
  backMaterial: 'HDF',
  backBoardThickness: 3,
  backColor: 'WHITE'
} as MaterialPresetResponse;
