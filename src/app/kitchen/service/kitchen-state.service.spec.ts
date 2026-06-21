import { TestBed } from '@angular/core/testing';
import { KitchenStateService } from './kitchen-state.service';
import { KitchenProjectRequestsFacade } from './kitchen-project-requests.facade';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import { KitchenProjectStateMapper } from './kitchen-project-state.mapper';
import { KitchenCabinetStateFactory } from './kitchen-cabinet-state.factory';
import { KitchenGeometryService } from './kitchen-geometry.service';
import { ProjectMetadataService } from './project-metadata.service';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import { ProjectSettingsService } from './project-settings.service';
import { KitchenProjectDetailResponse } from '../model/kitchen-project.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CabinetFormData } from '../model/kitchen-state.model';

describe('KitchenStateService', () => {
  let service: KitchenStateService;
  let requestsFacade: KitchenProjectRequestsFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        KitchenStateService,
        KitchenWorkspaceStore,
        KitchenProjectStateMapper,
        KitchenCabinetStateFactory,
        KitchenGeometryService,
        ProjectMetadataService,
        ProjectRequestBuilderService,
        ProjectSettingsService
      ]
    });

    service = TestBed.inject(KitchenStateService);
    requestsFacade = TestBed.inject(KitchenProjectRequestsFacade);
  });

  it('should load project state through mapper and update facade signals', () => {
    service.loadProject({
      id: 12,
      name: 'Projekt testowy',
      description: 'Opis',
      clientName: 'Jan',
      clientPhone: '123456789',
      clientEmail: 'jan@example.com',
      status: 'DRAFT',
      version: 3,
      plinthHeightMm: 120,
      countertopThicknessMm: 20,
      upperFillerHeightMm: 80,
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
            thicknessMm: 20,
            materialType: 'LAMINATE',
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

    expect(service.currentProjectId()).toBe(12);
    expect(service.currentProjectName()).toBe('Projekt testowy');
    expect(service.selectedWallId()).toBe('wall-1');
    expect(service.walls()[0].cabinets[0]).toEqual(jasmine.objectContaining({
      id: 'sink-1',
      type: KitchenCabinetType.BASE_SINK
    }));
    expect(service.countertopThicknessMm()).toBe(20);
    expect(service.plinthHeightMm()).toBe(120);
    expect(service.upperFillerHeightMm()).toBe(80);
  });

  it('should manage cabinets through workspace store while keeping facade computations in sync', () => {
    const result = {
      boards: [],
      components: [],
      jobs: [],
      summaryCosts: 1000,
      boardTotalCost: 400,
      componentTotalCost: 350,
      jobTotalCost: 250
    };

    service.addCabinet({
      kitchenCabinetType: KitchenCabinetType.BASE_WITH_DRAWERS,
      openingType: 'HANDLE',
      width: 800,
      height: 720,
      depth: 560,
      positionY: 0,
      shelfQuantity: 1,
      drawerQuantity: 3,
      drawerModel: 'ANTARO'
    } as CabinetFormData, result);

    expect(service.totalCabinetCount()).toBe(1);
    expect(service.totalCost()).toBe(1000);
    expect(service.hasUnsavedProject()).toBeTrue();

    const cabinetId = service.cabinets()[0].id;
    service.cloneCabinet(cabinetId);
    expect(service.cabinets()).toHaveSize(2);

    service.removeCabinet(cabinetId);
    expect(service.cabinets()).toHaveSize(1);
  });

  it('should track persisted dirty state and reset it after clearAll', () => {
    expect(service.hasUnsavedChanges()).toBeFalse();

    service.addCabinet({
      kitchenCabinetType: KitchenCabinetType.BASE_WITH_DRAWERS,
      openingType: 'HANDLE',
      width: 800,
      height: 720,
      depth: 560,
      positionY: 0,
      shelfQuantity: 1,
      drawerQuantity: 3,
      drawerModel: 'ANTARO'
    } as CabinetFormData, {
      boards: [],
      components: [],
      jobs: [],
      summaryCosts: 1000,
      boardTotalCost: 400,
      componentTotalCost: 350,
      jobTotalCost: 250
    });

    expect(service.hasUnsavedChanges()).toBeTrue();

    service.clearAll();

    expect(service.hasUnsavedChanges()).toBeFalse();
  });

  it('should reset workspace and metadata on clearAll', () => {
    service.setProjectInfo(15, 'Do wyczyszczenia', 2, 'Opis', 'ACCEPTED');
    service.addWall('LEFT', 2500, 2600);

    service.clearAll();

    expect(service.currentProjectId()).toBeNull();
    expect(service.currentProjectStatus()).toBe('DRAFT');
    expect(service.walls()).toEqual([
      jasmine.objectContaining({
        id: 'wall-1',
        type: 'MAIN',
        cabinets: []
      })
    ]);
    expect(service.selectedWallId()).toBe('wall-1');
  });

  it('should include room dimensions in multi-wall calculate request', () => {
    service.updateRoomDimensions(5000, 4200);
    service.addWall('ISLAND', 2400, 900, 950, 'NONE');

    const request = requestsFacade.buildMultiWallCalculateRequest();

    expect(request.roomWidthMm).toBe(5000);
    expect(request.roomDepthMm).toBe(4200);
    expect(request.walls.find(wall => wall.wallType === 'ISLAND')).toEqual(jasmine.objectContaining({
      islandDepthMm: 950,
      adjacentToWall: 'NONE'
    }));
  });

  it('should undo and redo room dimensions plus standalone project settings', () => {
    expect(service.currentProjectRoomWidthMm()).toBeNull();
    expect(service.currentProjectRoomDepthMm()).toBeNull();
    expect(service.upperFillerHeightMm()).toBe(100);

    service.updateRoomDimensions(5000, 4200, { recordHistory: true });
    service.updateProjectSettings({ upperFillerHeightMm: 180 }, { recordHistory: true });

    expect(service.currentProjectRoomWidthMm()).toBe(5000);
    expect(service.currentProjectRoomDepthMm()).toBe(4200);
    expect(service.upperFillerHeightMm()).toBe(180);

    expect(service.undo()).toBeTrue();
    expect(service.upperFillerHeightMm()).toBe(100);
    expect(service.currentProjectRoomWidthMm()).toBe(5000);
    expect(service.currentProjectRoomDepthMm()).toBe(4200);

    expect(service.undo()).toBeTrue();
    expect(service.currentProjectRoomWidthMm()).toBeNull();
    expect(service.currentProjectRoomDepthMm()).toBeNull();

    expect(service.redo()).toBeTrue();
    expect(service.currentProjectRoomWidthMm()).toBe(5000);
    expect(service.currentProjectRoomDepthMm()).toBe(4200);

    expect(service.redo()).toBeTrue();
    expect(service.upperFillerHeightMm()).toBe(180);
  });

  it('should mark loaded project as clean and detect later persisted changes', () => {
    service.loadProject({
      id: 21,
      name: 'Załadowany projekt',
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
          widthMm: 3600,
          heightMm: 2600,
          wallCost: 0,
          cabinetCount: 0,
          usedWidthMm: 0,
          remainingWidthMm: 3600,
          cabinets: []
        }
      ]
    } as KitchenProjectDetailResponse);

    expect(service.hasUnsavedChanges()).toBeFalse();

    service.updateRoomDimensions(5000, 4200, { recordHistory: true });
    expect(service.hasUnsavedChanges()).toBeTrue();

    expect(service.undo()).toBeTrue();
    expect(service.hasUnsavedChanges()).toBeFalse();
  });

  it('should keep loaded-project clearAll as unsaved change until a new baseline is set', () => {
    service.loadProject({
      id: 33,
      name: 'Projekt zapisany',
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
          widthMm: 3600,
          heightMm: 2600,
          wallCost: 0,
          cabinetCount: 0,
          usedWidthMm: 0,
          remainingWidthMm: 3600,
          cabinets: []
        }
      ]
    } as KitchenProjectDetailResponse);

    expect(service.hasUnsavedChanges()).toBeFalse();

    service.clearAll();

    expect(service.hasUnsavedChanges()).toBeTrue();

    service.markProjectAsClean();

    expect(service.hasUnsavedChanges()).toBeFalse();
  });

  it('should mark startNewProject as clean baseline', () => {
    service.loadProject({
      id: 44,
      name: 'Projekt do wyczyszczenia',
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
          widthMm: 3600,
          heightMm: 2600,
          wallCost: 0,
          cabinetCount: 0,
          usedWidthMm: 0,
          remainingWidthMm: 3600,
          cabinets: []
        }
      ]
    } as KitchenProjectDetailResponse);

    service.startNewProject();

    expect(service.currentProjectId()).toBeNull();
    expect(service.hasUnsavedChanges()).toBeFalse();
  });
});
