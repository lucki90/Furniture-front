import { ProjectRequestBuilderService, WallBuildSettings } from './project-request-builder.service';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { WallWithCabinets, KitchenCabinet } from '../model/kitchen-state.model';
import { DEFAULT_COUNTERTOP_REQUEST } from '../model/countertop.model';
import { DEFAULT_PLINTH_REQUEST } from '../model/plinth.model';
import { PLATE_THICKNESS_MM } from '../kitchen-layout/kitchen-layout.constants';
import { SegmentFrontType, SegmentType } from '../cabinet-form/model/segment.model';

describe('ProjectRequestBuilderService', () => {
  let service: ProjectRequestBuilderService;

  const settings: WallBuildSettings = {
    plinthHeightMm: 100,
    countertopThicknessMm: 38,
    upperFillerHeightMm: 50,
    fillerWidthMm: 30
  };

  beforeEach(() => {
    service = new ProjectRequestBuilderService();
  });

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

  const buildWall = (overrides: Partial<WallWithCabinets> = {}): WallWithCabinets => ({
    id: overrides.id ?? 'wall-1',
    type: overrides.type ?? 'MAIN',
    widthMm: overrides.widthMm ?? 3000,
    heightMm: overrides.heightMm ?? 2500,
    cabinets: overrides.cabinets ?? [],
    countertopConfig: overrides.countertopConfig,
    plinthConfig: overrides.plinthConfig
  });

  describe('enclosureOuterWidthMm', () => {
    it('should return 0 when enclosure is disabled', () => {
      const cabinet = buildCabinet({ leftEnclosureType: 'NONE' });

      expect(service.enclosureOuterWidthMm(cabinet, 'left', settings.fillerWidthMm)).toBe(0);
    });

    it('should use filler override for parallel filler strips', () => {
      const cabinet = buildCabinet({
        leftEnclosureType: 'PARALLEL_FILLER_STRIP',
        leftFillerWidthOverrideMm: 55
      });

      expect(service.enclosureOuterWidthMm(cabinet, 'left', settings.fillerWidthMm)).toBe(55);
    });

    it('should fall back to plate thickness for solid side enclosures', () => {
      const cabinet = buildCabinet({ rightEnclosureType: 'SIDE_PLATE_TO_FLOOR' });

      expect(service.enclosureOuterWidthMm(cabinet, 'right', settings.fillerWidthMm)).toBe(PLATE_THICKNESS_MM);
    });
  });

  describe('buildConnections', () => {
    it('should create left and right corner connections against the nearest horizontal wall', () => {
      const walls: WallWithCabinets[] = [
        buildWall({ id: 'main', type: 'MAIN' }),
        buildWall({ id: 'left', type: 'LEFT' }),
        buildWall({ id: 'right', type: 'RIGHT' })
      ];

      expect(service.buildConnections(walls)).toEqual([
        { wallIndexA: 0, wallIndexB: 1, connectionType: 'L_CORNER_LEFT' },
        { wallIndexA: 0, wallIndexB: 2, connectionType: 'L_CORNER_RIGHT' }
      ]);
    });

    it('should fall back to the next horizontal wall when there is no previous one', () => {
      const walls: WallWithCabinets[] = [
        buildWall({ id: 'left', type: 'LEFT' }),
        buildWall({ id: 'main', type: 'MAIN' })
      ];

      expect(service.buildConnections(walls)).toEqual([
        { wallIndexA: 1, wallIndexB: 0, connectionType: 'L_CORNER_LEFT' }
      ]);
    });

    it('should skip side walls when no horizontal partner exists', () => {
      const walls: WallWithCabinets[] = [
        buildWall({ id: 'left', type: 'LEFT' }),
        buildWall({ id: 'island', type: 'ISLAND' })
      ];

      expect(service.buildConnections(walls)).toEqual([]);
    });
  });

  describe('buildCountertopRequest', () => {
    it('should return a disabled default request when countertop config is missing', () => {
      const wall = buildWall();

      expect(service.buildCountertopRequest(wall)).toEqual({
        ...DEFAULT_COUNTERTOP_REQUEST,
        enabled: false
      });
    });

    it('should map wall countertop config and add side overhang extras', () => {
      const wall = buildWall({
        countertopConfig: {
          enabled: true,
          materialType: 'COMPACT',
          colorCode: 'oak',
          thicknessMm: 20,
          manualLengthMm: 2000,
          manualDepthMm: 650,
          frontOverhangMm: 25,
          sideOverhangExtraMm: 8,
          jointType: 'MITER_JOINT',
          edgeType: 'POSTFORMED'
        }
      });

      const result = service.buildCountertopRequest(wall, 18, 30);

      expect(result).toEqual({
        enabled: true,
        materialType: 'COMPACT',
        colorCode: 'oak',
        thicknessMm: 20,
        manualLengthMm: 2000,
        manualDepthMm: 650,
        frontOverhangMm: 25,
        backOverhangMm: DEFAULT_COUNTERTOP_REQUEST.backOverhangMm,
        leftOverhangMm: 26,
        rightOverhangMm: 38,
        jointType: 'MITER_JOINT',
        frontEdgeType: 'POSTFORMED',
        leftEdgeType: DEFAULT_COUNTERTOP_REQUEST.leftEdgeType,
        rightEdgeType: DEFAULT_COUNTERTOP_REQUEST.rightEdgeType,
        backEdgeType: DEFAULT_COUNTERTOP_REQUEST.backEdgeType
      });
    });
  });

  describe('buildPlinthRequest', () => {
    it('should return a disabled default request when plinth config is missing', () => {
      const wall = buildWall();

      expect(service.buildPlinthRequest(wall)).toEqual({
        ...DEFAULT_PLINTH_REQUEST,
        enabled: false
      });
    });

    it('should map plinth configuration values when enabled', () => {
      const wall = buildWall({
        plinthConfig: {
          enabled: true,
          feetType: 'FEET_150',
          materialType: 'ALUMINUM',
          colorCode: 'silver',
          setbackMm: 55
        }
      });

      expect(service.buildPlinthRequest(wall)).toEqual({
        enabled: true,
        feetType: 'FEET_150',
        materialType: 'ALUMINUM',
        colorCode: 'silver',
        setbackMm: 55
      });
    });
  });

  describe('buildProjectWalls', () => {
    it('should position bottom and upper cabinets, map drawers, corners and wall add-ons', () => {
      const baseCabinet = buildCabinet({
        id: 'base-1',
        type: KitchenCabinetType.BASE_WITH_DRAWERS,
        width: 600,
        height: 720,
        drawerQuantity: 4,
        drawerModel: 'ANTARO',
        leftEnclosureType: 'PARALLEL_FILLER_STRIP',
        leftFillerWidthOverrideMm: 40,
        rightEnclosureType: 'SIDE_PLATE_TO_FLOOR'
      } as Partial<KitchenCabinet>);
      const upperCabinet = buildCabinet({
        id: 'upper-1',
        type: KitchenCabinetType.UPPER_ONE_DOOR,
        width: 500,
        height: 720,
        depth: 320,
        positioningMode: 'RELATIVE_TO_COUNTERTOP',
        gapFromCountertopMm: 450,
        isLiftUp: true,
        isFrontExtended: true
      } as Partial<KitchenCabinet>);
      const cornerCabinet = buildCabinet({
        id: 'corner-1',
        type: KitchenCabinetType.CORNER_CABINET,
        width: 900,
        height: 720,
        depth: 900,
        cornerWidthA: 950,
        cornerWidthB: 870,
        cornerMechanism: 'LE_MANS',
        cornerShelfQuantity: 2,
        isUpperCorner: false,
        cornerOpeningType: 'BIFOLD'
      } as Partial<KitchenCabinet>);
      const wall = buildWall({
        heightMm: 2600,
        cabinets: [baseCabinet, upperCabinet, cornerCabinet],
        countertopConfig: { enabled: true, sideOverhangExtraMm: 6 },
        plinthConfig: { enabled: true, feetType: 'FEET_150', materialType: 'PVC', setbackMm: 45 }
      });

      const [result] = service.buildProjectWalls([wall], settings);

      expect(result.countertop?.leftOverhangMm).toBe(46);
      expect(result.countertop?.rightOverhangMm).toBe(6);
      expect(result.plinth).toEqual({
        enabled: true,
        feetType: 'FEET_150',
        materialType: 'PVC',
        colorCode: undefined,
        setbackMm: 45
      });

      expect(result.cabinets[0]).toEqual(jasmine.objectContaining({
        cabinetId: 'base-1',
        positionX: 40,
        positionY: 0,
        drawerRequest: jasmine.objectContaining({
          drawerQuantity: 4,
          drawerModel: 'ANTARO'
        })
      }));
      expect(result.cabinets[1]).toEqual(jasmine.objectContaining({
        cabinetId: 'upper-1',
        positionX: 0,
        positionY: 1308,
        isLiftUp: true,
        isFrontExtended: true
      }));
      expect(result.cabinets[2]).toEqual(jasmine.objectContaining({
        cabinetId: 'corner-1',
        positionX: 658,
        cornerRequest: jasmine.objectContaining({
          widthA: 950,
          widthB: 870,
          mechanism: 'LE_MANS',
          cornerOpeningType: 'BIFOLD'
        })
      }));
    });

    it('should place upper cabinets relative to ceiling when no countertop gap mode is selected', () => {
      const upperCabinet = buildCabinet({
        id: 'upper-ceiling',
        type: KitchenCabinetType.UPPER_ONE_DOOR,
        width: 600,
        height: 900,
        depth: 320,
        positioningMode: 'RELATIVE_TO_CEILING',
        isLiftUp: false,
        isFrontExtended: false
      } as Partial<KitchenCabinet>);
      const wall = buildWall({
        heightMm: 2700,
        cabinets: [upperCabinet]
      });

      const [result] = service.buildProjectWalls([wall], settings);

      expect(result.cabinets[0].positionY).toBe(1750);
    });
  });

  describe('mapCalculationResult', () => {
    it('should normalize legacy and current response field names', () => {
      expect(service.mapCalculationResult({
        totalCost: 1000,
        boardsCost: 400,
        componentCosts: 300,
        jobCosts: 300
      })).toEqual({
        totalCost: 1000,
        boardCosts: 400,
        componentCosts: 300,
        jobCosts: 300
      });

      expect(service.mapCalculationResult({
        summaryCosts: 1100,
        boardTotalCost: 450,
        componentTotalCost: 350,
        jobTotalCost: 300
      })).toEqual({
        totalCost: 1100,
        boardCosts: 450,
        componentCosts: 350,
        jobCosts: 300
      });
    });
  });

  describe('mapSegmentResponseToFormData', () => {
    it('should map segment response back to form data', () => {
      const result = service.mapSegmentResponseToFormData({
        segmentType: SegmentType.DRAWER,
        height: 720,
        orderIndex: 1,
        shelfQuantity: 2,
        frontType: SegmentFrontType.ONE_DOOR,
        drawerRequest: {
          drawerQuantity: 3,
          drawerModel: 'MERIVOBOX',
          drawerBaseHdf: false,
          drawerFrontDetails: null
        }
      });

      expect(result).toEqual({
        segmentType: SegmentType.DRAWER,
        height: 720,
        orderIndex: 1,
        shelfQuantity: 2,
        frontType: SegmentFrontType.ONE_DOOR,
        drawerQuantity: 3,
        drawerModel: 'MERIVOBOX'
      });
    });
  });
});
