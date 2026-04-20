import { buildCooktopGapWarning, buildKitchenLayoutMetrics, MIN_WORKSPACE_GAP_MM } from './kitchen-layout-metrics';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

function createCabinet(overrides: Partial<KitchenCabinet>): KitchenCabinet {
  return {
    id: 'cab-1',
    type: KitchenCabinetType.BASE_ONE_DOOR,
    width: 800,
    height: 720,
    depth: 560,
    openingType: 'LEFT',
    shelfQuantity: 1,
    ...overrides
  } as KitchenCabinet;
}

describe('kitchen-layout-metrics', () => {
  it('should calculate layout zones and gap dimension line from cabinet data', () => {
    const metrics = buildKitchenLayoutMetrics({
      cabinets: [
        createCabinet({ id: 'base-1', type: KitchenCabinetType.BASE_ONE_DOOR, height: 720 }),
        createCabinet({ id: 'upper-1', type: KitchenCabinetType.UPPER_ONE_DOOR, height: 700 })
      ],
      wallHeightMm: 2400,
      plinthHeightMm: 100,
      countertopThicknessMm: 38,
      upperFillerHeightMm: 100,
      wallDisplayWidth: 500,
      wallDisplayHeight: 180,
      hasBottomCabinets: true,
      hasHangingCabinets: true
    });

    expect(metrics.realBottomZoneMm).toBe(820);
    expect(metrics.realTopZoneMm).toBe(800);
    expect(metrics.actualGapMm).toBe(742);
    expect(metrics.gapMm).toBe(742);
    expect(metrics.isWorkspaceGapViolation).toBeFalse();
    expect(metrics.gapDimensionLine).toEqual(jasmine.objectContaining({
      x: 504,
      label: '742 mm',
      isWarning: false
    }));
  });

  it('should clamp rendered gap to minimum workspace and flag violations', () => {
    const metrics = buildKitchenLayoutMetrics({
      cabinets: [
        createCabinet({ id: 'base-1', type: KitchenCabinetType.BASE_ONE_DOOR, height: 720 }),
        createCabinet({ id: 'upper-1', type: KitchenCabinetType.UPPER_ONE_DOOR, height: 720 })
      ],
      wallHeightMm: 2000,
      plinthHeightMm: 100,
      countertopThicknessMm: 38,
      upperFillerHeightMm: 100,
      wallDisplayWidth: 500,
      wallDisplayHeight: 180,
      hasBottomCabinets: true,
      hasHangingCabinets: true
    });

    expect(metrics.actualGapMm).toBe(322);
    expect(metrics.realGapMm).toBe(MIN_WORKSPACE_GAP_MM);
    expect(metrics.isWorkspaceGapViolation).toBeTrue();
    expect(metrics.gapDimensionLine?.isWarning).toBeTrue();
  });

  it('should return gas cooktop warning when gap is below safety minimum', () => {
    const warning = buildCooktopGapWarning({
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3600,
      heightMm: 2400,
      cabinets: [
        createCabinet({ type: KitchenCabinetType.BASE_COOKTOP, cooktopType: 'GAS' })
      ]
    }, true, 700);

    expect(warning).toEqual({
      message: 'Odległość między płytą gazowej a szafką powyżej: 700mm (wymagane min. 750mm)',
      minMm: 750,
      actualMm: 700
    });
  });

  it('should skip cooktop warning when there are no hanging cabinets or gap is sufficient', () => {
    expect(buildCooktopGapWarning(undefined, true, 500)).toBeNull();
    expect(buildCooktopGapWarning({
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3600,
      heightMm: 2400,
      cabinets: [
        createCabinet({ type: KitchenCabinetType.BASE_COOKTOP, cooktopType: 'INDUCTION' })
      ]
    }, false, 550)).toBeNull();
    expect(buildCooktopGapWarning({
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3600,
      heightMm: 2400,
      cabinets: [
        createCabinet({ type: KitchenCabinetType.BASE_COOKTOP, cooktopType: 'INDUCTION' })
      ]
    }, true, 650)).toBeNull();
  });
});
