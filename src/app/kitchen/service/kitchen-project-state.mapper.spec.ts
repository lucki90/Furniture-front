import { TestBed } from '@angular/core/testing';
import { KitchenProjectStateMapper } from './kitchen-project-state.mapper';
import { KitchenCabinetStateFactory } from './kitchen-cabinet-state.factory';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { KitchenProjectDetailResponse } from '../model/kitchen-project.model';

describe('KitchenProjectStateMapper', () => {
  let mapper: KitchenProjectStateMapper;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [KitchenProjectStateMapper, KitchenCabinetStateFactory, ProjectRequestBuilderService]
    });

    mapper = TestBed.inject(KitchenProjectStateMapper);
  });

  it('should map walls, cabinets and wall-level configs from project response', () => {
    const result = mapper.mapProject({
      id: 12,
      name: 'Projekt',
      status: 'DRAFT',
      version: 3,
      totalCost: 0,
      totalBoardsCost: 0,
      totalComponentsCost: 0,
      totalJobsCost: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      walls: [
        {
          id: 1,
          wallType: 'MAIN',
          widthMm: 3600,
          heightMm: 2600,
          wallCost: 0,
          cabinetCount: 1,
          usedWidthMm: 800,
          remainingWidthMm: 2800,
          cabinets: [
            {
              id: 5,
              cabinetId: 'sink-1',
              cabinetType: KitchenCabinetType.BASE_SINK,
              positionX: 0,
              positionY: 0,
              widthMm: 800,
              heightMm: 720,
              depthMm: 560,
              boxMaterialCode: 'CHIPBOARD',
              boxThicknessMm: 18,
              boxColorCode: 'WHITE',
              sinkFrontType: 'DRAWER',
              sinkApronEnabled: false,
              sinkApronHeightMm: 120,
              drawerModel: 'MERIVOBOX',
              boardsCost: 100,
              componentsCost: 50,
              jobsCost: 30,
              totalCost: 180,
              displayOrder: 0
            }
          ],
          countertop: {
            enabled: true,
            totalLengthMm: 800,
            depthMm: 620,
            manualLengthMm: 2100,
            frontOverhangMm: 35,
            backOverhangMm: 10,
            thicknessMm: 38,
            materialType: 'LAMINATE',
            jointType: 'MITER_JOINT',
            frontEdgeType: 'POSTFORMED',
            segments: [],
            segmentCount: 1,
            wasSplit: false,
            components: [],
            totalMaterialCost: 0,
            totalCuttingCost: 0,
            totalEdgingCost: 0,
            totalComponentsCost: 0,
            totalCost: 0
          },
          plinth: {
            enabled: true,
            feetType: 'FEET_150',
            feetHeightMm: 150,
            plinthHeightMm: 147,
            totalLengthMm: 800,
            materialType: 'ALUMINUM',
            setbackMm: 45,
            segments: [],
            segmentCount: 1,
            wasSplit: false,
            components: [],
            totalFeetCount: 4,
            totalMountingClipCount: 2,
            totalMaterialCost: 0,
            totalCuttingCost: 0,
            totalComponentsCost: 0,
            totalCost: 0
          }
        }
      ]
    } as KitchenProjectDetailResponse);

    expect(result.wallIdCounter).toBe(1);
    expect(result.cabinetIdCounter).toBe(1);
    expect(result.walls[0]).toEqual(jasmine.objectContaining({
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3600,
      heightMm: 2600,
      countertopConfig: jasmine.objectContaining({
        enabled: true,
        materialType: 'LAMINATE',
        thicknessMm: 38,
        manualLengthMm: 2100,
        manualDepthMm: 620,
        frontOverhangMm: 35,
        backOverhangMm: 10,
        jointType: 'MITER_JOINT',
        edgeType: 'POSTFORMED',
        sideOverhangExtraMm: 5
      }),
      plinthConfig: jasmine.objectContaining({
        enabled: true,
        heightMm: 147,
        feetType: 'FEET_150',
        materialType: 'ALUMINUM'
      })
    }));
    expect(result.walls[0].cabinets[0]).toEqual(jasmine.objectContaining({
      id: 'sink-1',
      type: KitchenCabinetType.BASE_SINK,
      sinkFrontType: 'DRAWER',
      sinkApronEnabled: false,
      sinkApronHeightMm: 120,
      sinkDrawerModel: 'MERIVOBOX'
    }));
  });

  it('should preserve disabled countertop config values on load', () => {
    // Jak user explicite wylaczyl blat, reload MUSI zachowac ten stan (nie `undefined`)
    // oraz parametry z zapisanej konfiguracji, zeby ponowne wlaczenie nie wracalo do przypadkowych defaultow.
    const result = mapper.mapProject({
      id: 55,
      name: 'Island disabled countertop',
      status: 'DRAFT',
      version: 1,
      totalCost: 0,
      totalBoardsCost: 0,
      totalComponentsCost: 0,
      totalJobsCost: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      walls: [
        {
          id: 1,
          wallType: 'ISLAND',
          widthMm: 2400,
          heightMm: 900,
          islandDepthMm: 900,
          wallCost: 0,
          cabinetCount: 0,
          usedWidthMm: 0,
          remainingWidthMm: 2400,
          cabinets: [],
          countertop: {
            enabled: false,
            totalLengthMm: 2100,
            depthMm: 620,
            manualLengthMm: 2100,
            frontOverhangMm: 35,
            backOverhangMm: 10,
            leftOverhangMm: 12,
            rightOverhangMm: 18,
            thicknessMm: 38,
            materialType: 'LAMINATE',
            jointType: 'MITER_JOINT',
            frontEdgeType: 'POSTFORMED',
            segments: [],
            segmentCount: 0,
            wasSplit: false,
            components: [],
            totalMaterialCost: 0,
            totalCuttingCost: 0,
            totalEdgingCost: 0,
            totalComponentsCost: 0,
            totalCost: 0
          }
        }
      ]
    } as KitchenProjectDetailResponse);

    expect(result.walls[0].countertopConfig).toEqual(jasmine.objectContaining({
      enabled: false,
      materialType: 'LAMINATE',
      thicknessMm: 38,
      manualLengthMm: 2100,
      manualDepthMm: 620,
      frontOverhangMm: 35,
      backOverhangMm: 10,
      jointType: 'MITER_JOINT',
      edgeType: 'POSTFORMED'
    }));
  });

  it('should leave countertopConfig undefined when backend did not send countertop info', () => {
    const result = mapper.mapProject({
      id: 56,
      name: 'Legacy wall without countertop field',
      status: 'DRAFT',
      version: 1,
      totalCost: 0,
      totalBoardsCost: 0,
      totalComponentsCost: 0,
      totalJobsCost: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      walls: [
        {
          id: 1,
          wallType: 'MAIN',
          widthMm: 3000,
          heightMm: 2600,
          wallCost: 0,
          cabinetCount: 0,
          usedWidthMm: 0,
          remainingWidthMm: 3000,
          cabinets: []
        } as any
      ]
    } as KitchenProjectDetailResponse);

    expect(result.walls[0].countertopConfig).toBeUndefined();
  });

  it('should preserve {enabled: false} plinth with real height/feet on load (panel off, feet on)', () => {
    // Bug-fix 2026-06-08: panel cokołu wyłączony, ale nóżki obecne — backend zwraca enabled=false
    // z realną wysokością (calculateFeetOnlyResponse). Reload MUSI zachować enabled=false + wymiary,
    // inaczej consumenci (plinthConfig?.enabled !== false) potraktują cokół jak włączony.
    const result = mapper.mapProject({
      id: 57,
      name: 'Plinth panel disabled, feet kept',
      status: 'DRAFT',
      version: 1,
      totalCost: 0,
      totalBoardsCost: 0,
      totalComponentsCost: 0,
      totalJobsCost: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      walls: [
        {
          id: 1,
          wallType: 'MAIN',
          widthMm: 3000,
          heightMm: 2600,
          wallCost: 0,
          cabinetCount: 0,
          usedWidthMm: 0,
          remainingWidthMm: 3000,
          cabinets: [],
          plinth: {
            enabled: false,
            feetType: 'FEET_150',
            feetHeightMm: 150,
            plinthHeightMm: 150,
            totalLengthMm: 0,
            materialType: 'PVC',
            setbackMm: 40,
            segments: [],
            segmentCount: 0,
            wasSplit: false,
            components: [],
            totalFeetCount: 4,
            totalMountingClipCount: 0,
            totalMaterialCost: 0,
            totalCuttingCost: 0,
            totalComponentsCost: 0,
            totalCost: 0
          }
        } as any
      ]
    } as KitchenProjectDetailResponse);

    expect(result.walls[0].plinthConfig).toEqual(jasmine.objectContaining({
      enabled: false,
      heightMm: 150,
      feetType: 'FEET_150',
      materialType: 'PVC',
      setbackMm: 40
    }));
  });

  it('should leave plinthConfig undefined when backend did not send plinth info', () => {
    const result = mapper.mapProject({
      id: 58,
      name: 'Legacy wall without plinth field',
      status: 'DRAFT',
      version: 1,
      totalCost: 0,
      totalBoardsCost: 0,
      totalComponentsCost: 0,
      totalJobsCost: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      walls: [
        {
          id: 1,
          wallType: 'MAIN',
          widthMm: 3000,
          heightMm: 2600,
          wallCost: 0,
          cabinetCount: 0,
          usedWidthMm: 0,
          remainingWidthMm: 3000,
          cabinets: []
        } as any
      ]
    } as KitchenProjectDetailResponse);

    expect(result.walls[0].plinthConfig).toBeUndefined();
  });

  it('should create a default main wall when project has no walls', () => {
    const result = mapper.mapProject({
      id: 99,
      name: 'Empty',
      status: 'DRAFT',
      version: 1,
      totalCost: 0,
      totalBoardsCost: 0,
      totalComponentsCost: 0,
      totalJobsCost: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      walls: []
    } as KitchenProjectDetailResponse);

    expect(result).toEqual(jasmine.objectContaining({
      wallIdCounter: 1,
      cabinetIdCounter: 0
    }));
    expect(result.walls).toEqual([
      jasmine.objectContaining({
        id: 'wall-1',
        type: 'MAIN',
        widthMm: 3600,
        heightMm: 2600,
        cabinets: []
      })
    ]);
  });
});
