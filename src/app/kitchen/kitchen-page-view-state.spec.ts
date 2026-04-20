import {
  buildCalculationViewState,
  buildPricingViewState,
  createEmptyCalculationViewState
} from './kitchen-page-view-state';

describe('kitchen-page-view-state', () => {
  it('creates an empty calculation state', () => {
    const state = createEmptyCalculationViewState();

    expect(state.projectResult).toBeNull();
    expect(state.aggregatedBoards).toEqual([]);
    expect(state.totalWasteCost).toBe(0);
    expect(state.pricingWarnings).toEqual([]);
  });

  it('maps calculation workflow result into component state shape', () => {
    const state = buildCalculationViewState({
      response: { allFit: true, wallCount: 1, totalCabinetCount: 2, walls: [] } as any,
      aggregation: {
        boards: [{ material: 'MDF' }] as any,
        components: [{ name: 'Zawias' }] as any,
        jobs: [{ name: 'Ciecie' }] as any,
        wasteCost: 25,
        wasteDetails: [{ name: 'Odpad' }] as any
      } as any,
      pricingWarnings: ['MDF 18']
    });

    expect(state.projectResult?.allFit).toBeTrue();
    expect(state.aggregatedBoards.length).toBe(1);
    expect(state.totalWasteCost).toBe(25);
    expect(state.pricingWarnings).toEqual(['MDF 18']);
  });

  it('maps pricing form state into component state shape', () => {
    const state = buildPricingViewState(
      { finalPrice: 1234, offerNotes: 'Oferta testowa' } as any,
      {
        discountPct: 10,
        manualOverrideEnabled: true,
        manualOverride: 999,
        offerNotes: 'Oferta testowa'
      }
    );

    expect(state.pricing?.finalPrice).toBe(1234);
    expect(state.pricingDiscountPct).toBe(10);
    expect(state.pricingManualOverrideEnabled).toBeTrue();
    expect(state.pricingManualOverride).toBe(999);
  });
});
