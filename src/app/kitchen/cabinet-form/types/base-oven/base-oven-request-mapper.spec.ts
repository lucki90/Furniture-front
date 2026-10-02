import { DEFAULT_MATERIAL_DEFAULTS } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { BaseOvenFreestandingRequestMapper } from './base-oven-freestanding-request-mapper';
import { BaseOvenRequestMapper } from './base-oven-request-mapper';

describe('BaseOvenRequestMapper countertop contract', () => {
  const form = { width: 600, height: 850, depth: 560 };

  for (const lowerSection of ['LOW_DRAWER', 'HINGED_DOOR', 'NONE', undefined]) {
    it(`maps a covered cabinet for lower section ${lowerSection ?? 'default'}`, () => {
      const request = new BaseOvenRequestMapper().map({
        ...form,
        ovenLowerSectionType: lowerSection,
        isCoveredWithCounterTop: false
      }, DEFAULT_MATERIAL_DEFAULTS);

      expect(request.kitchenCabinetType).toBe('BASE_OVEN');
      expect(request.isCoveredWithCounterTop).toBeTrue();
      expect(request.ovenLowerSectionType).toBe(lowerSection ?? 'LOW_DRAWER');
    });
  }

  it('keeps a freestanding oven uncovered', () => {
    const request = new BaseOvenFreestandingRequestMapper().map(form, DEFAULT_MATERIAL_DEFAULTS);

    expect(request.kitchenCabinetType).toBe('BASE_OVEN_FREESTANDING');
    expect(request.isCoveredWithCounterTop).toBeFalse();
  });
});
