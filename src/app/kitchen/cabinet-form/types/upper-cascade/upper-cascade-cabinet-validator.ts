import { FormGroup, Validators } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';

/**
 * Validator dla szafki wiszącej kaskadowej (UPPER_CASCADE).
 * Waliduje szerokość oraz wymiary obu segmentów kaskady.
 *
 * Logika głębokości:
 *   - Dolny segment (bliżej blatu): PŁYTSZY (250-400 mm)
 *   - Górny segment (bliżej sufitu): GŁĘBSZY (300-560 mm)
 *   - Wymagane: lowerDepth <= upperDepth
 */
export class UpperCascadeCabinetValidator implements KitchenCabinetValidator {

  private readonly WIDTH_MIN = 200;
  private readonly WIDTH_MAX = 900;

  private readonly LOWER_DEPTH_MIN = 250;  // dolny = płytszy
  private readonly LOWER_DEPTH_MAX = 400;
  private readonly UPPER_DEPTH_MIN = 300;  // górny = głębszy
  private readonly UPPER_DEPTH_MAX = 560;

  private readonly SEGMENT_HEIGHT_MIN = 100;
  private readonly SEGMENT_HEIGHT_MAX = 900;

  validate(form: FormGroup): void {
    // Szerokość
    form.get('width')?.setValidators([
      Validators.required,
      Validators.min(this.WIDTH_MIN),
      Validators.max(this.WIDTH_MAX)
    ]);

    // Wysokość dolnego segmentu
    form.get('cascadeLowerHeight')?.setValidators([
      Validators.required,
      Validators.min(this.SEGMENT_HEIGHT_MIN),
      Validators.max(this.SEGMENT_HEIGHT_MAX)
    ]);

    // Głębokość dolnego segmentu (płytszy)
    form.get('cascadeLowerDepth')?.setValidators([
      Validators.required,
      Validators.min(this.LOWER_DEPTH_MIN),
      Validators.max(this.LOWER_DEPTH_MAX)
    ]);

    // Wysokość górnego segmentu
    form.get('cascadeUpperHeight')?.setValidators([
      Validators.required,
      Validators.min(this.SEGMENT_HEIGHT_MIN),
      Validators.max(this.SEGMENT_HEIGHT_MAX)
    ]);

    // Głębokość górnego segmentu (głębszy)
    form.get('cascadeUpperDepth')?.setValidators([
      Validators.required,
      Validators.min(this.UPPER_DEPTH_MIN),
      Validators.max(this.UPPER_DEPTH_MAX)
    ]);

    form.get('width')?.updateValueAndValidity();
    form.get('cascadeLowerHeight')?.updateValueAndValidity();
    form.get('cascadeLowerDepth')?.updateValueAndValidity();
    form.get('cascadeUpperHeight')?.updateValueAndValidity();
    form.get('cascadeUpperDepth')?.updateValueAndValidity();
    form.updateValueAndValidity();
  }

  /**
   * Sprawdza czy głębokość dolnego segmentu jest <= górnego (dolny płytszy lub równy).
   */
  isDepthOrderValid(form: FormGroup): boolean {
    const lowerDepth = form.get('cascadeLowerDepth')?.value ?? 0;
    const upperDepth = form.get('cascadeUpperDepth')?.value ?? 0;
    return lowerDepth <= upperDepth;
  }

  /**
   * Zwraca błąd walidacji głębokości segmentów.
   */
  getDepthOrderError(form: FormGroup): string | null {
    const lowerDepth = form.get('cascadeLowerDepth')?.value ?? 0;
    const upperDepth = form.get('cascadeUpperDepth')?.value ?? 0;
    if (lowerDepth > upperDepth) {
      return `Głębokość dolnego segmentu (${lowerDepth} mm) musi być ≤ górnemu (${upperDepth} mm)`;
    }
    return null;
  }
}
