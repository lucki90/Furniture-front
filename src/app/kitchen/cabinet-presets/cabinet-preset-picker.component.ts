import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { CabinetPresetService } from '../service/cabinet-preset.service';
import { KitchenCabinetStateFactory } from '../service/kitchen-cabinet-state.factory';

/**
 * Wybór presetu nad formularzem dodawania szafki. Preset trafia do formularza jak szafka do edycji (ta sama ścieżka
 * mapowania co przy wczytaniu projektu); po wyborze lista wraca do „Wybierz preset”.
 */
@Component({
  selector: 'app-cabinet-preset-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    @if (presetService.options().length > 0) {
      <div class="preset-picker">
        <label class="form-label" for="cabinet-preset-select">Z presetu</label>
        <select [formControl]="selection" class="form-control preset-picker__select" id="cabinet-preset-select">
          <option [ngValue]="null">Wybierz preset…</option>
          @if (presetService.builtInOptions().length > 0) {
            <optgroup label="Wbudowane">
              @for (option of presetService.builtInOptions(); track option.preset.id) {
                <option [ngValue]="option.preset.id">{{ option.label }} · {{ option.dimensions }}</option>
              }
            </optgroup>
          }
          @if (presetService.ownOptions().length > 0) {
            <optgroup label="Moje presety">
              @for (option of presetService.ownOptions(); track option.preset.id) {
                <option [ngValue]="option.preset.id">{{ option.label }} · {{ option.dimensions }}</option>
              }
            </optgroup>
          }
        </select>
      </div>
    }
  `,
  styles: [`
    .preset-picker { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed var(--border-color); }
  `]
})
export class CabinetPresetPickerComponent implements OnInit {
  readonly presetService = inject(CabinetPresetService);
  private readonly cabinetFactory = inject(KitchenCabinetStateFactory);
  private readonly destroyRef = inject(DestroyRef);

  readonly presetSelected = output<KitchenCabinet>();
  readonly selection = new FormControl<number | null>(null);

  ngOnInit(): void {
    this.presetService.ensureLoaded();
    this.selection.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(presetId => this.select(presetId));
  }

  private select(presetId: number | null): void {
    if (presetId === null) {
      return;
    }
    const preset = this.presetService.presets().find(candidate => candidate.id === presetId);
    if (preset) {
      this.presetSelected.emit(this.cabinetFactory.fromPlacementResponse(preset.cabinet, `preset-${preset.id}`));
    }
    this.selection.setValue(null, { emitEvent: false });
  }
}
