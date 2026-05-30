import { buildVisualCabinetPositions } from './kitchen-layout-view-model.builder';
import { CabinetPosition, KitchenCabinet } from '../model/kitchen-state.model';
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

function createPosition(overrides: Partial<CabinetPosition> = {}): CabinetPosition {
  return {
    cabinetId: 'cab-1',
    x: 0,
    y: 100,
    width: 800,
    height: 720,
    ...overrides
  };
}

describe('kitchen-layout-view-model.builder', () => {
  it('should build bottom cabinet view model with feet, front elements and enclosure widths', () => {
    const [position] = buildVisualCabinetPositions({
      cabinetPositions: [createPosition()],
      cabinets: [
        createCabinet({
          leftEnclosureType: 'PARALLEL_FILLER_STRIP',
          leftFillerWidthOverrideMm: 80,
          rightEnclosureType: 'SIDE_PLATE_TO_FLOOR'
        })
      ],
      scale: 0.1,
      wallWidth: 100,
      wallDisplayHeight: 180,
      scaleVert: 0.1,
      feetHeightMm: 100,
      fillerWidthMm: 50,
      standardBottomHeight: 720,
      standardTopHeight: 720,
      standardBottomDepth: 560,
      standardTopDepth: 320,
      frontGap: 1
    });

    expect(position.zone).toBe('BOTTOM');
    expect(position.displayX).toBe(0);
    expect(position.displayY).toBe(98);
    expect(position.feetHeight).toBe(10);
    expect(position.feet).toHaveSize(2);
    expect(position.leftEnclosureDisplayWidth).toBe(8);
    expect(position.rightEnclosureDisplayWidth).toBe(2);
    expect(position.fronts.length).toBeGreaterThan(0);
  });

  it('should build top cabinet view model without feet and preserve overflow flag', () => {
    const [position] = buildVisualCabinetPositions({
      cabinetPositions: [createPosition({ cabinetId: 'upper-1', x: 700, y: 1200, width: 800, height: 700 })],
      cabinets: [
        createCabinet({
          id: 'upper-1',
          type: KitchenCabinetType.UPPER_ONE_DOOR,
          width: 800,
          height: 700,
          depth: 320
        })
      ],
      scale: 0.1,
      wallWidth: 120,
      wallDisplayHeight: 180,
      scaleVert: 0.1,
      feetHeightMm: 100,
      fillerWidthMm: 50,
      standardBottomHeight: 720,
      standardTopHeight: 720,
      standardBottomDepth: 560,
      standardTopDepth: 320,
      frontGap: 1
    });

    expect(position.zone).toBe('TOP');
    expect(position.feetHeight).toBe(0);
    expect(position.feet).toEqual([]);
    expect(position.displayY).toBe(-10);
    expect(position.isOverflow).toBeTrue();
  });

  it('should compute oven separator only when lower section exists', () => {
    const [position] = buildVisualCabinetPositions({
      cabinetPositions: [createPosition({ cabinetId: 'oven-1' })],
      cabinets: [
        createCabinet({
          id: 'oven-1',
          type: KitchenCabinetType.BASE_OVEN,
          ovenHeightType: 'COMPACT',
          ovenLowerSectionType: 'LOW_DRAWER',
          ovenApronEnabled: true,
          ovenApronHeightMm: 60
        } as Partial<KitchenCabinet>)
      ],
      scale: 0.1,
      wallWidth: 200,
      wallDisplayHeight: 180,
      scaleVert: 0.1,
      feetHeightMm: 100,
      fillerWidthMm: 50,
      standardBottomHeight: 720,
      standardTopHeight: 720,
      standardBottomDepth: 560,
      standardTopDepth: 320,
      frontGap: 1
    });

    expect(position.ovenSeparatorDisplayY).toBeDefined();
    expect(position.ovenSeparatorDisplayY).toBeGreaterThan(position.displayY);
    expect(position.ovenSeparatorDisplayY).toBeLessThan(position.displayY + position.bodyHeight);
  });

  it('should render pantry passage as one door with a plinth bend line', () => {
    const [position] = buildVisualCabinetPositions({
      cabinetPositions: [createPosition({ cabinetId: 'passage-1', width: 550, height: 2200 })],
      cabinets: [
        createCabinet({
          id: 'passage-1',
          type: KitchenCabinetType.PANTRY_PASSAGE,
          width: 550,
          height: 2200,
          depth: 120,
          shelfQuantity: 0,
          pantryPassageFrontType: 'ONE_DOOR'
        } as Partial<KitchenCabinet>)
      ],
      scale: 0.1,
      wallWidth: 200,
      wallDisplayHeight: 240,
      scaleVert: 0.1,
      feetHeightMm: 120,
      fillerWidthMm: 50,
      standardBottomHeight: 720,
      standardTopHeight: 720,
      standardBottomDepth: 560,
      standardTopDepth: 320,
      frontGap: 1
    });

    expect(position.zone).toBe('FULL');
    expect(position.feetHeight).toBe(0);
    expect(position.fronts.filter(front => front.type === 'DOOR_SINGLE')).toHaveSize(1);
    expect(position.fronts.some(front => front.type === 'PLINTH_BREAK_LINE')).toBeTrue();
  });

  it('should render pantry passage as two doors when requested', () => {
    const [position] = buildVisualCabinetPositions({
      cabinetPositions: [createPosition({ cabinetId: 'passage-2', width: 900, height: 2200 })],
      cabinets: [
        createCabinet({
          id: 'passage-2',
          type: KitchenCabinetType.PANTRY_PASSAGE,
          width: 900,
          height: 2200,
          depth: 120,
          shelfQuantity: 0,
          pantryPassageFrontType: 'TWO_DOORS'
        } as Partial<KitchenCabinet>)
      ],
      scale: 0.1,
      wallWidth: 200,
      wallDisplayHeight: 240,
      scaleVert: 0.1,
      feetHeightMm: 100,
      fillerWidthMm: 50,
      standardBottomHeight: 720,
      standardTopHeight: 720,
      standardBottomDepth: 560,
      standardTopDepth: 320,
      frontGap: 1
    });

    expect(position.fronts.filter(front => front.type === 'DOOR_SINGLE')).toHaveSize(2);
    expect(position.fronts.some(front => front.type === 'PLINTH_BREAK_LINE')).toBeTrue();
  });

  function buildCorner(cornerOverrides: Partial<KitchenCabinet>) {
    return buildVisualCabinetPositions({
      cabinetPositions: [createPosition({ cabinetId: 'corner-1', width: 900, height: 720 })],
      cabinets: [
        createCabinet({
          id: 'corner-1',
          type: KitchenCabinetType.CORNER_CABINET,
          width: 900,
          height: 720,
          depth: 560,
          ...cornerOverrides
        } as Partial<KitchenCabinet>)
      ],
      scale: 0.1,
      wallWidth: 200,
      wallDisplayHeight: 180,
      scaleVert: 0.1,
      feetHeightMm: 100,
      fillerWidthMm: 50,
      standardBottomHeight: 720,
      standardTopHeight: 720,
      standardBottomDepth: 560,
      standardTopDepth: 320,
      frontGap: 1
    })[0];
  }

  it('should render Type A two-door corner as two doors meeting in the center', () => {
    const position = buildCorner({
      cornerWidthA: 900,
      cornerWidthB: 600,
      cornerMechanism: 'FIXED_SHELVES',
      cornerOpeningType: 'TWO_DOORS',
      isUpperCorner: false
    } as Partial<KitchenCabinet>);

    expect(position.isCorner).toBeTrue();
    expect(position.fronts.filter(front => front.type === 'DOOR_SINGLE')).toHaveSize(2);
    expect(position.fronts.some(front => front.type === 'VERT_DIVIDER')).toBeFalse();
    expect(position.handles).toHaveSize(2);
  });

  it('should render Type A bifold corner as two folding panels with a fold divider', () => {
    const position = buildCorner({
      cornerWidthA: 900,
      cornerWidthB: 600,
      cornerMechanism: 'FIXED_SHELVES',
      cornerOpeningType: 'BIFOLD',
      isUpperCorner: false
    } as Partial<KitchenCabinet>);

    expect(position.fronts.filter(front => front.type === 'DOOR_SINGLE')).toHaveSize(2);
    expect(position.fronts.filter(front => front.type === 'VERT_DIVIDER')).toHaveSize(1);
    expect(position.fronts.filter(front => front.type === 'DOOR_SINGLE')
      .every(front => front.hingesSide === 'LEFT')).toBeTrue();
    expect(position.handles).toHaveSize(1);
  });

  it('should render Type B blind corner as active front + fixed blind panel with a single handle', () => {
    const position = buildCorner({
      cornerWidthA: 1000,
      cornerMechanism: 'BLIND_CORNER',
      cornerFrontUchylnyWidthMm: 500,
      isUpperCorner: false
    } as Partial<KitchenCabinet>);

    const doors = position.fronts.filter(front => front.type === 'DOOR_SINGLE');
    expect(doors).toHaveSize(2);
    expect(position.fronts.filter(front => front.type === 'VERT_DIVIDER')).toHaveSize(1);
    // Exactly one openable front carries a handle; the blind panel has none.
    expect(position.handles).toHaveSize(1);
    // Active front (with hinges) ≈ 500/1000 of usable width; blind panel takes the rest.
    const active = doors.find(front => front.hingesSide !== undefined);
    const blind = doors.find(front => front.hingesSide === undefined);
    expect(active).toBeDefined();
    expect(blind).toBeDefined();
    expect(active!.width).toBeCloseTo(blind!.width, 0);
  });

  it('should render upper corner (isUpperCorner variant) in the TOP zone with two doors', () => {
    const position = buildVisualCabinetPositions({
      cabinetPositions: [createPosition({ cabinetId: 'corner-up', x: 0, y: 1500, width: 700, height: 720 })],
      cabinets: [
        createCabinet({
          id: 'corner-up',
          type: KitchenCabinetType.CORNER_CABINET,
          width: 700,
          height: 720,
          depth: 320,
          cornerWidthA: 700,
          cornerWidthB: 700,
          cornerMechanism: 'FIXED_SHELVES',
          cornerOpeningType: 'TWO_DOORS',
          isUpperCorner: true
        } as Partial<KitchenCabinet>)
      ],
      scale: 0.1,
      wallWidth: 200,
      wallDisplayHeight: 180,
      scaleVert: 0.1,
      feetHeightMm: 100,
      fillerWidthMm: 50,
      standardBottomHeight: 720,
      standardTopHeight: 720,
      standardBottomDepth: 560,
      standardTopDepth: 320,
      frontGap: 1
    })[0];

    expect(position.zone).toBe('TOP');
    expect(position.feetHeight).toBe(0);
    expect(position.fronts.filter(front => front.type === 'DOOR_SINGLE')).toHaveSize(2);
  });
});
