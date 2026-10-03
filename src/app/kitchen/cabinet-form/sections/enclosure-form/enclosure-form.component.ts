import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { getEnclosureTypeOptions, EnclosureType } from '../../model/enclosure.model';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { isUpperCabinetType } from '../../../model/kitchen-state.model';
import { KitchenStateService } from '../../../service/kitchen-state.service';
import { FormFieldComponent } from '../../../../shared/form-field/form-field.component';
import { SectionHeaderComponent } from '../../shared/section-header.component';

type EnclosureOption = { value: EnclosureType; label: string };

/** Stałe opcje dla szafek dolnych i słupków — ta sama referencja przy każdym sprawdzeniu widoku. */
const BASE_ENCLOSURE_OPTIONS: EnclosureOption[] = getEnclosureTypeOptions(false);
/** Stałe opcje dla szafek wiszących — inne etykiety, te same kody wysyłane do API. */
const UPPER_ENCLOSURE_OPTIONS: EnclosureOption[] = getEnclosureTypeOptions(true);

/**
 * Sekcja konfiguracji obudowy bocznej szafki.
 * Zarządza typem obudowy lewej i prawej, podporą blendy i głębokością zabudowy.
 * Odbiera współdzielony FormGroup i aktualny typ szafki od parenta.
 */
@Component({
  selector: 'app-enclosure-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent, SectionHeaderComponent],
  templateUrl: './enclosure-form.component.html',
  styleUrls: ['./enclosure-form.component.css']
})
export class EnclosureFormComponent {

  @Input() form!: FormGroup;

  /**
   * Aktualny typ szafki z parenta. Edycja kolejnej szafki odtwarza typ w formularzu bez zdarzeń
   * (emitEvent:false), więc valueChanges kontrolki typu nie wystarcza — zmiana inputu aktualizuje
   * etykiety i odświeża widok OnPush także w już zamontowanej sekcji.
   */
  @Input({ required: true })
  set cabinetType(type: KitchenCabinetType | null | undefined) {
    this.enclosureOptions = type && isUpperCabinetType(type) ? UPPER_ENCLOSURE_OPTIONS : BASE_ENCLOSURE_OPTIONS;
  }

  readonly stateService = inject(KitchenStateService);

  /** Opcje selecta obudowy — zależne od strefy szafki (dolna/górna). */
  enclosureOptions: EnclosureOption[] = BASE_ENCLOSURE_OPTIONS;

  /** Czy lewa obudowa to blenda równoległa (wymaga checkboxa supportPlate i pola szerokości). */
  get isLeftParallelFiller(): boolean {
    return this.form.get('leftEnclosureType')?.value === 'PARALLEL_FILLER_STRIP';
  }

  /** Czy prawa obudowa to blenda równoległa. */
  get isRightParallelFiller(): boolean {
    return this.form.get('rightEnclosureType')?.value === 'PARALLEL_FILLER_STRIP';
  }

  protected trackByValue = (_: number, item: { value: string }) => item.value;
}
