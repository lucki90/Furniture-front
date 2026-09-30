import { DEFAULT_MATERIAL_DEFAULTS } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { BaseWithDrawersRequestMapper } from './base-with-drawers-request-mapper';

describe('BaseWithDrawersRequestMapper', () => {
  it('maps inset front mounting to the calculation request', () => {
    const request = new BaseWithDrawersRequestMapper().map({
      width: 600,
      height: 720,
      depth: 560,
      openingType: 'HANDLE',
      frontMountingType: 'INSET',
      bottomWreathOnFloor: true,
      drawerQuantity: 3,
      drawerModel: 'ANTARO_TANDEMBOX'
    }, DEFAULT_MATERIAL_DEFAULTS);

    expect(request.frontMountingType).toBe('INSET');
    expect(request.bottomWreathOnFloor).toBeTrue();
  });
});
