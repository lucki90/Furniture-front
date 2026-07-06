import { TestBed } from '@angular/core/testing';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import { KitchenHistoryService } from './kitchen-history.service';
import { KitchenCabinetStateFactory } from './kitchen-cabinet-state.factory';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import { ProjectMetadataService } from './project-metadata.service';
import { ProjectSettingsService } from './project-settings.service';
import { CabinetFormData } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { boardFixture as board } from '../technical-drawing/testing/board.fixture';

describe('KitchenWorkspaceStore', () => {
  let store: KitchenWorkspaceStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [KitchenWorkspaceStore, KitchenCabinetStateFactory, ProjectRequestBuilderService]
    });

    store = TestBed.inject(KitchenWorkspaceStore);
  });

  it('should add, select and remove walls while preserving a valid selection', () => {
    const wallId = store.addWall('LEFT', 2500, 2600, 38, 100);

    expect(store.selectedWallId()).toBe(wallId);
    expect(store.getWallsSnapshot().map(wall => wall.id)).toEqual(['wall-1', wallId]);

    store.removeWall(wallId);

    expect(store.selectedWallId()).toBe('wall-1');
    expect(store.getWallsSnapshot()).toHaveSize(1);
  });

  it('should add, update, clone and clear cabinets on the selected wall', () => {
    const formData = {
      kitchenCabinetType: KitchenCabinetType.BASE_WITH_DRAWERS,
      openingType: 'HANDLE',
      width: 800,
      height: 720,
      depth: 560,
      positionY: 0,
      shelfQuantity: 1,
      drawerQuantity: 3,
      drawerModel: 'ANTARO'
    } as CabinetFormData;
    const result = {
      boards: [board('SIDE_NAME', 720, 560, 18, 2)],
      components: [],
      jobs: [],
      summaryCosts: 1000,
      boardTotalCost: 400,
      componentTotalCost: 350,
      jobTotalCost: 250
    };

    store.addCabinetToSelectedWall(formData, result);
    const firstCabinetId = store.getWallsSnapshot()[0].cabinets[0].id;

    store.updateCabinet(firstCabinetId, { ...formData, drawerQuantity: 4 }, result);
    store.cloneCabinet(firstCabinetId);

    expect(store.getWallsSnapshot()[0].cabinets).toEqual([
      jasmine.objectContaining({
        id: firstCabinetId,
        drawerQuantity: 4,
        calculationResponse: jasmine.objectContaining({ boards: result.boards })
      }),
      jasmine.objectContaining({
        drawerQuantity: 4,
        calculationResponse: jasmine.objectContaining({ boards: result.boards })
      })
    ]);

    store.clearSelectedWallCabinets();

    expect(store.getWallsSnapshot()[0].cabinets).toEqual([]);
  });
});

describe('KitchenWorkspaceStore - historia zmian', () => {
  let store: KitchenWorkspaceStore;
  let historyService: KitchenHistoryService;
  let metadataService: ProjectMetadataService;
  let settingsService: ProjectSettingsService;

  const minCabinetResult = {
    boards: [], components: [], jobs: [],
    summaryCosts: 0, boardTotalCost: 0, componentTotalCost: 0, jobTotalCost: 0
  };
  const minFormData = {
    kitchenCabinetType: KitchenCabinetType.BASE_ONE_DOOR,
    openingType: 'HANDLE', width: 600, height: 720, depth: 560, positionY: 0, shelfQuantity: 1
  } as CabinetFormData;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [KitchenWorkspaceStore, KitchenCabinetStateFactory, ProjectRequestBuilderService]
    });
    store = TestBed.inject(KitchenWorkspaceStore);
    historyService = TestBed.inject(KitchenHistoryService);
    metadataService = TestBed.inject(ProjectMetadataService);
    settingsService = TestBed.inject(ProjectSettingsService);
  });

  it('addWall odkłada snapshot - canUndo staje sie true', () => {
    store.addWall('LEFT', 2500, 2600, 38, 100);
    expect(store.canUndo()).toBeTrue();
  });

  it('removeWall odkłada snapshot', () => {
    const id = store.addWall('LEFT', 2500, 2600, 38, 100);
    historyService.clear();
    store.removeWall(id);
    expect(store.canUndo()).toBeTrue();
  });

  it('addCabinetToSelectedWall odkłada snapshot', () => {
    store.addCabinetToSelectedWall(minFormData, minCabinetResult);
    expect(store.canUndo()).toBeTrue();
  });

  it('removeCabinet odkłada snapshot', () => {
    store.addCabinetToSelectedWall(minFormData, minCabinetResult);
    const id = store.getWallsSnapshot()[0].cabinets[0].id;
    historyService.clear();
    store.removeCabinet(id);
    expect(store.canUndo()).toBeTrue();
  });

  it('undo przywraca poprzedni stan (usunieta szafka wraca)', () => {
    store.addCabinetToSelectedWall(minFormData, minCabinetResult);
    const id = store.getWallsSnapshot()[0].cabinets[0].id;
    store.removeCabinet(id);

    expect(store.getWallsSnapshot()[0].cabinets).toHaveSize(0);
    expect(store.undo()).toBeTrue();
    expect(store.getWallsSnapshot()[0].cabinets).toHaveSize(1);
  });

  it('redo przywraca stan po undo', () => {
    store.addCabinetToSelectedWall(minFormData, minCabinetResult);
    expect(store.undo()).toBeTrue();
    expect(store.getWallsSnapshot()[0].cabinets).toHaveSize(0);

    expect(store.redo()).toBeTrue();
    expect(store.getWallsSnapshot()[0].cabinets).toHaveSize(1);
  });

  it('resetWorkspace czyści historię', () => {
    store.addWall('LEFT', 2500, 2600, 38, 100);
    expect(store.canUndo()).toBeTrue();

    store.resetWorkspace(38, 100);
    expect(store.canUndo()).toBeFalse();
  });

  it('applyLoadedProject czyści historię', () => {
    store.addWall('LEFT', 2500, 2600, 38, 100);
    expect(store.canUndo()).toBeTrue();

    store.applyLoadedProject([store.getWallsSnapshot()[0]], 1, 0);
    expect(store.canUndo()).toBeFalse();
  });

  it('undo przywraca także ustawienia projektu i wymiary pomieszczenia', () => {
    store.recordHistorySnapshot();
    metadataService.updateRoomDimensions(5000, 4200);

    store.recordHistorySnapshot();
    settingsService.updateProjectSettings({ upperFillerHeightMm: 180 });

    expect(metadataService.currentProjectRoomWidthMm()).toBe(5000);
    expect(metadataService.currentProjectRoomDepthMm()).toBe(4200);
    expect(settingsService.upperFillerHeightMm()).toBe(180);

    expect(store.undo()).toBeTrue();
    expect(metadataService.currentProjectRoomWidthMm()).toBe(5000);
    expect(metadataService.currentProjectRoomDepthMm()).toBe(4200);
    expect(settingsService.upperFillerHeightMm()).toBe(100);

    expect(store.undo()).toBeTrue();
    expect(metadataService.currentProjectRoomWidthMm()).toBeNull();
    expect(metadataService.currentProjectRoomDepthMm()).toBeNull();
  });
});
