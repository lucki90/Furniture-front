import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
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

export interface KitchenProjectTransitionHooks {
  onProceed: () => void;
  onSavingChange?: (isSaving: boolean) => void;
  onSaveDialogCanceled?: () => void;
}

@Injectable({ providedIn: 'root' })
export class KitchenProjectTransitionGuardService {
  // TODO(CODEX): If more entry points can trigger project transitions in parallel,
  // promote this local save-state callback pattern to a shared transition lock/signal
  // so drawers, legacy project list and future overlays can all disable actions consistently.
  private readonly stateService = inject(KitchenStateService);
  private readonly dialog = inject(MatDialog);
  private readonly workflowFacade = inject(KitchenProjectWorkflowFacade);
  private readonly toast = inject(ToastService);
  private readonly errorHandler = inject(ApiErrorHandler);

  confirmUnsavedAndProceed(targetLabel: string, hooks: KitchenProjectTransitionHooks): void {
    if (!this.stateService.hasUnsavedChanges()) {
      hooks.onProceed();
      return;
    }

    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: DIALOG_WIDTH.STANDARD,
      data: { targetLabel }
    });

    dialogRef.afterClosed().subscribe((decision: UnsavedChangesDecision | undefined) => {
      if (decision === 'discard') {
        hooks.onProceed();
        return;
      }

      if (decision === 'save') {
        this.openSaveProjectDialogAndPersist({
          onSuccess: hooks.onProceed,
          onSavingChange: hooks.onSavingChange,
          onCancel: () => {
            hooks.onSaveDialogCanceled?.();
            this.toast.info('Anulowano zapis - projekt nie został przełączony.');
          }
        });
      }
    });
  }

  openSaveProjectDialogAndPersist(options?: {
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
        options?.onCancel?.();
        return;
      }

      options?.onSavingChange?.(true);

      this.workflowFacade.saveProject(this.stateService.currentProjectId(), result, {
        buildCreateRequest: dialogResult => this.stateService.buildMultiWallProjectRequest(
          dialogResult.name,
          dialogResult.description,
          dialogResult.clientName,
          dialogResult.clientPhone,
          dialogResult.clientEmail
        ),
        buildUpdateRequest: dialogResult => this.stateService.buildUpdateProjectRequest(
          dialogResult.name,
          dialogResult.description,
          dialogResult.clientName,
          dialogResult.clientPhone,
          dialogResult.clientEmail
        )
      }).subscribe({
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
          options?.onSavingChange?.(false);
          this.toast.success(successMessage);
          options?.onSuccess?.();
        },
        error: err => {
          console.error('Error saving project:', err);
          options?.onSavingChange?.(false);
          this.errorHandler.handle(err);
        }
      });
    });
  }
}
