import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { WallType, WALL_TYPES } from '../model/kitchen-project.model';

export interface AddWallDialogData {
  availableTypes: { value: WallType; label: string }[];
}

export interface AddWallDialogResult {
  type: WallType;
  widthMm: number;
  heightMm: number;
}

@Component({
  selector: 'app-add-wall-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './add-wall-dialog.component.html',
  styleUrl: './add-wall-dialog.component.css'
})
export class AddWallDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddWallDialogComponent>);
  private data = inject<AddWallDialogData>(MAT_DIALOG_DATA);

  form: FormGroup;
  availableTypes = signal<{ value: WallType; label: string }[]>([]);

  // Default dimensions per wall type
  private readonly defaultDimensions: Record<WallType, { width: number; height: number }> = {
    'MAIN': { width: 3600, height: 2600 },
    'LEFT': { width: 2000, height: 2600 },
    'RIGHT': { width: 2000, height: 2600 },
    'CORNER_LEFT': { width: 1200, height: 2600 },
    'CORNER_RIGHT': { width: 1200, height: 2600 },
    'ISLAND': { width: 2400, height: 900 }
  };

  constructor() {
    this.availableTypes.set(this.data?.availableTypes ?? WALL_TYPES);

    const defaultType = this.availableTypes()[0]?.value ?? 'LEFT';
    const defaults = this.defaultDimensions[defaultType];

    this.form = this.fb.group({
      type: [defaultType, Validators.required],
      widthMm: [defaults.width, [Validators.required, Validators.min(500), Validators.max(10000)]],
      heightMm: [defaults.height, [Validators.required, Validators.min(500), Validators.max(4000)]]
    });

    // Update dimensions when type changes
    this.form.get('type')?.valueChanges.subscribe((type: WallType) => {
      const dims = this.defaultDimensions[type];
      this.form.patchValue({
        widthMm: dims.width,
        heightMm: dims.height
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const result: AddWallDialogResult = {
      type: this.form.value.type,
      widthMm: this.form.value.widthMm,
      heightMm: this.form.value.heightMm
    };

    this.dialogRef.close(result);
  }
}
