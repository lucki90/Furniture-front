import { FormGroup } from "@angular/forms";
import { KitchenCabinetValidator } from "../../type-config/validator/kitchen-cabinet-validator";
import { KitchenCabinetConstraints } from "../../model/kitchen-cabinet-constants";
import { setDimensionValidators } from "../../type-config/validator/dimension-validator.utils";

export class BaseOneDoorCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    setDimensionValidators(form, KitchenCabinetConstraints.BASE_ONE_DOOR);
  }
}
