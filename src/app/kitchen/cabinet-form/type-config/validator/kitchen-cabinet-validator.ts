import {FormGroup} from '@angular/forms';

export interface KitchenCabinetValidator {
  validate(form: FormGroup): void;
}
