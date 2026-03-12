import { AbstractControl, FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';

export class BaseDishwasherFreestandingCabinetPreparer implements KitchenCabinetPreparer {

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
    v.bottomWreathOnFloor = false;
    v.enclosureSection = true;

    v.sinkFrontType = false;
    v.sinkApron = false;
    v.sinkApronHeight = false;
    v.sinkDrawerModel = false;

    form.patchValue({
      width: 600,
      height: 720,
      depth: 570,
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null
    });

    this.setControlEnabled(form.get('shelfQuantity'), false);
    this.setControlEnabled(form.get('drawerQuantity'), false);
    this.setControlEnabled(form.get('drawerModel'), false);
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
