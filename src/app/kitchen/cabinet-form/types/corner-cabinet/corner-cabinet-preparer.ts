import { AbstractControl, FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import {
  CornerMechanismType,
  BASE_CORNER_CONSTRAINTS,
  UPPER_CORNER_CONSTRAINTS
} from '../../model/corner-cabinet.model';

/**
 * Preparer dla szafki narożnej (CORNER_CABINET).
 * Inicjalizuje formularz z domyślnymi wartościami dla narożnika.
 */
export class CornerCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Widoczność - pokaż pola narożnika, ukryj standardowe
    v.width = false;  // Zamiast width używamy cornerWidthA i cornerWidthB
    v.shelfQuantity = false;  // Półki zależą od mechanizmu
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = false;

    // Pokaż pola specyficzne dla narożnika
    v.cornerWidthA = true;
    v.cornerWidthB = true;
    v.cornerMechanism = true;
    v.isUpperCorner = true;

    // Wartości domyślne dla dolnej szafki narożnej
    const isUpper = form.get('isUpperCorner')?.value ?? false;
    const constraints = isUpper ? UPPER_CORNER_CONSTRAINTS : BASE_CORNER_CONSTRAINTS;

    form.patchValue({
      // Wymiary domyślne
      cornerWidthA: 900,
      cornerWidthB: 900,
      height: isUpper ? 720 : 870,
      depth: isUpper ? 320 : BASE_CORNER_CONSTRAINTS.depth,
      // Mechanizm domyślny
      cornerMechanism: CornerMechanismType.FIXED_SHELVES,
      cornerShelfQuantity: 2,
      isUpperCorner: false,
      // Ukryte pola
      width: 900,  // Dla kompatybilności używamy cornerWidthA
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null
    });

    // Wyłącz standardowe pola
    this.setControlEnabled(form.get('width'), false);
    this.setControlEnabled(form.get('drawerQuantity'), false);
    this.setControlEnabled(form.get('shelfQuantity'), false);
    this.setControlEnabled(form.get('drawerModel'), false);

    // Obserwuj zmiany typu (dolna/górna)
    this.setupUpperCabinetListener(form, v);
  }

  /**
   * Reaguje na zmianę typu szafki (dolna/górna).
   */
  private setupUpperCabinetListener(form: FormGroup, v: CabinetFormVisibility): void {
    const isUpperControl = form.get('isUpperCorner');
    if (!isUpperControl) return;

    // Przy zmianie typu aktualizuj ograniczenia i widoczność półek
    isUpperControl.valueChanges.subscribe((isUpper: boolean) => {
      const constraints = isUpper ? UPPER_CORNER_CONSTRAINTS : BASE_CORNER_CONSTRAINTS;

      // Aktualizuj wymiary do domyślnych dla typu
      form.patchValue({
        height: isUpper ? 720 : 870,
        depth: isUpper ? 320 : BASE_CORNER_CONSTRAINTS.depth,
        cornerWidthA: isUpper ? 700 : 900,
        cornerWidthB: isUpper ? 700 : 900
      });

      // Dla górnej szafki ogranicz mechanizmy
      const currentMechanism = form.get('cornerMechanism')?.value;
      if (isUpper && currentMechanism &&
          currentMechanism !== CornerMechanismType.FIXED_SHELVES &&
          currentMechanism !== CornerMechanismType.NONE) {
        form.patchValue({
          cornerMechanism: CornerMechanismType.FIXED_SHELVES
        });
      }
    });

    // Obserwuj zmianę mechanizmu - pokaż/ukryj półki
    const mechanismControl = form.get('cornerMechanism');
    if (mechanismControl) {
      mechanismControl.valueChanges.subscribe((mechanism: CornerMechanismType) => {
        v.cornerShelfQuantity = mechanism === CornerMechanismType.FIXED_SHELVES;
      });

      // Ustaw początkową widoczność półek
      v.cornerShelfQuantity = mechanismControl.value === CornerMechanismType.FIXED_SHELVES;
    }
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
