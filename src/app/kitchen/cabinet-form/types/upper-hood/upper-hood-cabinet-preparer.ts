import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';

/**
 * Preparer dla szafki wiszącej na okap (UPPER_HOOD).
 * Szafka wisząca montowana na szynie — brak cokołu, brak blatu.
 * Brak półek (wnętrze zajęte przez okap).
 * Opcjonalna blenda wewnętrzna maskująca mechanizm okapu.
 */
export class UpperHoodCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Wymiary — width widoczny, półki ukryte (brak w szafce na okap)
    v.width = true;
    v.shelfQuantity = false;
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
    v.gapFromAnchorMm = true;

    // Pokaż sekcję obudowy bocznej
    v.enclosureSection = true;

    // Przedłużony front dostępny dla szafki na okap (lift-up obsługiwany przez hoodFrontType=FLAP)
    v.liftUp = false;
    v.extendedFront = true;

    // Pokaż sekcję specyficzną dla szafki na okap
    v.hoodFrontType = true;       // typ frontu: FLAP | TWO_DOORS | OPEN
    v.hoodScreenEnabled = true;   // checkbox: blenda wewnętrzna
    v.hoodScreenHeight = false;   // pole wysokości — widoczne dynamicznie (gdy checkbox zaznaczony)

    // Ukryj pola niezwiązane z okapem
    v.bottomWreathOnFloor = false;
    v.sinkFrontType = false;
    v.sinkApron = false;
    v.sinkApronHeight = false;
    v.sinkDrawerModel = false;
    v.cooktopType = false;
    v.cooktopFrontType = false;
    v.cascadeSegments = false;

    // Wartości domyślne
    form.patchValue({
      width: 600,
      height: 500,     // Typowa wysokość szafki na okap
      depth: 350,      // Szafki na okap są płytsze niż standardowe wiszące
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null,
      positioningMode: 'RELATIVE_TO_CEILING',
      gapFromCountertopMm: 500,
      hoodFrontType: 'FLAP',
      hoodScreenEnabled: false,
      hoodScreenHeightMm: 100,
      isFrontExtended: false
    });

    // Kontrolki
    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('shelfQuantity'), false);
    setControlEnabled(form.get('drawerModel'), false);
    setControlEnabled(form.get('hoodFrontType'), true);
    setControlEnabled(form.get('hoodScreenEnabled'), true);
    setControlEnabled(form.get('hoodScreenHeightMm'), false);  // aktywowane dynamicznie
  }
}
