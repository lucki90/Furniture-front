import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastService } from '../../core/error/toast.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { KitchenStateService } from './kitchen-state.service';
import { KitchenWorkspaceActionsFacade } from './kitchen-workspace-actions.facade';

describe('KitchenWorkspaceActionsFacade', () => {
  let facade: KitchenWorkspaceActionsFacade;
  let stateService: jasmine.SpyObj<KitchenStateService>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    stateService = jasmine.createSpyObj<KitchenStateService>('KitchenStateService', [
      'removeWall',
      'clearAll',
      'clearSelectedWallCabinets'
    ]);
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success']);

    TestBed.configureTestingModule({
      providers: [
        KitchenWorkspaceActionsFacade,
        { provide: KitchenStateService, useValue: stateService },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: ToastService, useValue: toast }
      ]
    });

    facade = TestBed.inject(KitchenWorkspaceActionsFacade);
  });

  it('should remove an empty wall without confirmation', (done) => {
    facade.confirmAndRemoveWall(createWall([]), 'Ściana główna').subscribe(result => {
      expect(confirmDialog.confirm).not.toHaveBeenCalled();
      expect(stateService.removeWall).toHaveBeenCalledWith('wall-1');
      expect(toast.success).toHaveBeenCalledWith('Ściana została usunięta');
      expect(result).toBeTrue();
      done();
    });
  });

  it('should confirm before removing a wall with cabinets', (done) => {
    confirmDialog.confirm.and.returnValue(of(true));

    facade.confirmAndRemoveWall(createWall([{ id: 'cab-1' }]), 'Ściana lewa').subscribe(result => {
      expect(confirmDialog.confirm).toHaveBeenCalled();
      expect(stateService.removeWall).toHaveBeenCalledWith('wall-1');
      expect(result).toBeTrue();
      done();
    });
  });

  it('should clear all after confirmation', (done) => {
    confirmDialog.confirm.and.returnValue(of(true));

    facade.confirmAndClearAll().subscribe(result => {
      expect(stateService.clearAll).toHaveBeenCalled();
      expect(result).toBeTrue();
      done();
    });
  });

  it('should clear selected wall cabinets after confirmation', (done) => {
    confirmDialog.confirm.and.returnValue(of(true));

    facade.confirmAndClearSelectedWallCabinets('Ściana prawa').subscribe(result => {
      expect(stateService.clearSelectedWallCabinets).toHaveBeenCalled();
      expect(result).toBeTrue();
      done();
    });
  });
});

function createWall(cabinets: any[]): WallWithCabinets {
  return {
    id: 'wall-1',
    type: 'MAIN',
    widthMm: 3600,
    heightMm: 2600,
    cabinets
  } as WallWithCabinets;
}
