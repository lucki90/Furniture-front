import { TestBed } from '@angular/core/testing';
import { KitchenGeometryService, KitchenGeometrySettings } from './kitchen-geometry.service';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

describe('KitchenGeometryService', () => {
  let service: KitchenGeometryService;

  const settings: KitchenGeometrySettings = {
    wallHeightMm: 2600,
    plinthHeightMm: 100,
    countertopThicknessMm: 38,
    upperFillerHeightMm: 50,
    fillerWidthMm: 30
  };

  const buildCabinet = (overrides: Partial<KitchenCabinet> = {}): KitchenCabinet => ({
    id: overrides.id ?? 'cab-1',
    name: overrides.name,
    type: overrides.type ?? KitchenCabinetType.BASE_ONE_DOOR,
    openingType: overrides.openingType ?? 'LEFT',
    width: overrides.width ?? 600,
    height: overrides.height ?? 720,
    depth: overrides.depth ?? 560,
    positionY: overrides.positionY ?? 0,
    shelfQuantity: overrides.shelfQuantity ?? 1,
    positioningMode: overrides.positioningMode,
    gapFromCountertopMm: overrides.gapFromCountertopMm,
    leftEnclosureType: overrides.leftEnclosureType,
    rightEnclosureType: overrides.rightEnclosureType,
    leftSupportPlate: overrides.leftSupportPlate,
    rightSupportPlate: overrides.rightSupportPlate,
    distanceFromWallMm: overrides.distanceFromWallMm,
    leftFillerWidthOverrideMm: overrides.leftFillerWidthOverrideMm,
    rightFillerWidthOverrideMm: overrides.rightFillerWidthOverrideMm,
    bottomWreathOnFloor: overrides.bottomWreathOnFloor,
    calculatedResult: overrides.calculatedResult,
    ...overrides
  } as KitchenCabinet);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [KitchenGeometryService, ProjectRequestBuilderService]
    });

    service = TestBed.inject(KitchenGeometryService);
  });

  it('should include full-height cabinets in both zone width calculations', () => {
    const baseCabinet = buildCabinet({
      id: 'base',
      type: KitchenCabinetType.BASE_ONE_DOOR,
      width: 600,
      leftEnclosureType: 'PARALLEL_FILLER_STRIP',
      leftFillerWidthOverrideMm: 40
    });
    const tallCabinet = buildCabinet({
      id: 'tall',
      type: KitchenCabinetType.TALL_CABINET,
      width: 700,
      rightEnclosureType: 'SIDE_PLATE_TO_FLOOR'
    });
    const upperCabinet = buildCabinet({
      id: 'upper',
      type: KitchenCabinetType.UPPER_ONE_DOOR,
      width: 500
    });

    expect(service.calculateUsedWidth([baseCabinet, tallCabinet, upperCabinet], 'BOTTOM', settings.fillerWidthMm)).toBe(1358);
    expect(service.calculateUsedWidth([baseCabinet, tallCabinet, upperCabinet], 'TOP', settings.fillerWidthMm)).toBe(1218);
  });

  it('should calculate cabinet positions with separate bottom and top lanes', () => {
    const baseCabinet = buildCabinet({
      id: 'base',
      type: KitchenCabinetType.BASE_ONE_DOOR,
      width: 600,
      leftEnclosureType: 'PARALLEL_FILLER_STRIP',
      leftFillerWidthOverrideMm: 40
    });
    const upperCabinet = buildCabinet({
      id: 'upper',
      type: KitchenCabinetType.UPPER_ONE_DOOR,
      width: 500,
      height: 720,
      depth: 320,
      positioningMode: 'RELATIVE_TO_COUNTERTOP',
      gapFromCountertopMm: 450
    });
    const tallCabinet = buildCabinet({
      id: 'tall',
      type: KitchenCabinetType.TALL_CABINET,
      width: 700,
      height: 2100,
      rightEnclosureType: 'SIDE_PLATE_TO_FLOOR'
    });

    expect(service.calculateCabinetPositions([baseCabinet, upperCabinet, tallCabinet], settings)).toEqual([
      jasmine.objectContaining({ cabinetId: 'base', x: 40, y: 100, width: 600, height: 720 }),
      jasmine.objectContaining({ cabinetId: 'upper', x: 0, y: 1308, width: 500, height: 720 }),
      jasmine.objectContaining({ cabinetId: 'tall', x: 640, y: 100, width: 700, height: 2100 })
    ]);
  });

  it('should auto-reposition UPPER beside TALL when it cannot fit above (ceilingY < tallTop)', () => {
    const tallCabinet = buildCabinet({
      id: 'tall',
      type: KitchenCabinetType.TALL_CABINET,
      width: 600,
      height: 2300  // tallTop = 100+2300 = 2400
    });
    const baseCabinet = buildCabinet({
      id: 'base',
      type: KitchenCabinetType.BASE_WITH_DRAWERS,
      width: 800,
      height: 760,
      drawerQuantity: 3,
      drawerModel: 'ANTARO'
    } as Partial<KitchenCabinet>);
    const upperCabinet = buildCabinet({
      id: 'upper',
      type: KitchenCabinetType.UPPER_ONE_DOOR,
      width: 400,
      height: 900,
      depth: 320,
      positioningMode: 'RELATIVE_TO_CEILING'
      // ceilingY = 2600 - 50 - 900 = 1650 < tallTop(2400) → doesn't fit → auto-reposition to X=600
    });
    const relativeCabinet = buildCabinet({
      id: 'upper-gap',
      type: KitchenCabinetType.UPPER_ONE_DOOR,
      width: 450,
      height: 700,
      depth: 320,
      positioningMode: 'RELATIVE_TO_COUNTERTOP',
      gapFromCountertopMm: 300
    });

    const result = service.calculateCabinetPositions([tallCabinet, baseCabinet, upperCabinet, relativeCabinet], settings);

    // TALL too tall → UPPER auto-repositioned to X=600 (beside TALL), y stays at ceiling formula
    // upper-gap (COUNTERTOP mode): no skip → starts after upper at X=600+400=1000
    // countertopH = 100 + 760 + 38 = 898; y = 898+300 = 1198
    expect(result[2]).toEqual(jasmine.objectContaining({ cabinetId: 'upper', x: 600, y: 1650 }));
    expect(result[3]).toEqual(jasmine.objectContaining({ cabinetId: 'upper-gap', x: 1000, y: 1198 }));
  });

  it('should keep UPPER at X=0 (overlapping TALL in X) when it fits above (ceilingY >= tallTop)', () => {
    const tallCabinet = buildCabinet({
      id: 'tall',
      type: KitchenCabinetType.TALL_CABINET,
      width: 600,
      height: 1500  // tallTop = 100+1500 = 1600
    });
    const upperCabinet = buildCabinet({
      id: 'upper',
      type: KitchenCabinetType.UPPER_ONE_DOOR,
      width: 400,
      height: 900,
      depth: 320,
      positioningMode: 'RELATIVE_TO_CEILING'
      // ceilingY = 2600 - 50 - 900 = 1650 > tallTop(1600) → fits above → stays at X=0
    });

    const result = service.calculateCabinetPositions([tallCabinet, upperCabinet], settings);

    expect(result[1]).toEqual(jasmine.objectContaining({ cabinetId: 'upper', x: 0, y: 1650 }));
  });
});
