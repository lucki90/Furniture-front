import { TestBed } from '@angular/core/testing';
import { KitchenWorkspaceStore } from '../service/kitchen-workspace.store';
import { TechnicalDrawingDocumentService } from './technical-drawing-document.service';

describe('TechnicalDrawingDocumentService', () => {
  it('builds document from the current workspace snapshot', () => {
    const workspaceStore = jasmine.createSpyObj<KitchenWorkspaceStore>('KitchenWorkspaceStore', ['getWallsSnapshot']);
    workspaceStore.getWallsSnapshot.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        TechnicalDrawingDocumentService,
        { provide: KitchenWorkspaceStore, useValue: workspaceStore }
      ]
    });

    const service = TestBed.inject(TechnicalDrawingDocumentService);

    expect(service.buildCurrentWorkspaceDocument()).toEqual(jasmine.objectContaining({
      schemaVersion: 1,
      drawings: [],
      skippedCabinets: [],
      totals: jasmine.objectContaining({ wallCount: 0, cabinetCount: 0 })
    }));
    expect(workspaceStore.getWallsSnapshot).toHaveBeenCalled();
  });
});
