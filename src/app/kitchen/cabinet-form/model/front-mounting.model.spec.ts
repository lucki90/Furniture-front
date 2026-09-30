import { KitchenCabinetType } from './kitchen-cabinet-type';
import { supportsInsetFrontMounting } from './front-mounting.model';

describe('supportsInsetFrontMounting', () => {
  it('supports simple base cabinets independently of bottom wreath placement', () => {
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_ONE_DOOR)).toBeTrue();
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_TWO_DOOR)).toBeTrue();
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_WITH_DRAWERS)).toBeTrue();
  });

  it('keeps special carcass profiles outside stage F1 unavailable', () => {
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_SINK)).toBeFalse();
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_OVEN)).toBeFalse();
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_CARGO)).toBeFalse();
  });
});
