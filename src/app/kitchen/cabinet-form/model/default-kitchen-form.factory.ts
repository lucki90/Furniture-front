import {FormBuilder, FormGroup} from '@angular/forms';
import {KitchenCabinetType} from './kitchen-cabinet-type';

export class DefaultKitchenFormFactory {
  static create(fb: FormBuilder): FormGroup {
    return fb.group({
      kitchenCabinetType: [KitchenCabinetType.BASE_ONE_DOOR],
      width: null,
      height: null,
      depth: null,
      shelfQuantity: null,
      drawerQuantity: null,
      drawerModel: null
    });
  }
}
