import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

/**
 * Preparer dla szafki na wbudowaną lodówkę (BASE_FRIDGE).
 * Strefa FULL — od podłogi do sufitu (jak TALL_CABINET).
 * Konfiguracja: typ sekcji (1-drzwiowa / 2-drzwiowa), opcjonalne sekcje nad lodówką.
 */
export class BaseFridgeCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Wymiary
    v.width = true;
    v.shelfQuantity = false;  // ukryta — shelfQuantity=0 (nie ma półek w sekcji lodówki)
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = true;        // sekcje nad lodówką — pokaż FormArray

    // Ukryj pola narożnika, kaskady, pozycjonowania
    v.cornerWidthA = false;
    v.cornerWidthB = false;
    v.cornerMechanism = false;
    v.cornerShelfQuantity = false;
    v.isUpperCorner = false;
    v.positioningMode = false;
    v.gapFromCountertopMm = false;
    v.cascadeSegments = false;

    // Obudowa boczna — szafka stojąca od podłogi do sufitu
    v.enclosureSection = true;

    // Bez frontu lift-up, bez przedłużonego frontu
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
    v.ovenHeightType = false;
    v.ovenLowerSectionType = false;
    v.ovenApronEnabled = false;
    v.ovenApronHeight = false;
    v.ovenDrawerModel = false;

    // Pokaż pola specyficzne dla lodówki
    v.fridgeSectionType = true;
    v.lowerFrontHeightMm = true;  // widoczne zawsze (dla TWO_DOORS aktywne, dla ONE_DOOR wyszarzone)
    v.fridgeFreestandingType = false;

    // Ustaw walidatory Angular dla wymiarów — zastępują stare walidatory poprzedniego typu
    const c = KitchenCabinetConstraints.BASE_FRIDGE;
    this.setDimensionValidators(form, c.WIDTH_MIN, c.WIDTH_MAX, c.HEIGHT_MIN, c.HEIGHT_MAX, c.DEPTH_MIN, c.DEPTH_MAX);

    // Walidatory dla frontu zamrażarki (domyślnie TWO_DOORS)
    const lowerFrontCtrl = form.get('lowerFrontHeightMm');
    if (lowerFrontCtrl) {
      lowerFrontCtrl.setValidators([Validators.required, Validators.min(c.LOWER_FRONT_MIN), Validators.max(c.LOWER_FRONT_MAX)]);
      lowerFrontCtrl.updateValueAndValidity({ emitEvent: false });
    }

    // Wartości domyślne
    form.patchValue({
      width: 600,
      height: 2000,  // typowa szafka na lodówkę
      depth: 560,
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null,
      fridgeSectionType: 'TWO_DOORS',
      lowerFrontHeightMm: 713   // default wg dokumentacji (zamrażarka ~713mm)
    });

    this.setControlEnabled(form.get('drawerQuantity'), false);
    this.setControlEnabled(form.get('shelfQuantity'), false);  // zawsze 0, ukryta w UI
    this.setControlEnabled(form.get('fridgeSectionType'), true);
    this.setControlEnabled(form.get('lowerFrontHeightMm'), true);

    // Zainicjalizuj pustą tablicę segmentów (sekcje nad lodówką — opcjonalne)
    this.initializeEmptySegments(form);
  }

  /**
   * Czyści tablicę segmentów (brak domyślnych sekcji — użytkownik dodaje opcjonalnie).
   */
  private initializeEmptySegments(form: FormGroup): void {
    const segmentsControl = form.get('segments');
    if (segmentsControl instanceof FormArray) {
      while (segmentsControl.length > 0) {
        segmentsControl.removeAt(0);
      }
    }
  }

  /**
   * Ustawia walidatory Angular min/max dla szerokości, wysokości i głębokości.
   * Zastępuje stare walidatory z poprzedniego typu szafki.
   */
  private setDimensionValidators(
    form: FormGroup,
    wMin: number, wMax: number,
    hMin: number, hMax: number,
    dMin: number, dMax: number
  ): void {
    const w = form.get('width');
    const h = form.get('height');
    const d = form.get('depth');
    if (w) {
      w.setValidators([Validators.required, Validators.min(wMin), Validators.max(wMax)]);
      w.updateValueAndValidity({ emitEvent: false });
    }
    if (h) {
      h.setValidators([Validators.required, Validators.min(hMin), Validators.max(hMax)]);
      h.updateValueAndValidity({ emitEvent: false });
    }
    if (d) {
      d.setValidators([Validators.required, Validators.min(dMin), Validators.max(dMax)]);
      d.updateValueAndValidity({ emitEvent: false });
    }
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
