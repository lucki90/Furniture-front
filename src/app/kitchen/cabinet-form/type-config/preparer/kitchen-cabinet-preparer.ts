import {FormGroup} from '@angular/forms';
import {CabinetFormVisibility} from "./cabinet-form-visibility";

export interface KitchenCabinetPreparer {
  prepare(
    form: FormGroup,
    visibility: CabinetFormVisibility
  ): void;
}
