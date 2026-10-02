import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormFieldComponent } from '../form-field/form-field.component';
import {
  EffectiveGrainDirections,
  FRONT_GRAIN_OPTIONS,
  FrontGrainDirection,
  GrainDirections,
  PANEL_GRAIN_OPTIONS,
  PanelGrainDirection,
  SIDE_GRAIN_OPTIONS,
  SideGrainDirection,
  grainOptionLabel
} from '../model/grain-direction';

interface InheritLabels {
  front: string;
  side: string;
  panel: string;
}

/**
 * Trzy wybory kierunku słoja: fronty, boki, płyty poziome. W ustawieniach użytkownika pola mają zawsze wartość;
 * w projekcie (`inherited` podane) każde pole ma też opcję „Jak w ustawieniach” = `null`.
 */
@Component({
  selector: 'app-grain-direction-fields',
  standalone: true,
  imports: [CommonModule, FormsModule, FormFieldComponent],
  templateUrl: './grain-direction-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GrainDirectionFieldsComponent implements OnChanges {
  @Input({ required: true }) value!: GrainDirections;
  /** Ustawienia użytkownika, z których projekt dziedziczy kierunek; `null` — bez opcji dziedziczenia. */
  @Input() inherited: EffectiveGrainDirections | null = null;
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<GrainDirections>();

  readonly frontOptions = FRONT_GRAIN_OPTIONS;
  readonly sideOptions = SIDE_GRAIN_OPTIONS;
  readonly panelOptions = PANEL_GRAIN_OPTIONS;

  inheritLabels: InheritLabels | null = null;

  ngOnChanges(): void {
    this.inheritLabels = this.inherited
      ? {
        front: this.inheritLabel(grainOptionLabel(FRONT_GRAIN_OPTIONS, this.inherited.front)),
        side: this.inheritLabel(grainOptionLabel(SIDE_GRAIN_OPTIONS, this.inherited.side)),
        panel: this.inheritLabel(grainOptionLabel(PANEL_GRAIN_OPTIONS, this.inherited.panel))
      }
      : null;
  }

  onFrontChange(front: FrontGrainDirection | null): void {
    this.valueChange.emit({ ...this.value, front });
  }

  onSideChange(side: SideGrainDirection | null): void {
    this.valueChange.emit({ ...this.value, side });
  }

  onPanelChange(panel: PanelGrainDirection | null): void {
    this.valueChange.emit({ ...this.value, panel });
  }

  private inheritLabel(optionLabel: string): string {
    return `Jak w ustawieniach (${optionLabel.toLocaleLowerCase('pl')})`;
  }
}
