import { ProjectWallAddonsRequestBuilder } from './project-wall-addons-request.builder';
import { KitchenCabinet } from '../model/kitchen-state.model';

describe('ProjectWallAddonsRequestBuilder', () => {
  let builder: ProjectWallAddonsRequestBuilder;

  beforeEach(() => {
    builder = new ProjectWallAddonsRequestBuilder();
  });

  function cabinet(partial: Partial<KitchenCabinet>): KitchenCabinet {
    return ({
      id: 'cab-1',
      name: 'Szafka',
      type: 'BASE_ONE_DOOR',
      width: 600,
      height: 720,
      depth: 560,
      openingType: 'HANDLE',
      shelfCount: 1,
      frontCount: 1,
      leftEnclosureType: 'NONE',
      rightEnclosureType: 'NONE',
      ...partial
    } as unknown) as KitchenCabinet;
  }

  it('should return 0 for NONE enclosure', () => {
    expect(builder.enclosureOuterWidthMm(cabinet({ leftEnclosureType: 'NONE' }), 'left', 50)).toBe(0);
  });

  it('should return plate thickness for side plate enclosures', () => {
    expect(builder.enclosureOuterWidthMm(cabinet({ leftEnclosureType: 'SIDE_PLATE_TO_FLOOR' }), 'left', 50)).toBe(18);
    expect(builder.enclosureOuterWidthMm(cabinet({ rightEnclosureType: 'SIDE_PLATE_WITH_PLINTH' }), 'right', 50)).toBe(18);
  });

  it('should return filler width for parallel filler strip without override', () => {
    expect(builder.enclosureOuterWidthMm(cabinet({ leftEnclosureType: 'PARALLEL_FILLER_STRIP' }), 'left', 50)).toBe(50);
  });

  it('should return override for parallel filler strip with override', () => {
    expect(builder.enclosureOuterWidthMm(cabinet({
      rightEnclosureType: 'PARALLEL_FILLER_STRIP',
      rightFillerWidthOverrideMm: 80
    }), 'right', 50)).toBe(80);
  });
});
