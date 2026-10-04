import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { ToastService } from '../../core/error/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog.component';
import { DIALOG_WIDTH } from '../../shared/constants/dialog.constants';
import {
  CabinetPresetNameDialogComponent,
  CabinetPresetNameDialogData
} from '../../kitchen/cabinet-presets/cabinet-preset-name-dialog.component';
import { CabinetPresetOption } from '../../kitchen/model/cabinet-preset.model';
import { CabinetPresetService } from '../../kitchen/service/cabinet-preset.service';

/**
 * Presety szafek w ustawieniach: wbudowane (tylko podgląd) i własne — zmiana nazwy i usunięcie od razu w API,
 * niezależnie od zapisu pozostałych ustawień.
 */
@Component({
  selector: 'app-cabinet-presets-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './cabinet-presets-section.component.html',
  styleUrls: ['./cabinet-presets-section.component.css']
})
export class CabinetPresetsSectionComponent implements OnInit {
  readonly presetService = inject(CabinetPresetService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly errorHandler = inject(ApiErrorHandler);

  ngOnInit(): void {
    this.presetService.ensureLoaded();
  }

  rename(option: CabinetPresetOption): void {
    const data: CabinetPresetNameDialogData = {
      title: 'Zmień nazwę presetu',
      name: option.label,
      confirmLabel: 'Zmień nazwę'
    };
    this.dialog.open(CabinetPresetNameDialogComponent, { width: DIALOG_WIDTH.STANDARD, data })
      .afterClosed()
      .subscribe((name: string | undefined) => {
        if (!name || name === option.label) {
          return;
        }
        this.presetService.rename(option.preset.id, name).subscribe({
          next: () => this.toast.success('Zmieniono nazwę presetu'),
          error: err => this.errorHandler.handle(err)
        });
      });
  }

  remove(option: CabinetPresetOption): void {
    const data: ConfirmDialogData = {
      title: 'Usuń preset',
      message: `Usunąć preset „${option.label}”? Szafki już dodane do projektów zostają bez zmian.`,
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      color: 'warn'
    };
    this.dialog.open(ConfirmDialogComponent, { width: DIALOG_WIDTH.STANDARD, data })
      .afterClosed()
      .subscribe((confirmed: boolean | undefined) => {
        if (!confirmed) {
          return;
        }
        this.presetService.remove(option.preset.id).subscribe({
          next: () => this.toast.success('Usunięto preset'),
          error: err => this.errorHandler.handle(err)
        });
      });
  }
}
