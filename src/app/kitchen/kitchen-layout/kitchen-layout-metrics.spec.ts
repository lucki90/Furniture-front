import {
  buildCooktopGapWarning,
  buildKitchenLayoutMetrics,
  buildSideFillerWarning,
  MIN_WORKSPACE_GAP_MM
} from './kitchen-layout-metrics';
import { KitchenCabinet, WallWithCabinets } from '../model/kitchen-state.model';
import { WallType } from '../model/kitchen-project.model';
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

  describe('buildSideFillerWarning', () => {
    function createWall(type: WallType, cabinets: KitchenCabinet[], widthMm = 3600): WallWithCabinets {
      return { id: 'wall-1', type, widthMm, heightMm: 2400, cabinets };
    }

    it('warns for both edges when extreme cabinets touch the wall without a side filler', () => {
      const wall = createWall('MAIN', [
        createCabinet({ id: 'left', leftEnclosureType: 'NONE' }),
        createCabinet({ id: 'right', rightEnclosureType: 'NONE' })
      ]);
      const spans = [
        { cabinetId: 'left', x: 0, width: 800 },
        { cabinetId: 'right', x: 2800, width: 800 }
      ];

      const warning = buildSideFillerWarning(wall, spans, 3600);

      expect(warning?.sides).toEqual(['left', 'right']);
      expect(warning?.message).toContain('lewa i prawa');
      expect(warning?.message).toContain('blendy bocznej');
    });

    it('warns only for the left edge when the last cabinet ends far from the wall (gap >= 50mm)', () => {
      const wall = createWall('MAIN', [
        createCabinet({ id: 'left' }),
        createCabinet({ id: 'right' })
      ]);
      const spans = [
        { cabinetId: 'left', x: 0, width: 800 },
        { cabinetId: 'right', x: 2200, width: 800 } // ends at 3000, wall 3600 -> gap 600
      ];

      const warning = buildSideFillerWarning(wall, spans, 3600);

      expect(warning?.sides).toEqual(['left']);
      expect(warning?.message).toContain('Skrajna szafka');
    });

    it('suppresses a side when the extreme cabinet already has an enclosure on that side', () => {
      const wall = createWall('MAIN', [
        createCabinet({ id: 'left', leftEnclosureType: 'PARALLEL_FILLER_STRIP' }),
        createCabinet({ id: 'right', rightEnclosureType: 'SIDE_PLATE_TO_FLOOR' })
      ]);
      const spans = [
        { cabinetId: 'left', x: 0, width: 800 },
        { cabinetId: 'right', x: 2800, width: 800 }
      ];

      expect(buildSideFillerWarning(wall, spans, 3600)).toBeNull();
    });

    it('suppresses the connected side for CORNER_LEFT / CORNER_RIGHT walls', () => {
      const spans = [
        { cabinetId: 'left', x: 0, width: 800 },
        { cabinetId: 'right', x: 2800, width: 800 }
      ];
      const cornerLeft = createWall('CORNER_LEFT', [
        createCabinet({ id: 'left' }),
        createCabinet({ id: 'right' })
      ]);
      const cornerRight = createWall('CORNER_RIGHT', [
        createCabinet({ id: 'left' }),
        createCabinet({ id: 'right' })
      ]);

      expect(buildSideFillerWarning(cornerLeft, spans, 3600)?.sides).toEqual(['right']);
      expect(buildSideFillerWarning(cornerRight, spans, 3600)?.sides).toEqual(['left']);
    });

    it('returns null for islands and for empty layouts', () => {
      const island = createWall('ISLAND', [createCabinet({ id: 'left' })]);
      expect(buildSideFillerWarning(island, [{ cabinetId: 'left', x: 0, width: 800 }], 3600)).toBeNull();
      expect(buildSideFillerWarning(createWall('MAIN', []), [], 3600)).toBeNull();
      expect(buildSideFillerWarning(undefined, [{ cabinetId: 'left', x: 0, width: 800 }], 3600)).toBeNull();
    });
  });
});
