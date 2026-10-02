import { TestBed } from '@angular/core/testing';
import { KitchenProjectLayoutService } from './kitchen-project-layout.service';
import { ProjectSettingsService } from './project-settings.service';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import { blindCorner, placed } from './corner-layout/corner-layout.test-fixtures';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

describe('KitchenProjectLayoutService — ustawienia narożnika', () => {
  let layoutService: KitchenProjectLayoutService;
  let settingsService: ProjectSettingsService;
  let workspaceStore: KitchenWorkspaceStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    layoutService = TestBed.inject(KitchenProjectLayoutService);
    settingsService = TestBed.inject(ProjectSettingsService);
    workspaceStore = TestBed.inject(KitchenWorkspaceStore);
  });

  it('wcięcie łyżwy pochodzi z ustawień użytkownika, a bez nich wynosi 30 mm', () => {
    expect(layoutService.cornerSettings().lyzwaRecessMm).toBe(30);

    settingsService.setCountertopJointDefaults({ countertopLyzwaRecessMm: 20 });
    expect(layoutService.cornerSettings().lyzwaRecessMm).toBe(20);

    settingsService.setCountertopJointDefaults({ countertopLyzwaRecessMm: null });
    expect(layoutService.cornerSettings().lyzwaRecessMm).toBe(30);
  });

  it('zwraca rzeczywisty zasięg najbliższej szafki z połączonej ściany', () => {
    const rightWallId = workspaceStore.addWall('RIGHT', 2400, 2600, 38, 100);
    workspaceStore.updateWall(rightWallId, {
      cabinets: [placed('right-base', KitchenCabinetType.BASE_ONE_DOOR, 0, 600, 720, 560, {
        materialRequest: { frontBoardThickness: 18 }
      }).cabinet]
    });

    expect(layoutService.blindCornerNeighborReachMm('wall-1', 528)).toBe(578);
  });

  it('nie dolicza frontu wpuszczanego do zasięgu sąsiada', () => {
    const rightWallId = workspaceStore.addWall('RIGHT', 2400, 2600, 38, 100);
    workspaceStore.updateWall(rightWallId, {
      cabinets: [placed('right-inset', KitchenCabinetType.BASE_ONE_DOOR, 0, 600, 720, 560, {
        frontMountingType: 'INSET',
        materialRequest: { frontBoardThickness: 18 }
      }).cabinet]
    });

    expect(layoutService.blindCornerNeighborReachMm('wall-1', 528)).toBe(560);
  });

  it('dla nowej szafki na ścianie z dwoma narożnikami wybiera sąsiada przy końcu END', () => {
    const leftWallId = workspaceStore.addWall('LEFT', 600, 2600, 38, 100);
    workspaceStore.updateWall(leftWallId, {
      cabinets: [placed('left-base', KitchenCabinetType.BASE_ONE_DOOR, 0, 600, 720, 450, {
        materialRequest: { frontBoardThickness: 18 }
      }).cabinet]
    });
    const rightWallId = workspaceStore.addWall('RIGHT', 600, 2600, 38, 100);
    workspaceStore.updateWall(rightWallId, {
      cabinets: [placed('right-base', KitchenCabinetType.BASE_ONE_DOOR, 0, 600, 720, 560, {
        materialRequest: { frontBoardThickness: 18 }
      }).cabinet]
    });

    expect(layoutService.blindCornerNeighborReachMm('wall-1', 528)).toBe(578);
  });

  it('podczas edycji wybiera sąsiada po stronie, przy której stoi szafka narożna', () => {
    workspaceStore.updateWall('wall-1', {
      cabinets: [
        blindCorner('blind-start', 0, 1084, 500).cabinet,
        blindCorner('blind-end', 0, 1084, 500).cabinet
      ]
    });
    const leftWallId = workspaceStore.addWall('LEFT', 600, 2600, 38, 100);
    workspaceStore.updateWall(leftWallId, {
      cabinets: [placed('left-base', KitchenCabinetType.BASE_ONE_DOOR, 0, 600, 720, 450, {
        materialRequest: { frontBoardThickness: 18 }
      }).cabinet]
    });
    const rightWallId = workspaceStore.addWall('RIGHT', 600, 2600, 38, 100);
    workspaceStore.updateWall(rightWallId, {
      cabinets: [placed('right-base', KitchenCabinetType.BASE_ONE_DOOR, 0, 600, 720, 560, {
        materialRequest: { frontBoardThickness: 18 }
      }).cabinet]
    });

    expect(layoutService.blindCornerNeighborReachMm('wall-1', 528, { cabinetId: 'blind-start' })).toBe(468);
  });

  it('zwraca null, gdy połączona ściana nie ma szafki w przekroju narożnika', () => {
    workspaceStore.addWall('RIGHT', 2400, 2600, 38, 100);

    expect(layoutService.blindCornerNeighborReachMm('wall-1', 528)).toBeNull();
  });
});
