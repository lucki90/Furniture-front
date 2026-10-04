import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { BulkCabinetChange } from '../model/bulk-cabinet-change.model';
import { BULK_SKIP_REASONS, planBulkChange } from './bulk-cabinet-change.planner';
import { cabinetFixture, OAK_PRESET } from './testing/bulk-change.fixture';

describe('planBulkChange', () => {
  const change = (overrides: Partial<BulkCabinetChange>): BulkCabinetChange => ({
    scope: 'PROJECT', openingType: null, frontMountingType: null, material: { mode: 'KEEP' }, ...overrides
  });

  it('B2: fronty wpuszczane tylko dla obsługiwanych szafek; reszta pominięta z powodem', () => {
    const plan = planBulkChange([
      cabinetFixture('c1', KitchenCabinetType.BASE_ONE_DOOR),
      cabinetFixture('c2', KitchenCabinetType.BASE_OPEN, { openingType: 'NONE' }),
      cabinetFixture('c3', KitchenCabinetType.BASE_SINK, { sinkFrontType: 'DRAWER' }),
      cabinetFixture('c4', KitchenCabinetType.UPPER_LIFT_UP, { liftMechanismType: 'AVENTOS_HK_TOP' }),
      cabinetFixture('c5', KitchenCabinetType.BASE_TWO_DOOR, { frontMountingType: 'INSET' })
    ], change({ frontMountingType: 'INSET' }));

    expect(plan.updates.map(cabinet => cabinet.id)).toEqual(['c1']);
    expect(plan.updates[0].frontMountingType).toBe('INSET');
    expect(plan.skipped.map(item => item.cabinetId)).toEqual(['c2', 'c3', 'c4']);
    expect(plan.skipped[0].reasons).toEqual([BULK_SKIP_REASONS.insetUnsupported]);
    expect(plan.skipped[0].label).toBe('Dolna - otwarta 600');
    expect(plan.unchanged).toBe(1);
  });

  it('rodzaj otwierania nie dotyczy szafek bez frontów; materiał stosuje się mimo pominiętego pola', () => {
    const plan = planBulkChange([
      cabinetFixture('c1', KitchenCabinetType.BASE_OPEN, { openingType: 'NONE' }),
      cabinetFixture('c2', KitchenCabinetType.UPPER_ONE_DOOR, { name: 'Nad zlewem' })
    ], change({ openingType: 'CLICK', material: { mode: 'PRESET', preset: OAK_PRESET } }));

    expect(plan.updates.map(cabinet => cabinet.id)).toEqual(['c1', 'c2']);
    expect(plan.updates[0].openingType).toBe('NONE');
    expect(plan.updates[0].materialPresetCode).toBe('OAK');
    expect(plan.updates[0].materialRequest?.frontColor).toBe('OAK');
    expect(plan.updates[0].varnishedFront).toBeTrue();
    expect(plan.updates[1].openingType).toBe('CLICK');
    expect(plan.skipped).toEqual([{ cabinetId: 'c1', label: 'Dolna - otwarta 600', reasons: [BULK_SKIP_REASONS.noFronts] }]);
  });

  it('materiał z projektu czyści nadpisanie tylko tam, gdzie było', () => {
    const withOverride = cabinetFixture('c1', KitchenCabinetType.BASE_ONE_DOOR,
      { materialPresetCode: 'OAK', materialRequest: OAK_PRESET.materialRequest, varnishedFront: true });
    const plan = planBulkChange([withOverride, cabinetFixture('c2', KitchenCabinetType.BASE_ONE_DOOR)],
      change({ material: { mode: 'PROJECT' } }));

    expect(plan.updates).toHaveSize(1);
    expect(plan.updates[0].materialPresetCode).toBeNull();
    expect(plan.updates[0].materialRequest).toBeUndefined();
    expect(plan.unchanged).toBe(1);
  });
});
