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

  it('should place top cabinets relative to ceiling and ignore tall cabinets when computing countertop height', () => {
    const tallCabinet = buildCabinet({
      id: 'tall',
      type: KitchenCabinetType.TALL_CABINET,
      width: 600,
      height: 2300
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

    expect(result[2]).toEqual(jasmine.objectContaining({ cabinetId: 'upper', x: 600, y: 1650 }));
    expect(result[3]).toEqual(jasmine.objectContaining({ cabinetId: 'upper-gap', x: 1000, y: 1198 }));
  });
});
