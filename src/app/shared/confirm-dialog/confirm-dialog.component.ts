import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  color: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p style="margin: 0; font-size: 15px; line-height: 1.5;">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">{{ data.cancelText }}</button>
      <button mat-raised-button [color]="data.color" (click)="confirm()">{{ data.confirmText }}</button>
    </mat-dialog-actions>
  `
})
export class ConfirmDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  confirm(): void { this.dialogRef.close(true); }
  cancel(): void  { this.dialogRef.close(false); }
}
