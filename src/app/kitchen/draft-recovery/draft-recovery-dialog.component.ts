import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DraftRecoveryDialogData {
  /** `dd.MM.yyyy HH:mm` */
  savedAt: string;
  projectName: string | null;
  /** W międzyczasie zapisano nowszą wersję projektu niż ta, na której powstała kopia. */
  newerVersionSaved: boolean;
}

/** Wybór przy odzyskiwaniu; zamknięcie okna — kopia zostaje do następnego otwarcia. */
export type DraftRecoveryChoice = 'RESTORE' | 'DISCARD';

@Component({
  selector: 'app-draft-recovery-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Niezapisane zmiany</h2>
    <mat-dialog-content>
      <p class="draft-text">
        W tej przeglądarce są niezapisane zmiany{{ data.projectName ? ' projektu „' + data.projectName + '”' : '' }}
        z {{ data.savedAt }}. Przywrócić je?
      </p>
      @if (data.newerVersionSaved) {
        <p class="draft-text draft-warning">
          W międzyczasie zapisano nowszą wersję projektu. Po przywróceniu zapis zgłosi konflikt — możesz wtedy zapisać
          zmiany jako nowy projekt.
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button (click)="close('DISCARD')" class="draft-discard-btn" mat-button type="button">Odrzuć kopię</button>
      <button (click)="close('RESTORE')" class="draft-restore-btn" color="primary" mat-raised-button type="button">
        Przywróć zmiany
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .draft-text { margin: 0 0 8px; font-size: 15px; line-height: 1.5; }
    .draft-warning { color: var(--warning-color); font-size: 14px; }
  `]
})
export class DraftRecoveryDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<DraftRecoveryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DraftRecoveryDialogData
  ) {}

  close(choice: DraftRecoveryChoice): void {
    this.dialogRef.close(choice);
  }
}
