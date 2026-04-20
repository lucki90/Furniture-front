import { TestBed } from '@angular/core/testing';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import { KitchenCabinetStateFactory } from './kitchen-cabinet-state.factory';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import { CabinetFormData } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

describe('KitchenWorkspaceStore', () => {
  let store: KitchenWorkspaceStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [KitchenWorkspaceStore, KitchenCabinetStateFactory, ProjectRequestBuilderService]
    });

    store = TestBed.inject(KitchenWorkspaceStore);
  });

  it('should add, select and remove walls while preserving a valid selection', () => {
    const wallId = store.addWall('LEFT', 2500, 2600, 38);

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
      boards: [],
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
      jasmine.objectContaining({ id: firstCabinetId, drawerQuantity: 4 }),
      jasmine.objectContaining({ drawerQuantity: 4 })
    ]);

    store.clearSelectedWallCabinets();

    expect(store.getWallsSnapshot()[0].cabinets).toEqual([]);
  });
});
