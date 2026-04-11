import { FormGroup } from '@angular/forms';
import { setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';
import { setDimensionValidators } from '../../type-config/validator/dimension-validator.utils';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

/**
 * Preparer dla wolnostojącej lodówki (BASE_FRIDGE_FREESTANDING).
 * Wizualizacja — 0 płyt (tylko rysunek SVG).
 */
export class BaseFridgeFreestandingCabinetPreparer implements KitchenCabinetPreparer {

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
    v.ovenHeightType = false;
    v.ovenLowerSectionType = false;
    v.ovenApronEnabled = false;
    v.ovenApronHeight = false;
    v.ovenDrawerModel = false;

    // Pokaż typ lodówki (dla wizualizacji SVG)
    v.fridgeSectionType = false;
    v.lowerFrontHeightMm = false;
    v.fridgeFreestandingType = true;

    // Lodówka wolnostojąca ma własny uchwyt
    v.openingType = false;

    // Ustaw walidatory Angular dla wymiarów — zastępują stare walidatory poprzedniego typu
    const c = KitchenCabinetConstraints.BASE_FRIDGE_FREESTANDING;
    setDimensionValidators(form, c);

    // Wyczyść walidatory lowerFrontHeightMm (nieaktywne dla tego typu)
    const lowerFrontCtrl = form.get('lowerFrontHeightMm');
    if (lowerFrontCtrl) {
      lowerFrontCtrl.clearValidators();
      lowerFrontCtrl.setErrors(null);
      lowerFrontCtrl.updateValueAndValidity({ emitEvent: false });
    }

    form.patchValue({
      width: 600,
      height: 1850,
      depth: 650,
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null,
      fridgeFreestandingType: 'TWO_DOORS'
    });

    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('shelfQuantity'), false);
    setControlEnabled(form.get('drawerModel'), false);
  }
}
