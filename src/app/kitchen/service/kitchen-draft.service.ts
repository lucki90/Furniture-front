import { DestroyRef, Injectable, Injector, effect, inject, untracked } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ToastService } from '../../core/error/toast.service';
import { DIALOG_WIDTH } from '../../shared/constants/dialog.constants';
import {
  DraftRecoveryChoice,
  DraftRecoveryDialogComponent,
  DraftRecoveryDialogData
} from '../draft-recovery/draft-recovery-dialog.component';
import { hashSignature, KitchenDraft, KitchenDraftStorageService } from './kitchen-draft-storage.service';
import { KitchenStateService } from './kitchen-state.service';

/** Opóźnienie zapisu kopii po ostatniej zmianie. */
export const DRAFT_SAVE_DELAY_MS = 2000;

/**
 * Kopia lokalna niezapisanych zmian projektu: zapis z opóźnieniem po każdej zmianie, propozycja odzyskania po
 * otwarciu projektu, czyszczenie po zapisie i świadomym odrzuceniu zmian.
 */
@Injectable({ providedIn: 'root' })
export class KitchenDraftService {
  private readonly stateService = inject(KitchenStateService);
  private readonly storage = inject(KitchenDraftStorageService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  /** Autozapis kopii i propozycja odzyskania po otwarciu projektu — na czas życia strony kuchni. */
  start(destroyRef: DestroyRef): void {
    let previous: { projectId: number | null; dirty: boolean } | null = null;
    const autosave = effect(() => {
      const dirty = this.stateService.hasUnsavedChanges();
      const projectId = this.stateService.currentProjectId();
      this.stateService.walls();
      untracked(() => {
        if (!dirty && previous?.dirty && previous.projectId === projectId) {
          // Zmiany zapisane albo cofnięte do stanu zapisanego — kopia jest już nieaktualna.
          this.storage.clear(projectId);
        }
        previous = { projectId, dirty };
        this.scheduleSave(dirty);
      });
    }, { injector: this.injector });
    const recovery = effect(() => {
      this.stateService.openedProjectSession();
      untracked(() => this.offerRecovery(this.stateService.currentProjectId()));
    }, { injector: this.injector });
    destroyRef.onDestroy(() => {
      autosave.destroy();
      recovery.destroy();
      this.cancelPendingSave();
    });
  }

  /** Po zapisie projektu: kopia sprzed zapisu (także dla nowego projektu) jest już niepotrzebna. */
  clearAfterSave(previousProjectId: number | null, savedProjectId: number | null): void {
    this.cancelPendingSave();
    this.storage.clear(previousProjectId);
    if (savedProjectId !== previousProjectId) {
      this.storage.clear(savedProjectId);
    }
  }

  /** Użytkownik świadomie odrzucił niezapisane zmiany bieżącego projektu. */
  discardCurrent(): void {
    this.cancelPendingSave();
    this.storage.clear(this.stateService.currentProjectId());
  }

  offerRecovery(projectId: number | null): void {
    const draft = this.storage.load(projectId);
    if (!draft) {
      return;
    }
    if (draft.signatureHash === hashSignature(this.stateService.persistedSignature())) {
      // Kopia odpowiada treści w edytorze: przy zapisanym stanie jest zbędna, przy niezapisanym — aktualna.
      if (!this.stateService.hasUnsavedChanges()) {
        this.storage.clear(projectId);
      }
      return;
    }
    const data: DraftRecoveryDialogData = {
      savedAt: formatDateTime(draft.savedAt),
      projectName: draft.projectName,
      newerVersionSaved: projectId !== null && draft.baseVersion < this.stateService.currentProjectVersion()
    };
    this.dialog.open(DraftRecoveryDialogComponent, { width: DIALOG_WIDTH.STANDARD, data })
      .afterClosed()
      .subscribe((choice: DraftRecoveryChoice | undefined) => {
        if (choice === 'RESTORE' && this.stateService.currentProjectId() === projectId) {
          this.stateService.restoreDraft(draft.snapshot, draft.baseVersion);
          this.toast.success('Przywrócono niezapisane zmiany');
        } else if (choice === 'DISCARD') {
          this.storage.clear(projectId);
        }
      });
  }

  private scheduleSave(dirty: boolean): void {
    this.cancelPendingSave();
    if (!dirty) {
      return;
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.storage.save(this.buildDraft());
    }, DRAFT_SAVE_DELAY_MS);
  }

  private buildDraft(): KitchenDraft {
    return {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      projectId: this.stateService.currentProjectId(),
      projectName: this.stateService.currentProjectName(),
      baseVersion: this.stateService.currentProjectVersion(),
      signatureHash: hashSignature(this.stateService.persistedSignature()),
      snapshot: this.stateService.exportDraftSnapshot()
    };
  }

  private cancelPendingSave(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
