import { Injectable, inject } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { ToastService } from '../../core/error/toast.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { KitchenStateService } from './kitchen-state.service';

@Injectable({ providedIn: 'root' })
export class KitchenWorkspaceActionsFacade {
  private stateService = inject(KitchenStateService);
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);

  confirmAndRemoveWall(wall: WallWithCabinets, wallLabel: string): Observable<boolean> {
    if (wall.cabinets.length === 0) {
      this.stateService.removeWall(wall.id);
      this.toast.success('Ściana została usunięta');
      return of(true);
    }

    return this.confirmDialog.confirm({
      message: `Ściana "${wallLabel}" zawiera ${wall.cabinets.length} szafek. Czy na pewno chcesz ją usunąć?`,
      confirmText: 'Usuń'
    }).pipe(
      map(confirmed => {
        if (confirmed) {
          this.stateService.removeWall(wall.id);
          this.toast.success('Ściana została usunięta');
          return true;
        }

        return false;
      })
    );
  }

  confirmAndClearAll(): Observable<boolean> {
    return this.confirmDialog.confirm({
      message: 'Czy na pewno chcesz usunąć wszystkie ściany i szafki?',
      confirmText: 'Usuń wszystko'
    }).pipe(
      map(confirmed => {
        if (confirmed) {
          this.stateService.clearAll();
          return true;
        }

        return false;
      })
    );
  }

  confirmAndClearSelectedWallCabinets(selectedWallLabel: string): Observable<boolean> {
    return this.confirmDialog.confirm({
      message: `Czy na pewno chcesz usunąć wszystkie szafki ze ściany "${selectedWallLabel}"?`,
      confirmText: 'Usuń szafki'
    }).pipe(
      map(confirmed => {
        if (confirmed) {
          this.stateService.clearSelectedWallCabinets();
          return true;
        }

        return false;
      })
    );
  }
}
