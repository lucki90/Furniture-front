import { Injectable, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { ToastService } from '../../core/error/toast.service';
import { DIALOG_WIDTH } from '../../shared/constants/dialog.constants';
import { SaveProjectDialogComponent, SaveProjectDialogData, SaveProjectDialogResult } from '../save-project-dialog/save-project-dialog.component';
import {
  UnsavedChangesDecision,
  UnsavedChangesDialogComponent
} from '../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { KitchenProjectWorkflowFacade } from './kitchen-project-workflow.facade';
import { KitchenStateService } from './kitchen-state.service';
import { KitchenProjectRequestsFacade } from './kitchen-project-requests.facade';

export interface KitchenProjectTransitionHooks {
  onProceed: () => void;
  onSavingChange?: (isSaving: boolean) => void;
  onSaveDialogCanceled?: () => void;
}

@Injectable({ providedIn: 'root' })
export class KitchenProjectTransitionGuardService {
  private readonly stateService = inject(KitchenStateService);
  private readonly requestsFacade = inject(KitchenProjectRequestsFacade);
  private readonly dialog = inject(MatDialog);
  private readonly workflowFacade = inject(KitchenProjectWorkflowFacade);
  private readonly toast = inject(ToastService);
  private readonly errorHandler = inject(ApiErrorHandler);
  private readonly transitionLocked = signal(false);

  /** Wspólny stan blokady dla wszystkich entry-pointów zmieniających aktualny projekt. */
  readonly isTransitioning = this.transitionLocked.asReadonly();

  confirmUnsavedAndProceed(targetLabel: string, hooks: KitchenProjectTransitionHooks): void {
    if (!this.acquireTransitionLock()) {
      return;
    }

    if (!this.stateService.hasUnsavedChanges()) {
      this.proceedAndRelease(hooks.onProceed);
      return;
    }

    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: DIALOG_WIDTH.STANDARD,
      data: { targetLabel }
    });

    dialogRef.afterClosed().subscribe((decision: UnsavedChangesDecision | undefined) => {
      if (decision === 'discard') {
        this.proceedAndRelease(hooks.onProceed);
        return;
      }

      if (decision === 'save') {
        this.openSaveProjectDialogAndPersistInternal({
          onSuccess: hooks.onProceed,
          onSavingChange: hooks.onSavingChange,
          onCancel: () => {
            hooks.onSaveDialogCanceled?.();
            this.toast.info('Anulowano zapis - projekt nie został przełączony.');
          }
        });
        return;
      }

      this.releaseTransitionLock();
    });
  }

  openSaveProjectDialogAndPersist(options?: {
    onSuccess?: () => void;
    onSavingChange?: (isSaving: boolean) => void;
    onCancel?: () => void;
  }): void {
    if (!this.acquireTransitionLock()) {
      return;
    }

    this.openSaveProjectDialogAndPersistInternal(options);
  }

  private openSaveProjectDialogAndPersistInternal(options?: {
    onSuccess?: () => void;
    onSavingChange?: (isSaving: boolean) => void;
    onCancel?: () => void;
  }): void {
    const isUpdate = this.stateService.currentProjectId() !== null;

    const dialogRef = this.dialog.open(SaveProjectDialogComponent, {
      data: {
        projectName: this.stateService.currentProjectName() || '',
        projectDescription: this.stateService.currentProjectDescription() || '',
        clientName: this.stateService.currentProjectClientName() || '',
        clientPhone: this.stateService.currentProjectClientPhone() || '',
        clientEmail: this.stateService.currentProjectClientEmail() || '',
        isUpdate
      } as SaveProjectDialogData,
      width: DIALOG_WIDTH.STANDARD
    });

    dialogRef.afterClosed().subscribe((result: SaveProjectDialogResult | undefined) => {
      if (!result) {
        this.releaseTransitionLock();
        options?.onCancel?.();
        return;
      }

      options?.onSavingChange?.(true);
      let savingFinished = false;
      const finishSaving = (): void => {
        if (savingFinished) {
          return;
        }
        savingFinished = true;
        options?.onSavingChange?.(false);
        this.releaseTransitionLock();
      };

      this.workflowFacade.saveProject(this.stateService.currentProjectId(), result, {
        buildCreateRequest: dialogResult => this.requestsFacade.buildMultiWallProjectRequest(
          dialogResult.name,
          dialogResult.description,
          dialogResult.clientName,
          dialogResult.clientPhone,
          dialogResult.clientEmail
        ),
        buildUpdateRequest: dialogResult => this.requestsFacade.buildUpdateProjectRequest(
          dialogResult.name,
          dialogResult.description,
          dialogResult.clientName,
          dialogResult.clientPhone,
          dialogResult.clientEmail
        )
      }).pipe(
        finalize(finishSaving)
      ).subscribe({
        next: ({ projectInfo, successMessage }) => {
          this.stateService.setProjectInfo(
            projectInfo.id,
            projectInfo.name,
            projectInfo.version,
            projectInfo.description,
            projectInfo.status,
            projectInfo.allowedTransitions,
            projectInfo.clientName,
            projectInfo.clientPhone,
            projectInfo.clientEmail
          );
          this.stateService.markProjectAsClean();
          this.toast.success(successMessage);
          finishSaving();
          options?.onSuccess?.();
        },
        error: err => {
          console.error('Error saving project:', err);
          finishSaving();
          this.errorHandler.handle(err);
        }
      });
    });
  }

  private acquireTransitionLock(): boolean {
    if (this.transitionLocked()) {
      return false;
    }

    this.transitionLocked.set(true);
    return true;
  }

  private releaseTransitionLock(): void {
    this.transitionLocked.set(false);
  }

  private proceedAndRelease(onProceed: () => void): void {
    this.releaseTransitionLock();
    onProceed();
  }
}
