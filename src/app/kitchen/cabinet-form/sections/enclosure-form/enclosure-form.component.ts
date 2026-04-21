import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { getEnclosureTypeOptions, EnclosureType } from '../../model/enclosure.model';
import { isUpperCabinetType } from '../../../model/kitchen-state.model';
import { KitchenStateService } from '../../../service/kitchen-state.service';
import { FormFieldComponent } from '../../../../shared/form-field/form-field.component';
import { SectionHeaderComponent } from '../../shared/section-header.component';

/**
 * Sekcja konfiguracji obudowy bocznej szafki.
 * Zarządza typem obudowy lewej i prawej, podporą blendy i głębokością zabudowy.
 * Odbiera współdzielony FormGroup od parenta.
 */
@Component({
  selector: 'app-enclosure-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent, SectionHeaderComponent],
  templateUrl: './enclosure-form.component.html',
  styleUrls: ['./enclosure-form.component.css']
})
export class EnclosureFormComponent implements OnInit {

  @Input() form!: FormGroup;

  readonly stateService = inject(KitchenStateService);
  private destroyRef = inject(DestroyRef);

  /** Opcje selecta obudowy — zależne od strefy szafki (dolna/górna). */
  enclosureOptions: { value: EnclosureType; label: string }[] = [];

  ngOnInit(): void {
    // Inicjalizacja opcji na podstawie aktualnego typu szafki
    const type = this.form.get('kitchenCabinetType')?.value;
    this.enclosureOptions = getEnclosureTypeOptions(isUpperCabinetType(type));

    // Aktualizuj opcje przy zmianie typu szafki
    this.form.get('kitchenCabinetType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(t => {
        this.enclosureOptions = getEnclosureTypeOptions(isUpperCabinetType(t));
      });
  }

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
