import { AbstractControl, FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';

/**
 * Preparer dla wolnostojącego piekarnika z płytą grzewczą (BASE_OVEN_FREESTANDING).
 * Wizualizacja — 0 płyt.
 */
export class BaseOvenFreestandingCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    v.width = true;
    v.shelfQuantity = false;
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = false;

    v.cornerWidthA = false;
    v.cornerWidthB = false;
    v.cornerMechanism = false;
    v.cornerShelfQuantity = false;
    v.isUpperCorner = false;
    v.positioningMode = false;
    v.gapFromCountertopMm = false;
    v.cascadeSegments = false;
    v.enclosureSection = false;   // wolnostojący — bez obudowy
    v.liftUp = false;
    v.extendedFront = false;
    v.bottomWreathOnFloor = false;

    v.sinkFrontType = false;
    v.sinkApron = false;
    v.sinkApronHeight = false;
    v.sinkDrawerModel = false;
    v.cooktopType = false;
    v.cooktopFrontType = false;
    v.hoodFrontType = false;
    v.hoodScreenEnabled = false;
    v.hoodScreenHeight = false;

    // Brak pól specyficznych dla piekarnika wbudowanego
    v.ovenHeightType = false;
    v.ovenLowerSectionType = false;
    v.ovenApronEnabled = false;
    v.ovenApronHeight = false;

    // Wolnostojący piekarnik ma własny uchwyt — nie wybieramy systemu otwarcia
    v.openingType = false;

    form.patchValue({
      width: 600,
      height: 720,
      depth: 560,
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null
    });

    this.setControlEnabled(form.get('drawerQuantity'), false);
    this.setControlEnabled(form.get('shelfQuantity'), false);
    this.setControlEnabled(form.get('drawerModel'), false);
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
