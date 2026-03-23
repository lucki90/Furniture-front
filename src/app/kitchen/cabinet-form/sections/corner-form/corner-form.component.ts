import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CornerMechanismType,
  CORNER_MECHANISM_LABELS,
  BASE_CORNER_MECHANISMS,
  UPPER_CORNER_MECHANISMS,
  BASE_CORNER_CONSTRAINTS,
  UPPER_CORNER_CONSTRAINTS,
  BLIND_CORNER_CONSTRAINTS,
  mechanismRequiresShelves,
  isBlindType
} from '../../model/corner-cabinet.model';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { KitchenCabinetTypeConfig } from '../../type-config/kitchen-cabinet-type-config';
import { FormFieldComponent } from '../../../../shared/form-field/form-field.component';
import { getFormError } from '../../../../shared/form-error.util';

/**
 * Sekcja konfiguracji szafki narożnej (CORNER_CABINET).
 * Zarządza typem mechanizmu (Type A / Type B), wymiarami i SVG podglądem.
 * Odbiera współdzielony FormGroup od parenta.
 */
@Component({
  selector: 'app-corner-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent],
  templateUrl: './corner-form.component.html',
  styleUrls: ['./corner-form.component.css']
})
export class CornerFormComponent implements OnInit {

  @Input() form!: FormGroup;

  /** Dostępne mechanizmy zależne od isUpperCorner i isBlindType. */
  availableCornerMechanisms: { value: CornerMechanismType; label: string }[] = [];
  /** Constraints zależne od typu narożnika (base/upper/blind). */
  cornerConstraints = BASE_CORNER_CONSTRAINTS;

  /** Widoczność pola wyboru montaż dolna/górna. */
  showIsUpperCorner = true;
  /** Widoczność szerokości B. */
  showCornerWidthB = true;
  /** Widoczność typu otwarcia. */
  showCornerOpeningType = true;
  /** Widoczność szerokości frontu uchylnego (Type B). */
  showCornerFrontUchylnyWidth = false;
  /** Widoczność pola liczby półek. */
  showCornerShelfQuantity = false;

  readonly cornerMechanismLabels = CORNER_MECHANISM_LABELS;

  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Inicjalizacja — odczytaj aktualny stan formularza
    this.initFromCurrentValues();

    // Reaguj na zmianę isUpperCorner (typ montażu)
    this.form.get('isUpperCorner')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isUpper => this.onCornerTypeChange(isUpper));

    // Reaguj na zmianę mechanizmu
    this.form.get('cornerMechanism')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(mechanism => this.onCornerMechanismChange(mechanism));
  }

  /** Aktualnie wybrany mechanizm narożnika. */
  get currentCornerMechanism(): CornerMechanismType {
    return this.form.get('cornerMechanism')?.value ?? CornerMechanismType.FIXED_SHELVES;
  }

  /** Etykieta aktualnego mechanizmu. */
  get currentCornerMechanismLabel(): string {
    return this.cornerMechanismLabels[this.currentCornerMechanism] ?? '';
  }

  /** Czy aktualny mechanizm to Type B (Blind/Rectangular). */
  get isCornerTypeB(): boolean {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    return mechanism ? isBlindType(mechanism) : false;
  }

  /**
   * Inicjalizuje stan komponentu na podstawie aktualnych wartości formularza.
   * Wywoływane w ngOnInit — po tym jak parent ustawił wartości formularza.
   */
  private initFromCurrentValues(): void {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    const isUpper = this.form.get('isUpperCorner')?.value ?? false;

    // Najpierw aktualizuj mechanizm (ustawia constraints, flagę typeB)
    this.onCornerMechanismChange(mechanism);

    // Jeśli nie typeB, aktualizuj też isUpperCorner
    if (mechanism && !isBlindType(mechanism)) {
      this.onCornerTypeChange(isUpper);
    }
  }

  /**
   * Reaguje na zmianę typu narożnika (dolna/górna).
   * Dla Type B (Blind) ignoruje zmianę isUpperCorner.
   */
  private onCornerTypeChange(isUpper: boolean): void {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    if (mechanism && isBlindType(mechanism)) {
      return; // Type B zawsze dolna
    }

    if (isUpper) {
      this.cornerConstraints = UPPER_CORNER_CONSTRAINTS;
      this.availableCornerMechanisms = UPPER_CORNER_MECHANISMS.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));

      // Jeśli aktualny mechanizm nie jest dozwolony dla górnej, zmień na FIXED_SHELVES
      const currentMechanism = this.form.get('cornerMechanism')?.value;
      if (!UPPER_CORNER_MECHANISMS.includes(currentMechanism)) {
        this.form.patchValue({ cornerMechanism: CornerMechanismType.FIXED_SHELVES });
      }

      // Ustaw domyślne wartości dla górnej
      this.form.patchValue({
        cornerWidthA: Math.max(UPPER_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthA')?.value || 700, UPPER_CORNER_CONSTRAINTS.widthMax)),
        cornerWidthB: Math.max(UPPER_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthB')?.value || 700, UPPER_CORNER_CONSTRAINTS.widthMax)),
        height: 720,
        depth: 320
      });
    } else {
      this.cornerConstraints = BASE_CORNER_CONSTRAINTS;
      this.availableCornerMechanisms = BASE_CORNER_MECHANISMS.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));

      this.form.patchValue({
        cornerWidthA: Math.max(BASE_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthA')?.value || 900, BASE_CORNER_CONSTRAINTS.widthMax)),
        cornerWidthB: Math.max(BASE_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthB')?.value || 900, BASE_CORNER_CONSTRAINTS.widthMax)),
        height: 720,
        depth: BASE_CORNER_CONSTRAINTS.depth
      });
    }

    // Aktualizuj widoczność pól (Type A only)
    this.showCornerWidthB = !isUpper;
    this.showCornerOpeningType = !isUpper;
    this.showCornerFrontUchylnyWidth = false;

    this.revalidate();
  }

  /**
   * Reaguje na zmianę mechanizmu narożnika.
   * Przełącza między Type A (L-shaped) a Type B (Blind/Rectangular).
   */
  private onCornerMechanismChange(mechanism: CornerMechanismType): void {
    const typeB = mechanism ? isBlindType(mechanism) : false;
    const isUpper = !typeB && (this.form.get('isUpperCorner')?.value ?? false);

    if (typeB) {
      this.cornerConstraints = BLIND_CORNER_CONSTRAINTS;
      this.availableCornerMechanisms = []; // nie zmienia się przy Type B
    } else if (isUpper) {
      this.cornerConstraints = UPPER_CORNER_CONSTRAINTS;
      this.availableCornerMechanisms = UPPER_CORNER_MECHANISMS.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));
    } else {
      this.cornerConstraints = BASE_CORNER_CONSTRAINTS;
      this.availableCornerMechanisms = BASE_CORNER_MECHANISMS.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));
    }

    // Widoczność pól specyficznych dla Type A / Type B
    this.showCornerWidthB = !typeB && !isUpper;
    this.showIsUpperCorner = !typeB;
    this.showCornerOpeningType = !typeB && !isUpper;
    this.showCornerFrontUchylnyWidth = typeB;
    this.showCornerShelfQuantity = mechanismRequiresShelves(mechanism);

    this.revalidate();
  }

  private revalidate(): void {
    const type = this.form.get('kitchenCabinetType')?.value as KitchenCabinetType;
    if (type === KitchenCabinetType.CORNER_CABINET) {
      const config = KitchenCabinetTypeConfig[type];
      if (config) config.validator.validate(this.form);
    }
  }

  getFieldError(controlName: string): string | null {
    return getFormError(this.form.get(controlName));
  }
}
