import { AbstractControl, FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';

/**
 * Preparer dla szafki wiszącej otwartej — bez drzwi (UPPER_OPEN_SHELF).
 * Szafka wisząca: brak cokołu, brak blatu, montowana na szynie, bez frontu.
 */
export class UpperOpenShelfCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Widoczność — standardowe pola wymiarów + półki
    v.width = true;
    v.shelfQuantity = true;
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = false;

    // Ukryj pola narożnika
    v.cornerWidthA = false;
    v.cornerWidthB = false;
    v.cornerMechanism = false;
    v.cornerShelfQuantity = false;
    v.isUpperCorner = false;

    // Pokaż pola pozycjonowania szafek wiszących
    v.positioningMode = true;
    v.gapFromCountertopMm = true;

    // Wartości domyślne — szafka otwarta, min 1 półka
    form.patchValue({
      width: 400,
      height: 720,     // Typowa wysokość szafki wiszącej
      depth: 320,       // Typowa głębokość szafki wiszącej
      shelfQuantity: 2, // Otwarta półka — domyślnie 2 półki
      drawerQuantity: 0,
      drawerModel: null,
      positioningMode: 'RELATIVE_TO_CEILING',
      gapFromCountertopMm: 500
    });

    // Kontrolki
    this.setControlEnabled(form.get('drawerQuantity'), false);
    this.setControlEnabled(form.get('shelfQuantity'), true);
    this.setControlEnabled(form.get('drawerModel'), false);
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
