import { AbstractControl, FormArray, FormGroup, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";
import { CABINET_FORM_MESSAGES } from "../../cabinet-form-validation-messages";
import { KitchenCabinetConstraints } from "../../model/kitchen-cabinet-constants";
import { KitchenCabinetValidator } from "../../type-config/validator/kitchen-cabinet-validator";
import { tallSegmentIssues } from './tall-segment-rules';
import { SegmentType } from '../../model/segment.model';

/**
 * Validator dla szafki typu słupek (TALL_CABINET).
 * Waliduje wymiary oraz segmenty (suma wysokości musi równać się wysokości netto).
 */
export class TallCabinetValidator implements KitchenCabinetValidator {

  private readonly constraints = KitchenCabinetConstraints.TALL_CABINET;

  validate(form: FormGroup): void {
    // Walidacja szerokości
    form.get('width')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.WIDTH_MIN),
      Validators.max(this.constraints.WIDTH_MAX)
    ]);

    // Walidacja wysokości
    form.get('height')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.HEIGHT_MIN),
      Validators.max(this.constraints.HEIGHT_MAX)
    ]);

    // Walidacja głębokości
    form.get('depth')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.DEPTH_MIN),
      Validators.max(this.constraints.DEPTH_MAX)
    ]);

    // Aktualizuj walidację pól
    form.get('width')?.updateValueAndValidity();
    form.get('height')?.updateValueAndValidity();
    form.get('depth')?.updateValueAndValidity();

    // Walidacja segmentów
    this.validateSegments(form);

    form.updateValueAndValidity();
  }

  /**
   * Waliduje segmenty szafki.
   * - Wymaga minimum 1 segmentu
   * - Suma wysokości segmentów musi równać się wysokości netto (±5mm tolerancji)
   * - Każdy segment musi mieć minimalną wysokość
   */
  private validateSegments(form: FormGroup): void {
    const segmentsControl = form.get('segments');

    if (!(segmentsControl instanceof FormArray)) {
      return;
    }

    // Walidacja każdego segmentu
    segmentsControl.controls.forEach((segmentGroup, index) => {
      if (segmentGroup instanceof FormGroup) {
        this.validateSegment(segmentGroup, index);
      }
    });
  }

  /**
   * Waliduje pojedynczy segment.
   */
  private validateSegment(segment: FormGroup, index: number): void {
    // Walidacja wysokości segmentu
    segment.get('height')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.SEGMENT_MIN_HEIGHT)
    ]);

    // Walidacja typu segmentu
    segment.get('segmentType')?.setValidators([
      Validators.required
    ]);

    // Liczba szuflad i półek zależy od typu segmentu, który użytkownik zmienia w formularzu segmentu — walidator
    // sprawdza bieżący typ przy każdej walidacji, zamiast zapamiętać typ z chwili ustawienia walidatorów.
    segment.get('drawerQuantity')?.setValidators(forSegmentTypes([SegmentType.DRAWER], [
      Validators.required,
      Validators.min(this.constraints.SEGMENT_DRAWER_MIN),
      Validators.max(this.constraints.SEGMENT_DRAWER_MAX)
    ]));
    segment.get('shelfQuantity')?.setValidators(forSegmentTypes([SegmentType.DOOR, SegmentType.OPEN_SHELF], [
      Validators.min(0),
      Validators.max(this.constraints.SEGMENT_SHELF_MAX)
    ]));

    // Aktualizuj walidację
    segment.get('height')?.updateValueAndValidity();
    segment.get('segmentType')?.updateValueAndValidity();
    segment.get('drawerQuantity')?.updateValueAndValidity();
    segment.get('shelfQuantity')?.updateValueAndValidity();
  }

  /**
   * Oblicza sumę wysokości wszystkich segmentów.
   */
  getSegmentsHeightSum(form: FormGroup): number {
    const segmentsControl = form.get('segments');

    if (!(segmentsControl instanceof FormArray)) {
      return 0;
    }

    return segmentsControl.controls.reduce((sum, segment) => {
      const height = segment.get('height')?.value ?? 0;
      return sum + height;
    }, 0);
  }

  /**
   * Wysokość netto szafki (= wysokość korpusu, użytkownik podaje bezpośrednio).
   */
  getNetHeight(form: FormGroup): number {
    return form.get('height')?.value ?? 0;
  }

  /**
   * Sprawdza czy suma wysokości segmentów jest poprawna.
   * Tolerancja ±5mm.
   */
  isSegmentsHeightValid(form: FormGroup): boolean {
    const segmentsSum = this.getSegmentsHeightSum(form);
    const netHeight = this.getNetHeight(form);
    const difference = Math.abs(segmentsSum - netHeight);
    return difference <= 5;
  }

  /**
   * Pierwsza uwaga reguł segmentów (światło wnęk AGD, szerokość drzwi, klapa) — blokuje zapis jak błąd sumy wysokości.
   */
  getSegmentRulesError(form: FormGroup): string | null {
    const segmentsControl = form.get('segments');
    if (!(segmentsControl instanceof FormArray)) {
      return null;
    }
    const [issue] = tallSegmentIssues(form.get('width')?.value ?? 0, segmentsControl.getRawValue());
    return issue?.message ?? null;
  }

  /**
   * Zwraca błąd walidacji sumy wysokości segmentów.
   */
  getSegmentsHeightError(form: FormGroup, msg: typeof CABINET_FORM_MESSAGES['pl']): string | null {
    const segmentsControl = form.get('segments');

    if (!(segmentsControl instanceof FormArray) || segmentsControl.length === 0) {
      return msg.segmentNoneAdded;
    }

    const segmentsSum = this.getSegmentsHeightSum(form);
    const netHeight = this.getNetHeight(form);
    const difference = segmentsSum - netHeight;

    if (Math.abs(difference) > 5) {
      if (difference > 0) {
        return msg.segmentsExceedHeight(segmentsSum, netHeight, difference);
      } else {
        return msg.segmentsBelowHeight(segmentsSum, netHeight, Math.abs(difference));
      }
    }

    return null;
  }
}

/**
 * Walidatory pola segmentu stosowane tylko dla wskazanych typów segmentu (typ czytany z grupy segmentu w chwili
 * walidacji).
 */
function forSegmentTypes(types: readonly SegmentType[], validators: ValidatorFn[]): ValidatorFn {
  const composed = Validators.compose(validators);
  return (control: AbstractControl): ValidationErrors | null => {
    const segmentType = control.parent?.get('segmentType')?.value;
    return composed && types.includes(segmentType) ? composed(control) : null;
  };
}
