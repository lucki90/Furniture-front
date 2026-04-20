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
});
