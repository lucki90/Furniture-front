import { AbstractControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';
import { integerValidator } from '../../type-config/validator/integer.validator';

export class BaseCargoCabinetValidator implements KitchenCabinetValidator {
  private readonly constraints = KitchenCabinetConstraints.BASE_CARGO;

  validate(form: FormGroup): void {
    form.get('width')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.WIDTH_MIN),
      Validators.max(this.constraints.WIDTH_MAX)
    ]);

    form.get('height')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.HEIGHT_MIN),
      Validators.max(this.constraints.HEIGHT_MAX)
    ]);

    form.get('depth')?.setValidators([this.cargoDepthValidator(form)]);

    form.get('drawerQuantity')?.setValidators([
      this.cargoDrawerQuantityValidator(form)
    ]);
    form.get('drawerModel')?.setValidators([
      this.cargoDrawerModelValidator(form)
    ]);
    form.get('cargoBrand')?.setValidators([
      this.cargoBrandValidator(form)
    ]);

    form.get('width')?.updateValueAndValidity();
    form.get('height')?.updateValueAndValidity();
    form.get('depth')?.updateValueAndValidity();
    form.get('drawerQuantity')?.updateValueAndValidity();
    form.get('drawerModel')?.updateValueAndValidity();
    form.get('cargoBrand')?.updateValueAndValidity();
    form.updateValueAndValidity();
  }

  private cargoDepthValidator(form: FormGroup) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return { required: true };
      }

      const value = Number(control.value);
      if (Number.isNaN(value)) {
        return { required: true };
      }

      const minimum = form.get('cargoVariant')?.value === 'DRAWERS'
        ? this.constraints.DEPTH_DRAWERS_MIN
        : this.constraints.DEPTH_MECHANISM_MIN;
      if (value < minimum) {
        return { min: { min: minimum, actual: value } };
      }
      if (value > this.constraints.DEPTH_MAX) {
        return { max: { max: this.constraints.DEPTH_MAX, actual: value } };
      }
      return null;
    };
  }

  private cargoDrawerQuantityValidator(form: FormGroup) {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = Number(control.value);
      if (Number.isNaN(value)) {
        return { required: true };
      }
      if (value < this.constraints.DRAWER_MIN) {
        return { min: { min: this.constraints.DRAWER_MIN, actual: value } };
      }
      if (value > this.constraints.DRAWER_MAX) {
        return { max: { max: this.constraints.DRAWER_MAX, actual: value } };
      }
      return integerValidator(control);
    };
  }

  private cargoDrawerModelValidator(form: FormGroup) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (form.get('cargoVariant')?.value !== 'DRAWERS') {
        return null;
      }
      return control.value ? null : { required: true };
    };
  }

  private cargoBrandValidator(form: FormGroup) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (form.get('cargoVariant')?.value !== 'MECHANISM') {
        return null;
      }
      return control.value ? null : { required: true };
    };
  }
}
