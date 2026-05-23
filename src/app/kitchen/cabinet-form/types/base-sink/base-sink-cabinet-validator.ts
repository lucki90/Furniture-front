import { FormGroup, Validators } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

export class BaseSinkCabinetValidator implements KitchenCabinetValidator {

  private readonly constraints = KitchenCabinetConstraints.BASE_SINK;

  validate(form: FormGroup): void {
    const widthRange = this.resolveWidthRange(form.get('sinkFrontType')?.value as string | null | undefined);

    form.get('width')?.setValidators([
      Validators.required,
      Validators.min(widthRange.min),
      Validators.max(widthRange.max)
    ]);

    form.get('height')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.HEIGHT_MIN),
      Validators.max(this.constraints.HEIGHT_MAX)
    ]);

    form.get('depth')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.DEPTH_MIN),
      Validators.max(this.constraints.DEPTH_MAX)
    ]);

    // sinkApronHeightMm walidowane tylko gdy apronEnabled=true — dla uproszczenia walidacja zakresu statycznie
    form.get('sinkApronHeightMm')?.setValidators([
      Validators.min(this.constraints.APRON_MIN),
      Validators.max(this.constraints.APRON_MAX)
    ]);

    form.get('width')?.updateValueAndValidity();
    form.get('height')?.updateValueAndValidity();
    form.get('depth')?.updateValueAndValidity();
    form.get('sinkApronHeightMm')?.updateValueAndValidity();
    form.updateValueAndValidity();
  }

  /**
   * Resolves width range based on sinkFrontType per book Wasiak v.2.3 str. 41:
   * - ONE_DOOR:  450–600mm
   * - TWO_DOORS: 600–1000mm
   * - DRAWER:    450–900mm (Blum Antaro limit pod zlewem)
   * Fallback (null/unknown): union range 450–1000mm.
   */
  private resolveWidthRange(sinkFrontType: string | null | undefined): { min: number; max: number } {
    switch (sinkFrontType) {
      case 'ONE_DOOR':
        return { min: this.constraints.WIDTH_ONE_DOOR_MIN, max: this.constraints.WIDTH_ONE_DOOR_MAX };
      case 'TWO_DOORS':
        return { min: this.constraints.WIDTH_TWO_DOORS_MIN, max: this.constraints.WIDTH_TWO_DOORS_MAX };
      case 'DRAWER':
        return { min: this.constraints.WIDTH_DRAWER_MIN, max: this.constraints.WIDTH_DRAWER_MAX };
      default:
        return { min: this.constraints.WIDTH_MIN, max: this.constraints.WIDTH_MAX };
    }
  }
}
