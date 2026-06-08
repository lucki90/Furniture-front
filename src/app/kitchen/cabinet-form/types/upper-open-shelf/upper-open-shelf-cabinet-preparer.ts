import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';
import { ProjectSettingsConstraints } from '../../model/kitchen-cabinet-constants';

/**
 * Preparer dla szafki wiszacej otwartej - bez drzwi (UPPER_OPEN_SHELF).
 * Szafka wiszaca: brak cokolu, brak blatu, montowana na szynie, bez frontu.
 */
export class UpperOpenShelfCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Widocznosc - standardowe pola wymiarow + polki
    v.width = true;
    v.shelfQuantity = true;
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = false;

    // Ukryj pola naroznika
    v.cornerWidthA = false;
    v.cornerWidthB = false;
    v.cornerMechanism = false;
    v.cornerShelfQuantity = false;
    v.isUpperCorner = false;

    // Pokaz pola pozycjonowania szafek wiszacych
    v.positioningMode = true;
    v.gapFromCountertopMm = true;
    v.gapFromAnchorMm = true;

    // Pokaz sekcje obudowy bocznej
    v.enclosureSection = true;

    // Wartosci domyslne - szafka otwarta, min 1 polka
    form.patchValue({
      width: 400,
      height: 720,
      depth: 340,
      shelfQuantity: 2,
      drawerQuantity: 0,
      drawerModel: null,
      positioningMode: 'RELATIVE_TO_CEILING',
      gapFromCountertopMm: ProjectSettingsConstraints.UPPER_GAP_FROM_COUNTERTOP_DEFAULT
    });

    // Kontrolki
    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('shelfQuantity'), true);
    setControlEnabled(form.get('drawerModel'), false);
  }
}
