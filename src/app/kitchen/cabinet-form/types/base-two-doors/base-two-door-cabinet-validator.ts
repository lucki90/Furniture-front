import { FormGroup } from "@angular/forms";
import { KitchenCabinetValidator } from "../../type-config/validator/kitchen-cabinet-validator";
import { KitchenCabinetConstraints } from "../../model/kitchen-cabinet-constants";
import { setDimensionValidators } from "../../type-config/validator/dimension-validator.utils";

export class BaseTwoDoorCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    setDimensionValidators(form, KitchenCabinetConstraints.BASE_TWO_DOOR);
  }
}
