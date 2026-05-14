import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export type UnsavedChangesDecision = 'save' | 'discard' | 'cancel';

export interface UnsavedChangesDialogData {
  targetLabel: string;
}

@Component({
  selector: 'app-unsaved-changes-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './unsaved-changes-dialog.component.html',
  styleUrls: ['./unsaved-changes-dialog.component.css']
})
export class UnsavedChangesDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<UnsavedChangesDialogComponent, UnsavedChangesDecision>,
    @Inject(MAT_DIALOG_DATA) public readonly data: UnsavedChangesDialogData
  ) {}

  onSave(): void {
    this.dialogRef.close('save');
  }

  onDiscard(): void {
    this.dialogRef.close('discard');
  }

  onCancel(): void {
    this.dialogRef.close('cancel');
  }
}
