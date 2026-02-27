import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {KitchenCabinetType} from './kitchen-cabinet-type';
import {CornerMechanismType} from './corner-cabinet.model';

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
      segments: fb.array([]),  // FormArray dla segmentów (TALL_CABINET)

      // Pola dla szafki narożnej (CORNER_CABINET)
      cornerWidthA: [900],       // Szerokość na ścianie A (mm)
      cornerWidthB: [900],       // Szerokość na ścianie B (mm)
      cornerMechanism: [CornerMechanismType.FIXED_SHELVES],  // Typ mechanizmu
      cornerShelfQuantity: [2],  // Liczba półek (dla FIXED_SHELVES)
      isUpperCorner: [false],    // true = górna wisząca, false = dolna

      // Pola pozycjonowania szafek wiszących (UPPER_*)
      positioningMode: ['RELATIVE_TO_CEILING'],  // RELATIVE_TO_CEILING | RELATIVE_TO_COUNTERTOP
      gapFromCountertopMm: [500],                // Odstęp od blatu (min 450mm)

      // Pola kaskadowe (dla UPPER_CASCADE)
      cascadeLowerHeight: [400],   // Wysokość dolnego (głębszego) segmentu
      cascadeLowerDepth: [400],    // Głębokość dolnego segmentu (300-560mm)
      cascadeUpperHeight: [320],   // Wysokość górnego (płytszego) segmentu
      cascadeUpperDepth: [300]     // Głębokość górnego segmentu (250-400mm)
    });
  }
}
