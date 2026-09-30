import { KitchenCabinetType } from './kitchen-cabinet-type';
import { supportsInsetFrontMounting } from './front-mounting.model';

describe('supportsInsetFrontMounting', () => {
  it('supports simple base cabinets independently of bottom wreath placement', () => {
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_ONE_DOOR)).toBeTrue();
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_TWO_DOOR)).toBeTrue();
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_WITH_DRAWERS)).toBeTrue();
  });

  it('supports the verified special and segmented profiles', () => {
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_SINK)).toBeTrue();
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_OVEN)).toBeTrue();
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_CARGO)).toBeTrue();
    expect(supportsInsetFrontMounting(KitchenCabinetType.TALL_CABINET)).toBeTrue();
  });

  it('supports only the gas lift until dedicated Aventos inset blocks are modeled', () => {
    expect(supportsInsetFrontMounting(KitchenCabinetType.UPPER_LIFT_UP, {
      liftMechanismType: 'GAS_GTV'
    })).toBeTrue();
    expect(supportsInsetFrontMounting(KitchenCabinetType.UPPER_LIFT_UP, {
      liftMechanismType: 'AVENTOS_HK_TOP'
    })).toBeFalse();
  });

  it('hides mounting selection when the oven has no lower front', () => {
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_OVEN, {
      ovenLowerSectionType: 'NONE'
    })).toBeFalse();
  });

  it('keeps the sink drawer variant blocked until its drawer hardware pipeline is complete', () => {
    expect(supportsInsetFrontMounting(KitchenCabinetType.BASE_SINK, {
      sinkFrontType: 'DRAWER'
    })).toBeFalse();
  });
});
