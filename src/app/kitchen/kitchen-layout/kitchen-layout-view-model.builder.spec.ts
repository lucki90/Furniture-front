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

  it('should render Type A two-door corner as one frontal door + perpendicular edge + side panel', () => {
    const position = buildCorner({
      cornerWidthA: 900,
      cornerWidthB: 600,
      cornerMechanism: 'FIXED_SHELVES',
      cornerOpeningType: 'TWO_DOORS',
      isUpperCorner: false
    } as Partial<KitchenCabinet>);

    expect(position.isCorner).toBeTrue();
    // Tylko jeden front jest skierowany do widza; drugi (prostopadły) widać jako pionową krawędź,
    // a reszta szerokości to bok szafki (korpus prześwituje — brak prostokąta frontu).
    const doors = position.fronts.filter(front => front.type === 'DOOR_SINGLE');
    expect(doors).toHaveSize(1);
    expect(position.fronts.filter(front => front.type === 'VERT_DIVIDER')).toHaveSize(1);
    expect(position.handles).toHaveSize(1);
    // Szafka w lewej połowie ściany → styk po lewej, front po prawej (zawias na wolnej, prawej krawędzi).
    expect(doors[0].hingesSide).toBe('RIGHT');
    // Front czołowy ≈ widthA/(widthA+widthB) = 900/1500 = 0.6 użytecznej szerokości.
    const usableWidth = position.displayWidth - 2; // frontGap=1 z obu stron
    expect(doors[0].width).toBeCloseTo(usableWidth * 0.6, 1);
  });

  it('should render Type A bifold corner the same as two-door in front elevation (one frontal door)', () => {
    const position = buildCorner({
      cornerWidthA: 900,
      cornerWidthB: 600,
      cornerMechanism: 'FIXED_SHELVES',
      cornerOpeningType: 'BIFOLD',
      isUpperCorner: false
    } as Partial<KitchenCabinet>);

    // W widoku od frontu BIFOLD wygląda identycznie jak TWO_DOORS (różnica tylko w rzucie z góry).
    expect(position.fronts.filter(front => front.type === 'DOOR_SINGLE')).toHaveSize(1);
    expect(position.fronts.filter(front => front.type === 'VERT_DIVIDER')).toHaveSize(1);
    expect(position.handles).toHaveSize(1);
  });

  it('should place the side panel on the RIGHT for a corner in the right half of the wall', () => {
    // Szafka w prawej połowie ściany (x=2000mm, wallWidth=200px @ scale 0.1 → center px = 205 > 100).
    const position = buildVisualCabinetPositions({
      cabinetPositions: [createPosition({ cabinetId: 'corner-r', x: 2000, width: 900, height: 720 })],
      cabinets: [
        createCabinet({
          id: 'corner-r',
          type: KitchenCabinetType.CORNER_CABINET,
          width: 900,
          height: 720,
          depth: 560,
          cornerWidthA: 900,
          cornerWidthB: 600,
          cornerMechanism: 'FIXED_SHELVES',
          cornerOpeningType: 'TWO_DOORS',
          isUpperCorner: false
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

    const doors = position.fronts.filter(front => front.type === 'DOOR_SINGLE');
    expect(doors).toHaveSize(1);
    // Styk po prawej → front po lewej, zawias na wolnej (lewej) krawędzi.
    expect(doors[0].hingesSide).toBe('LEFT');
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

  it('should render upper corner (isUpperCorner variant) in the TOP zone as an L-shape front', () => {
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
    // Type A (L-kształt) w elewacji: tylko 1 front czołowy + krawędź frontu prostopadłego + bok.
    expect(position.fronts.filter(front => front.type === 'DOOR_SINGLE')).toHaveSize(1);
    expect(position.fronts.filter(front => front.type === 'VERT_DIVIDER')).toHaveSize(1);
    expect(position.handles).toHaveSize(1);
  });

  function buildLiftUp(overrides: Partial<KitchenCabinet>) {
    return buildVisualCabinetPositions({
      cabinetPositions: [createPosition({ cabinetId: 'lift-1', x: 0, y: 1500, width: 600, height: 700 })],
      cabinets: [
        createCabinet({
          id: 'lift-1',
          type: KitchenCabinetType.UPPER_LIFT_UP,
          width: 600,
          height: 700,
          depth: 320,
          ...overrides
        } as Partial<KitchenCabinet>)
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
    })[0];
  }

  it('should render AVENTOS_HF_TOP as two folding fronts split by a visible gap (asymmetric)', () => {
    const position = buildLiftUp({
      liftMechanismType: 'AVENTOS_HF_TOP',
      hfUpperFrontHeightMm: 400
    } as Partial<KitchenCabinet>);

    const fronts = position.fronts
      .filter(front => front.type === 'DOOR_SINGLE')
      .sort((a, b) => a.y - b.y);
    expect(fronts).toHaveSize(2);
    // Widoczna przerwa między skrzydłami: dół górnego frontu < góra dolnego frontu.
    expect(fronts[0].y + fronts[0].height).toBeLessThan(fronts[1].y);
    // Reguła Blum „większy front u góry" — przy 400/700 górne skrzydło jest wyższe.
    expect(fronts[0].height).toBeGreaterThan(fronts[1].height);
    // Front składany ma uchwyt do podniesienia, ale bez bocznego zawiasu.
    expect(position.handles).toHaveSize(1);
    expect(fronts.every(front => front.hingesSide === undefined)).toBeTrue();
  });

  it('should render AVENTOS_HF_TOP symmetric (null upper height) as ~50/50 fronts with a gap', () => {
    const position = buildLiftUp({
      liftMechanismType: 'AVENTOS_HF_TOP',
      hfUpperFrontHeightMm: null
    } as Partial<KitchenCabinet>);

    const fronts = position.fronts
      .filter(front => front.type === 'DOOR_SINGLE')
      .sort((a, b) => a.y - b.y);
    expect(fronts).toHaveSize(2);
    expect(fronts[0].y + fronts[0].height).toBeLessThan(fronts[1].y);
    expect(fronts[0].height).toBeCloseTo(fronts[1].height, 0);
  });

  it('should render non-HF lift mechanism (GAS_GTV) as a single front', () => {
    const position = buildLiftUp({
      liftMechanismType: 'GAS_GTV',
      hfUpperFrontHeightMm: null
    } as Partial<KitchenCabinet>);

    expect(position.fronts.filter(front => front.type === 'DOOR_SINGLE')).toHaveSize(1);
  });
});
