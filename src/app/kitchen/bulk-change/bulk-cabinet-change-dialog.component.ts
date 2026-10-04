import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FrontMountingType } from '../cabinet-form/model/front-mounting.model';
import { OpeningType } from '../cabinet-form/model/kitchen-cabinet-constants';
import { BulkCabinetChange, BulkChangeScope } from '../model/bulk-cabinet-change.model';
import { MaterialPresetResponse } from '../service/material-preset.service';

export interface BulkCabinetChangeDialogData {
  wallLabel: string;
  wallCabinetCount: number;
  projectCabinetCount: number;
  openingTypes: { value: OpeningType; label: string }[];
  materialPresets: { preset: MaterialPresetResponse; label: string }[];
}

/** Wartość pola materiału: bez zmian, z projektu albo kod presetu materiałowego. */
type MaterialChoice = 'KEEP' | 'PROJECT' | string;

/** Masowa zmiana szafek ściany albo projektu: rodzaj otwierania, osadzenie frontu, materiał. */
@Component({
  selector: 'app-bulk-cabinet-change-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Zmień wiele szafek</h2>
    <mat-dialog-content [formGroup]="form" class="bulk-form">
      <fieldset class="bulk-scope">
        <legend class="form-label">Zakres</legend>
        <label class="bulk-radio">
          <input [value]="'WALL'" formControlName="scope" type="radio">
          Ściana „{{ data.wallLabel }}” ({{ data.wallCabinetCount }})
        </label>
        <label class="bulk-radio">
          <input [value]="'PROJECT'" formControlName="scope" type="radio">
          Cały projekt ({{ data.projectCabinetCount }})
        </label>
      </fieldset>

      <label class="form-label" for="bulk-opening">Rodzaj otwierania</label>
      <select class="form-control" formControlName="openingType" id="bulk-opening">
        <option [ngValue]="null">Bez zmian</option>
        @for (option of data.openingTypes; track option.value) {
          <option [ngValue]="option.value">{{ option.label }}</option>
        }
      </select>

      <label class="form-label" for="bulk-mounting">Osadzenie frontu</label>
      <select class="form-control" formControlName="frontMountingType" id="bulk-mounting">
        <option [ngValue]="null">Bez zmian</option>
        <option [ngValue]="'OVERLAY'">Nakładany</option>
        <option [ngValue]="'INSET'">Wpuszczany</option>
      </select>

      <label class="form-label" for="bulk-material">Materiał szafek</label>
      <select class="form-control" formControlName="material" id="bulk-material">
        <option [ngValue]="'KEEP'">Bez zmian</option>
        <option [ngValue]="'PROJECT'">Z ustawień projektu</option>
        @for (option of data.materialPresets; track option.preset.code) {
          <option [ngValue]="option.preset.code">{{ option.label }}</option>
        }
      </select>

      <p class="bulk-hint">
        Szafki, których zmiana nie dotyczy, zostaną pominięte. Każda zmieniona szafka jest przeliczana; całą zmianę
        cofniesz jednym krokiem.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Anuluj</button>
      <button (click)="apply()" [disabled]="!hasChange()" class="bulk-apply-btn" color="primary" mat-raised-button
              type="button">
        Zastosuj
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .bulk-form { display: flex; flex-direction: column; gap: 6px; min-width: 320px; }
    .bulk-scope { border: 0; margin: 0 0 6px; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .bulk-radio { display: flex; align-items: center; gap: 6px; font-size: 14px; }
    .bulk-hint { margin: 8px 0 0; font-size: 13px; color: var(--text-secondary); }
  `]
})
export class BulkCabinetChangeDialogComponent {
  readonly form: FormGroup<{
    scope: FormControl<BulkChangeScope>;
    openingType: FormControl<OpeningType | null>;
    frontMountingType: FormControl<FrontMountingType | null>;
    material: FormControl<MaterialChoice>;
  }>;

  constructor(
    private readonly dialogRef: MatDialogRef<BulkCabinetChangeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BulkCabinetChangeDialogData
  ) {
    this.form = new FormGroup({
      scope: new FormControl<BulkChangeScope>(data.wallCabinetCount > 0 ? 'WALL' : 'PROJECT', { nonNullable: true }),
      openingType: new FormControl<OpeningType | null>(null),
      frontMountingType: new FormControl<FrontMountingType | null>(null),
      material: new FormControl<MaterialChoice>('KEEP', { nonNullable: true })
    });
  }

  hasChange(): boolean {
    const value = this.form.getRawValue();
    return value.openingType !== null || value.frontMountingType !== null || value.material !== 'KEEP';
  }

  apply(): void {
    if (!this.hasChange()) {
      return;
    }
    const value = this.form.getRawValue();
    const preset = this.data.materialPresets.find(option => option.preset.code === value.material)?.preset;
    const change: BulkCabinetChange = {
      scope: value.scope,
      openingType: value.openingType,
      frontMountingType: value.frontMountingType,
      material: value.material === 'KEEP' || value.material === 'PROJECT' || !preset
        ? { mode: value.material === 'PROJECT' ? 'PROJECT' : 'KEEP' }
        : { mode: 'PRESET', preset }
    };
    this.dialogRef.close(change);
  }
}
