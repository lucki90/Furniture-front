import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { SegmentFrontType, SegmentType } from '../../model/segment.model';
import { createSegmentFormGroup } from '../../model/segment-form-group';

/**
 * Preparer dla szafki typu słupek (TALL_CABINET).
 * Inicjalizuje formularz z domyślnymi segmentami.
 */
export class TallCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Widoczność - ukryj standardowe pola, pokaż segmenty
    v.width = true;  // Standardowa szerokość widoczna
    v.shelfQuantity = false;
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = true;

    // Ukryj pola narożnika (resetowanie po CORNER_CABINET)
    v.cornerWidthA = false;
    v.cornerWidthB = false;
    v.cornerMechanism = false;
    v.cornerShelfQuantity = false;
    v.isUpperCorner = false;

    // Pokaż sekcję obudowy bocznej
    v.enclosureSection = true;

    // Blokada szafek wiszących — słupek może blokować miejsce powyżej
    v.blockUpperAbove = true;

    // Wartości domyślne dla słupka
    form.patchValue({
      width: 450,
      height: 2000,  // 2000mm = typowa wysokość korpusu słupka (bez cokołu)
      depth: 560,
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null
    });

    // Możliwość edycji standardowych pól
    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('shelfQuantity'), false);
    setControlEnabled(form.get('drawerModel'), false);

    // Inicjalizuj domyślne segmenty jeśli FormArray istnieje
    this.initializeDefaultSegments(form);
  }

  /**
   * Inicjalizuje domyślne segmenty dla słupka.
   * Domyślna konfiguracja: drzwi na górze (1500 mm, 2 półki) + 3 szuflady na dole (500 mm).
   */
  private initializeDefaultSegments(form: FormGroup): void {
    const segmentsControl = form.get('segments');

    if (segmentsControl instanceof FormArray) {
      // Wyczyść istniejące segmenty
      while (segmentsControl.length > 0) {
        segmentsControl.removeAt(0);
      }

      // Segment 1: drzwi na górze (1500 mm, 2 półki); segment 2: szuflady na dole (500 mm, 3 szuflady)
      const fb = new FormBuilder();
      segmentsControl.push(createSegmentFormGroup(fb, {
        segmentType: SegmentType.DOOR,
        height: 1500,
        orderIndex: 0,
        shelfQuantity: 2,
        frontType: SegmentFrontType.ONE_DOOR
      }));
      segmentsControl.push(createSegmentFormGroup(fb, {
        segmentType: SegmentType.DRAWER,
        height: 500,
        orderIndex: 1,
        drawerQuantity: 3,
        drawerModel: 'ANTARO_TANDEMBOX'
      }));
    }
  }
}
