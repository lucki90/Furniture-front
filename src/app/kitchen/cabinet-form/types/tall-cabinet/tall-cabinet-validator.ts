import { FormArray, FormGroup, Validators } from "@angular/forms";
import { KitchenCabinetValidator } from "../../type-config/validator/kitchen-cabinet-validator";
import { KitchenCabinetConstraints } from "../../model/kitchen-cabinet-constants";
import { widthStepValidator } from "../../validators/width-step.validator";

/**
 * Validator dla szafki typu słupek (TALL_CABINET).
 * Waliduje wymiary oraz segmenty (suma wysokości musi równać się wysokości netto).
 */
export class TallCabinetValidator implements KitchenCabinetValidator {

  private readonly constraints = KitchenCabinetConstraints.TALL_CABINET;
  private readonly PLINTH_HEIGHT = 100; // wysokość cokołu w mm

  validate(form: FormGroup): void {
    // Walidacja szerokości
    form.get('width')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.WIDTH_MIN),
      Validators.max(this.constraints.WIDTH_MAX),
      widthStepValidator(this.constraints.WIDTH_MIN, this.constraints.WIDTH_STEP)
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

    // Walidacja liczby szuflad dla segmentu DRAWER
    const segmentType = segment.get('segmentType')?.value;
    if (segmentType === 'DRAWER') {
      segment.get('drawerQuantity')?.setValidators([
        Validators.required,
        Validators.min(this.constraints.SEGMENT_DRAWER_MIN),
        Validators.max(this.constraints.SEGMENT_DRAWER_MAX)
      ]);
    } else {
      segment.get('drawerQuantity')?.clearValidators();
    }

    // Walidacja liczby półek dla segmentu DOOR/OPEN_SHELF
    if (segmentType === 'DOOR' || segmentType === 'OPEN_SHELF') {
      segment.get('shelfQuantity')?.setValidators([
        Validators.min(0),
        Validators.max(this.constraints.SEGMENT_SHELF_MAX)
      ]);
    } else {
      segment.get('shelfQuantity')?.clearValidators();
    }

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
   * Oblicza wysokość netto szafki (bez cokołu).
   */
  getNetHeight(form: FormGroup): number {
    const height = form.get('height')?.value ?? 0;
    return height - this.PLINTH_HEIGHT;
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
   * Zwraca błąd walidacji sumy wysokości segmentów.
   */
  getSegmentsHeightError(form: FormGroup): string | null {
    const segmentsControl = form.get('segments');

    if (!(segmentsControl instanceof FormArray) || segmentsControl.length === 0) {
      return 'Dodaj co najmniej jeden segment.';
    }

    const segmentsSum = this.getSegmentsHeightSum(form);
    const netHeight = this.getNetHeight(form);
    const difference = segmentsSum - netHeight;

    if (Math.abs(difference) > 5) {
      if (difference > 0) {
        return `Suma wysokości segmentów (${segmentsSum}mm) przekracza wysokość netto szafki (${netHeight}mm) o ${difference}mm.`;
      } else {
        return `Suma wysokości segmentów (${segmentsSum}mm) jest mniejsza niż wysokość netto szafki (${netHeight}mm) o ${Math.abs(difference)}mm.`;
      }
    }

    return null;
  }
}
