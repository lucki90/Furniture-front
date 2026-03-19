import { AbstractControl, FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';

/**
 * Preparer dla szafki na wbudowany piekarnik (BASE_OVEN).
 */
export class BaseOvenCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Wymiary
    v.width = true;
    v.shelfQuantity = false;
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = false;

    // Ukryj narożnik, kaskadę, pozycjonowanie
    v.cornerWidthA = false;
    v.cornerWidthB = false;
    v.cornerMechanism = false;
    v.cornerShelfQuantity = false;
    v.isUpperCorner = false;
    v.positioningMode = false;
    v.gapFromCountertopMm = false;
    v.cascadeSegments = false;

    // Obudowa boczna
    v.enclosureSection = true;

    // Bez przedłużonego frontu, bez lift-up
    v.liftUp = false;
    v.extendedFront = false;

    // Bez wieńca dolnego na podłodze
    v.bottomWreathOnFloor = false;

    // Ukryj pola innych typów
    v.sinkFrontType = false;
    v.sinkApron = false;
    v.sinkApronHeight = false;
    v.sinkDrawerModel = false;
    v.cooktopType = false;
    v.cooktopFrontType = false;
    v.hoodFrontType = false;
    v.hoodScreenEnabled = false;
    v.hoodScreenHeight = false;

    // Pokaż pola specyficzne dla piekarnika
    v.ovenHeightType = true;
    v.ovenLowerSectionType = true;
    v.ovenApronEnabled = true;
    v.ovenApronHeight = false;  // dynamicznie

    // Wartości domyślne
    form.patchValue({
      width: 600,
      height: 850,   // typowo: 2×18(wieńce) + 18(separator) + 595(piekarnik) + 84(szuflada niska) + 35(luz) ≈ 768mm → 850mm bezpieczna
      depth: 560,
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: 'ANTARO_TANDEMBOX',  // domyślny system szuflady niskiej
      ovenHeightType: 'STANDARD',
      ovenLowerSectionType: 'LOW_DRAWER',
      ovenApronEnabled: false,
      ovenApronHeightMm: 50
    });

    this.setControlEnabled(form.get('drawerQuantity'), false);
    this.setControlEnabled(form.get('shelfQuantity'), false);
    this.setControlEnabled(form.get('drawerModel'), true);   // aktywny dla LOW_DRAWER (domyślne)
    this.setControlEnabled(form.get('ovenHeightType'), true);
    this.setControlEnabled(form.get('ovenLowerSectionType'), true);
    this.setControlEnabled(form.get('ovenApronEnabled'), true);
    this.setControlEnabled(form.get('ovenApronHeightMm'), false);  // aktywowane dynamicznie

    // Pokaż selector systemu szuflad — domyślna sekcja to LOW_DRAWER
    v.ovenDrawerModel = true;
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
