import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { ToastService } from '../../core/error/toast.service';
import { DIALOG_WIDTH } from '../../shared/constants/dialog.constants';
import {
  ProjectVersionConflictChoice,
  ProjectVersionConflictDialogComponent
} from '../project-conflict/project-version-conflict-dialog.component';
import { KitchenDraftService } from './kitchen-draft.service';
import { KitchenProjectVersionsFacade } from './kitchen-project-versions.facade';
import { KitchenStateService } from './kitchen-state.service';

export const PROJECT_VERSION_CONFLICT_CODE = 'ex.project.version.conflict';

/**
 * Konflikt wersji przy zapisie projektu (backend 409 {@code ex.project.version.conflict}): zapis jako nowy projekt
 * albo wczytanie najnowszej wersji; zamknięcie okna zostawia zmiany w edytorze.
 */
@Injectable({ providedIn: 'root' })
export class KitchenProjectConflictService {
  private readonly dialog = inject(MatDialog);
  private readonly stateService = inject(KitchenStateService);
  private readonly versionsFacade = inject(KitchenProjectVersionsFacade);
  private readonly toast = inject(ToastService);
  private readonly errorHandler = inject(ApiErrorHandler);
  private readonly draftService = inject(KitchenDraftService);

  isVersionConflict(error: unknown): boolean {
    return error instanceof HttpErrorResponse
      && error.status === 409
      && error.error?.code === PROJECT_VERSION_CONFLICT_CODE;
  }

  /**
   * @param saveAsNew otwiera zapis jako nowy projekt — wywoływany po odłączeniu treści od zapisanego projektu
   */
  handle(saveAsNew: () => void): void {
    this.dialog.open(ProjectVersionConflictDialogComponent, { width: DIALOG_WIDTH.STANDARD })
      .afterClosed()
      .subscribe((choice: ProjectVersionConflictChoice | null | undefined) => {
        if (choice === 'SAVE_AS_NEW') {
          // Kopia przechodzi z zapisanego projektu na nowy (autozapis po odłączeniu).
          this.draftService.discardCurrent();
          this.stateService.detachFromSavedProject();
          saveAsNew();
        } else if (choice === 'LOAD_LATEST') {
          this.loadLatest();
        }
      });
  }

  private loadLatest(): void {
    const projectId = this.stateService.currentProjectId();
    if (projectId === null) {
      return;
    }
    this.draftService.discardCurrent();
    this.versionsFacade.returnToCurrent(projectId).subscribe({
      next: () => this.toast.info('Wczytano najnowszą wersję projektu'),
      error: err => this.errorHandler.handle(err)
    });
  }
}
