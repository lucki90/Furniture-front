import { AbstractControl, FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { SegmentType } from '../../model/segment.model';

/**
 * Preparer dla szafki typu słupek (TALL_CABINET).
 * Inicjalizuje formularz z domyślnymi segmentami.
 */
export class TallCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Widoczność - ukryj standardowe pola, pokaż segmenty
    v.shelfQuantity = false;
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = true;

    // Wartości domyślne dla słupka
    form.patchValue({
      width: 450,
      height: 2100,  // 2100mm = typowa wysokość słupka
      depth: 560,
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null
    });

    // Możliwość edycji standardowych pól
    this.setControlEnabled(form.get('drawerQuantity'), false);
    this.setControlEnabled(form.get('shelfQuantity'), false);
    this.setControlEnabled(form.get('drawerModel'), false);

    // Inicjalizuj domyślne segmenty jeśli FormArray istnieje
    this.initializeDefaultSegments(form);
  }

  /**
   * Inicjalizuje domyślne segmenty dla słupka.
   * Domyślna konfiguracja: 3 szuflady na górze (500mm) + drzwi na dole (1500mm).
   */
  private initializeDefaultSegments(form: FormGroup): void {
    const segmentsControl = form.get('segments');

    if (segmentsControl instanceof FormArray) {
      // Wyczyść istniejące segmenty
      while (segmentsControl.length > 0) {
        segmentsControl.removeAt(0);
      }

      // Dodaj domyślne segmenty
      // Segment 1: Szuflady na górze (500mm, 3 szuflady)
      segmentsControl.push(this.createSegmentGroup({
        segmentType: SegmentType.DRAWER,
        height: 500,
        orderIndex: 0,
        drawerQuantity: 3,
        drawerModel: 'ANTARO_TANDEMBOX'
      }));

      // Segment 2: Drzwi na dole (1500mm, 2 półki)
      segmentsControl.push(this.createSegmentGroup({
        segmentType: SegmentType.DOOR,
        height: 1500,
        orderIndex: 1,
        shelfQuantity: 2,
        frontType: 'ONE_DOOR'
      }));
    }
  }

  /**
   * Tworzy FormGroup dla pojedynczego segmentu.
   */
  private createSegmentGroup(data: any): FormGroup {
    // Używamy prostego obiektu, FormBuilder jest używany w komponencie
    const fb = new FormBuilder();
    return fb.group({
      segmentType: [data.segmentType],
      height: [data.height],
      orderIndex: [data.orderIndex],
      drawerQuantity: [data.drawerQuantity ?? null],
      drawerModel: [data.drawerModel ?? null],
      shelfQuantity: [data.shelfQuantity ?? null],
      frontType: [data.frontType ?? null]
    });
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
