import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

/** Wybór przy konflikcie wersji; zamknięcie okna — zostań w edycji bez zmian. */
export type ProjectVersionConflictChoice = 'SAVE_AS_NEW' | 'LOAD_LATEST';

/**
 * Konflikt wersji przy zapisie: projekt zapisano w międzyczasie w innym miejscu. Zmiany zostają w edytorze, dopóki
 * użytkownik nie wybierze wczytania najnowszej wersji.
 */
@Component({
  selector: 'app-project-version-conflict-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Projekt zapisano w innym miejscu</h2>
    <mat-dialog-content>
      <p class="conflict-text">
        Od otwarcia projektu ktoś — albo Ty w innej karcie lub na innym urządzeniu — zapisał jego nowszą wersję.
        Zapis nadpisałby tamte zmiany, więc nie został wykonany. Twoje zmiany są nadal w edytorze.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button (click)="close(null)" mat-button type="button">Anuluj</button>
      <button (click)="close('LOAD_LATEST')" class="conflict-load-btn" color="warn" mat-button type="button">
        Wczytaj najnowszą (odrzuć moje zmiany)
      </button>
      <button (click)="close('SAVE_AS_NEW')" class="conflict-save-new-btn" color="primary" mat-raised-button
              type="button">
        Zapisz jako nowy projekt
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.conflict-text { margin: 0; font-size: 15px; line-height: 1.5; }`]
})
export class ProjectVersionConflictDialogComponent {
  constructor(private readonly dialogRef: MatDialogRef<ProjectVersionConflictDialogComponent>) {}

  close(choice: ProjectVersionConflictChoice | null): void {
    this.dialogRef.close(choice);
  }
}
