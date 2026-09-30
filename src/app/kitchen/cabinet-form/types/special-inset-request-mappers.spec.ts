import { BaseCargoRequestMapper } from './base-cargo/base-cargo-request-mapper';
import { BaseOvenRequestMapper } from './base-oven/base-oven-request-mapper';
import { BaseSinkRequestMapper } from './base-sink/base-sink-request-mapper';
import { TallCabinetRequestMapper } from './tall-cabinet/tall-cabinet-request-mapper';

describe('special cabinet inset request mapping', () => {
  const materials = { varnishedFront: false } as any;
  const baseForm = {
    width: 600,
    height: 720,
    depth: 560,
    frontMountingType: 'INSET'
  };

  it('maps inset mounting for sink, cargo, oven and tall cabinets', () => {
    const requests = [
      new BaseSinkRequestMapper().map(baseForm, materials),
      new BaseCargoRequestMapper().map(baseForm, materials),
      new BaseOvenRequestMapper().map(baseForm, materials),
      new TallCabinetRequestMapper().map({ ...baseForm, height: 2000, segments: [] }, materials)
    ];

    expect(requests.map(request => request.frontMountingType))
      .toEqual(['INSET', 'INSET', 'INSET', 'INSET']);
  });

  it('keeps overlay as the backward-compatible default', () => {
    expect(new BaseSinkRequestMapper().map({ ...baseForm, frontMountingType: undefined }, materials)
      .frontMountingType).toBe('OVERLAY');
  });
});
