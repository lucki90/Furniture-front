import { DEFAULT_MATERIAL_DEFAULTS } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { BaseCooktopRequestMapper } from './base-cooktop-request-mapper';

describe('BaseCooktopRequestMapper', () => {
  for (const cooktopType of ['GAS', 'INDUCTION']) {
    for (const floor of [false, true]) {
      it(`preserves floor wreath for ${cooktopType}: ${floor}`, () => {
        const request = new BaseCooktopRequestMapper().map({ width: 600, height: 720, depth: 560,
          cooktopType, cooktopFrontType: 'DRAWERS', bottomWreathOnFloor: floor }, DEFAULT_MATERIAL_DEFAULTS);
        expect(request.bottomWreathOnFloor).toBe(floor);
        expect(request.cooktopType).toBe(cooktopType);
      });
    }
  }
});
