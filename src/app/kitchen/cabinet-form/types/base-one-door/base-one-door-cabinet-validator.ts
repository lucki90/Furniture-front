import {FormGroup, Validators} from "@angular/forms";
import {KitchenCabinetValidator} from "../../type-config/validator/kitchen-cabinet-validator";

export class BaseOneDoorCabinetValidator
  implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    form.get('width')?.setValidators([
      Validators.required,
      Validators.min(400),
      Validators.max(800)
    ]);

    form.get('shelfQuantity')?.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(5)
    ]);

    form.updateValueAndValidity();
  }
}
