import { AbstractControl, FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';

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

    // Pokaż sekcję obudowy bocznej
    v.enclosureSection = true;

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
      hoodScreenHeightMm: 100
    });

    // Kontrolki
    this.setControlEnabled(form.get('drawerQuantity'), false);
    this.setControlEnabled(form.get('shelfQuantity'), false);
    this.setControlEnabled(form.get('drawerModel'), false);
    this.setControlEnabled(form.get('hoodFrontType'), true);
    this.setControlEnabled(form.get('hoodScreenEnabled'), true);
    this.setControlEnabled(form.get('hoodScreenHeightMm'), false);  // aktywowane dynamicznie
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
