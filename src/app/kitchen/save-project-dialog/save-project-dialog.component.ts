import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface SaveProjectDialogData {
  projectName?: string;
  projectDescription?: string;
  isUpdate: boolean;
}

export interface SaveProjectDialogResult {
  name: string;
  description?: string;
}

@Component({
  selector: 'app-save-project-dialog',
  templateUrl: './save-project-dialog.component.html',
  styleUrls: ['./save-project-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule]
})
export class SaveProjectDialogComponent {

  projectName: string;
  projectDescription: string;

  constructor(
    public dialogRef: MatDialogRef<SaveProjectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SaveProjectDialogData
  ) {
    this.projectName = data.projectName || '';
    this.projectDescription = data.projectDescription || '';
  }

  get dialogTitle(): string {
    return this.data.isUpdate ? 'Zapisz zmiany' : 'Zapisz projekt';
  }

  get submitLabel(): string {
    return this.data.isUpdate ? 'Zapisz zmiany' : 'Zapisz projekt';
  }

  get isValid(): boolean {
    return this.projectName.trim().length > 0;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.isValid) return;

    const result: SaveProjectDialogResult = {
      name: this.projectName.trim(),
      description: this.projectDescription.trim() || undefined
    };

    this.dialogRef.close(result);
  }
}
