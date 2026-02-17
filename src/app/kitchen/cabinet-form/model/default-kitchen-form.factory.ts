import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {KitchenCabinetType} from './kitchen-cabinet-type';

export class DefaultKitchenFormFactory {
  static create(fb: FormBuilder): FormGroup {
    return fb.group({
      name: [''],  // opcjonalna nazwa szafki
      kitchenCabinetType: [KitchenCabinetType.BASE_ONE_DOOR],
      openingType: ['HANDLE'],  // domyślnie uchwyt
      width: null,
      height: null,
      depth: null,
      positionY: [0],  // wysokość od podłogi (0 = dolna, np. 1400 = wisząca)
      shelfQuantity: null,
      drawerQuantity: null,
      drawerModel: null,
      segments: fb.array([])  // FormArray dla segmentów (TALL_CABINET)
    });
  }
}
