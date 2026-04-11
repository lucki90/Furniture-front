import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';
import { DIALOG_WIDTH } from '../constants/dialog.constants';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  color?: 'primary' | 'warn';
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  constructor(private readonly dialog: MatDialog) {}

  confirm(options: ConfirmOptions): Observable<boolean> {
    const data: ConfirmDialogData = {
      title:       options.title       ?? 'Potwierdzenie',
      message:     options.message,
      confirmText: options.confirmText ?? 'Tak',
      cancelText:  options.cancelText  ?? 'Anuluj',
      color:       options.color       ?? 'warn'
    };

    return this.dialog.open(ConfirmDialogComponent, { width: DIALOG_WIDTH.SMALL, data })
      .afterClosed()
      .pipe(map(result => result === true));
  }
}
