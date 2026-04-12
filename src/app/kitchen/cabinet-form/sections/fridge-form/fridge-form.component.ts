import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';
import { DictionaryService } from '../../../service/dictionary.service';

/**
 * Sekcja konfiguracji szafki na lodówkę (BASE_FRIDGE i BASE_FRIDGE_FREESTANDING).
 * Wykrywa typ z formularza i renderuje odpowiednie pola.
 * Odbiera współdzielony FormGroup od parenta.
 */
@Component({
  selector: 'app-fridge-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fridge-form.component.html',
  styleUrls: ['./fridge-form.component.css']
})
export class FridgeFormComponent implements OnInit {

  @Input() form!: FormGroup;

  /** Czy widoczne jest pole wysokości frontu zamrażarki (aktywne dla TWO_DOORS). */
  showLowerFrontHeight = false;

  private destroyRef = inject(DestroyRef);

  constructor(readonly dictionaryService: DictionaryService) {}

  ngOnInit(): void {
    // Inicjalizacja ze stanu aktualnej wartości formularza
    const fridgeSectionType = this.form.get('fridgeSectionType')?.value ?? 'TWO_DOORS';
    this.syncFridgeSectionType(fridgeSectionType);

    // Reaguj na zmianę typu sekcji lodówki
    this.form.get('fridgeSectionType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => this.syncFridgeSectionType(type));
  }

  /** Czy to szafka lodówkowa w zabudowie (BASE_FRIDGE). */
  get isBuiltInFridge(): boolean {
    return this.form.get('kitchenCabinetType')?.value === 'BASE_FRIDGE';
  }

  /** Czy to lodówka wolnostojąca (BASE_FRIDGE_FREESTANDING). */
  get isFreestandingFridge(): boolean {
    return this.form.get('kitchenCabinetType')?.value === 'BASE_FRIDGE_FREESTANDING';
  }

  private syncFridgeSectionType(sectionType: string): void {
    const isTwoDoors = sectionType === 'TWO_DOORS';
    this.showLowerFrontHeight = isTwoDoors;
    const ctrl = this.form.get('lowerFrontHeightMm');
    const c = KitchenCabinetConstraints.BASE_FRIDGE;
    if (ctrl) {
      if (isTwoDoors) {
        ctrl.enable();
        if (!ctrl.value) ctrl.setValue(713);
        ctrl.setValidators([Validators.required, Validators.min(c.LOWER_FRONT_MIN), Validators.max(c.LOWER_FRONT_MAX)]);
      } else {
        ctrl.disable();
        ctrl.clearValidators();
        ctrl.setErrors(null);
      }
      ctrl.updateValueAndValidity({ emitEvent: false });
    }
  }

  protected trackByCode = (_: number, item: { code: string }) => item.code;
}
