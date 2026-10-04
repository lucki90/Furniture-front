import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { ToastService } from '../../core/error/toast.service';
import { DIALOG_WIDTH } from '../../shared/constants/dialog.constants';
import {
  CabinetPresetNameDialogComponent,
  CabinetPresetNameDialogData
} from '../cabinet-presets/cabinet-preset-name-dialog.component';
import { CABINET_TYPE_PICKER_LABELS } from '../cabinet-form/types/cabinet-type-labels';
import { CabinetCalculatedEvent, KitchenCabinet } from '../model/kitchen-state.model';
import { CabinetPresetService } from './cabinet-preset.service';
import { KitchenCabinetStateFactory } from './kitchen-cabinet-state.factory';
import { KitchenStateService } from './kitchen-state.service';
import { ProjectRequestBuilderService } from './project-request-builder.service';

/** „Zapisz jako preset” z listy szafek i z formularza: nazwa w oknie, zapis konfiguracji szafki bez pozycji. */
@Injectable({ providedIn: 'root' })
export class KitchenCabinetPresetsFacade {
  private readonly dialog = inject(MatDialog);
  private readonly presetService = inject(CabinetPresetService);
  private readonly stateService = inject(KitchenStateService);
  private readonly cabinetFactory = inject(KitchenCabinetStateFactory);
  private readonly requestBuilder = inject(ProjectRequestBuilderService);
  private readonly toast = inject(ToastService);
  private readonly errorHandler = inject(ApiErrorHandler);

  /** Szafka z projektu. */
  saveCabinet(cabinetId: string): void {
    const cabinet = this.stateService.getCabinetById(cabinetId);
    if (cabinet) {
      this.askNameAndSave(cabinet);
    }
  }

  /** Bieżąca konfiguracja formularza po udanej kalkulacji. */
  saveCalculated(event: CabinetCalculatedEvent): void {
    this.askNameAndSave(this.cabinetFactory.fromFormData(event.formData, 'preset', event.result));
  }

  private askNameAndSave(cabinet: KitchenCabinet): void {
    const data: CabinetPresetNameDialogData = {
      title: 'Zapisz jako preset',
      name: defaultCabinetPresetName(cabinet),
      confirmLabel: 'Zapisz preset'
    };
    this.dialog.open(CabinetPresetNameDialogComponent, { width: DIALOG_WIDTH.STANDARD, data })
      .afterClosed()
      .subscribe((name: string | undefined) => {
        if (!name) {
          return;
        }
        const configuration = this.requestBuilder.buildCabinetConfiguration(cabinet,
          this.stateService.materialDefaults());
        this.presetService.create(name, configuration).subscribe({
          next: () => this.toast.success(`Zapisano preset „${name}”`),
          error: err => this.errorHandler.handle(err)
        });
      });
  }
}

/** Nazwa szafki albo typ z szerokością, np. „Dolna - szuflady 600”. */
export function defaultCabinetPresetName(cabinet: KitchenCabinet): string {
  const name = cabinet.name?.trim();
  return name || `${CABINET_TYPE_PICKER_LABELS[cabinet.type] ?? cabinet.type} ${cabinet.width}`;
}
