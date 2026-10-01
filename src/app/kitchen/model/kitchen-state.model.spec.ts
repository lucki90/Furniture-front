import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { cabinetRequiresCountertop, getCabinetZone, KitchenCabinet } from './kitchen-state.model';

function cabinet(overrides: Record<string, unknown>): KitchenCabinet {
  return {
    id: 'cab-1',
    type: KitchenCabinetType.BASE_ONE_DOOR,
    width: 600,
    height: 720,
    depth: 560,
    ...overrides
  } as unknown as KitchenCabinet;
}

describe('kitchen-state.model — strefa i blat szafki', () => {
  it('dolna szafka narożna jest w strefie BOTTOM i ma blat', () => {
    const corner = cabinet({ type: KitchenCabinetType.CORNER_CABINET, isUpperCorner: false });

    expect(getCabinetZone(corner)).toBe('BOTTOM');
    expect(cabinetRequiresCountertop(corner)).toBeTrue();
  });

  it('górna szafka narożna jest w strefie TOP i nie ma blatu', () => {
    const corner = cabinet({ type: KitchenCabinetType.CORNER_CABINET, isUpperCorner: true, depth: 320 });

    expect(getCabinetZone(corner)).toBe('TOP');
    expect(cabinetRequiresCountertop(corner)).toBeFalse();
  });

  it('pozostałe typy zachowują regułę typu', () => {
    expect(cabinetRequiresCountertop(cabinet({ type: KitchenCabinetType.BASE_SINK }))).toBeTrue();
    expect(cabinetRequiresCountertop(cabinet({ type: KitchenCabinetType.UPPER_ONE_DOOR }))).toBeFalse();
    expect(cabinetRequiresCountertop(cabinet({ type: KitchenCabinetType.TALL_CABINET }))).toBeFalse();
    expect(cabinetRequiresCountertop(cabinet({ type: KitchenCabinetType.BASE_FRIDGE_FREESTANDING }))).toBeFalse();
  });
});
