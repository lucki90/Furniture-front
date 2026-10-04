import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface CabinetPresetNameDialogData {
  title: string;
  name: string;
  confirmLabel: string;
}

export const CABINET_PRESET_NAME_MAX_LENGTH = 100;

/** Nazwa presetu szafki — przy zapisie nowego i przy zmianie nazwy. Zamknięcie zwraca nazwę albo nic. */
@Component({
  selector: 'app-cabinet-preset-name-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <label class="form-label" for="cabinet-preset-name">Nazwa presetu</label>
      <input (keydown.enter)="confirm()" [formControl]="nameControl" [maxLength]="maxLength" class="form-control"
             id="cabinet-preset-name" type="text">
      <p class="preset-name-hint">Preset zapamiętuje typ, wymiary i konfigurację szafki — bez pozycji i materiałów.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Anuluj</button>
      <button (click)="confirm()" [disabled]="nameControl.invalid" class="preset-name-confirm-btn" color="primary"
              mat-raised-button type="button">
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-control { width: 100%; box-sizing: border-box; }
    .preset-name-hint { margin: 8px 0 0; font-size: 13px; color: var(--text-secondary); }
  `]
})
export class CabinetPresetNameDialogComponent {
  readonly maxLength = CABINET_PRESET_NAME_MAX_LENGTH;
  readonly nameControl: FormControl<string>;

  constructor(
    private readonly dialogRef: MatDialogRef<CabinetPresetNameDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CabinetPresetNameDialogData
  ) {
    this.nameControl = new FormControl(data.name, {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(CABINET_PRESET_NAME_MAX_LENGTH)]
    });
  }

  confirm(): void {
    if (this.nameControl.invalid) {
      return;
    }
    this.dialogRef.close(this.nameControl.value.trim());
  }
}
