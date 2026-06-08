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

  it('should build plinth request from explicit plinth height and pick matching feet model', () => {
    const wall = {
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3000,
      heightMm: 2600,
      cabinets: [],
      plinthConfig: {
        enabled: true,
        heightMm: 120,
        materialType: 'PVC',
        setbackMm: 45
      }
    } as any;

    expect(builder.buildPlinthRequest(wall, 100)).toEqual({
      enabled: true,
      heightMm: 120,
      feetType: 'FEET_120',
      materialType: 'PVC',
      colorCode: undefined,
      setbackMm: 45
    });
  });

  // Bug-fix 2026-06-08: panel cokołu wyłączony, ale nóżki zostają — request musi nieść realną
  // wysokość cokołu, inaczej backend (calculateFeetOnlyResponse) policzy nóżki na domyślne 100mm.
  it('should keep the real plinth height for feet calculation when the plinth panel is disabled', () => {
    const wall = {
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3000,
      heightMm: 2600,
      cabinets: [],
      plinthConfig: {
        enabled: false,
        heightMm: 150,
        materialType: 'PVC',
        setbackMm: 45
      }
    } as any;

    expect(builder.buildPlinthRequest(wall, 100)).toEqual({
      enabled: false,
      heightMm: 150,
      feetType: 'FEET_150',
      materialType: 'PVC',
      colorCode: undefined,
      setbackMm: 45
    });
  });

  it('should fall back to project plinth height for disabled plinth without explicit height', () => {
    const wall = {
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3000,
      heightMm: 2600,
      cabinets: [],
      plinthConfig: {
        enabled: false,
        materialType: 'PVC'
      }
    } as any;

    expect(builder.buildPlinthRequest(wall, 120)).toEqual({
      enabled: false,
      heightMm: 120,
      feetType: 'FEET_120',
      materialType: 'PVC',
      colorCode: undefined,
      setbackMm: 40
    });
  });

  it('should fall back to project plinth height when wall does not override it', () => {
    const wall = {
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3000,
      heightMm: 2600,
      cabinets: [],
      plinthConfig: {
        enabled: true,
        materialType: 'ALUMINUM'
      }
    } as any;

    expect(builder.buildPlinthRequest(wall, 135)).toEqual({
      enabled: true,
      heightMm: 135,
      feetType: 'FEET_120',
      materialType: 'ALUMINUM',
      colorCode: undefined,
      setbackMm: 40
    });
  });
});
