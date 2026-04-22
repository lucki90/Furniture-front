import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';

/**
 * Preparer dla szafki wiszącej z ociekaczem (UPPER_DRAINER).
 * Szafka wisząca montowana nad zlewem — brak cokołu, brak blatu, brak półek.
 * Dno otwarte (brak wieńca dolnego) — woda spływa do zlewu.
 * System ociekacza montowany między bokami (dodawany automatycznie jako komponent).
 * Sztywne szerokości: 400 / 500 / 600 / 800 / 900mm.
 */
export class UpperDrainerCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Szerokość: SELECT z 5 sztywnych wartości (nie wolny input)
    v.width = false;              // ukryj standardowy input
    v.drainerWidthSelect = true;  // pokaż select z wartościami 400/500/600/800/900
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
    v.cornerOpeningType = false;
    v.cornerFrontUchylnyWidth = false;

    // Pokaż pola pozycjonowania szafek wiszących
    v.positioningMode = true;
    v.gapFromCountertopMm = true;
    v.gapFromAnchorMm = true;

    // Pokaż sekcję obudowy bocznej
    v.enclosureSection = true;

    // Lift-up i przedłużony front niedostępne dla ociekacza
    v.liftUp = false;
    v.extendedFront = false;

    // Ukryj pola innych typów
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
    v.fridgeSectionType = false;
    v.lowerFrontHeightMm = false;
    v.fridgeFreestandingType = false;
    v.cascadeSegments = false;

    // Pokaż selektor frontu ociekacza
    v.drainerFrontType = true;

    // Wartości domyślne
    form.patchValue({
      width: 600,
      height: 600,
      depth: 300,
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null,
      positioningMode: 'RELATIVE_TO_CEILING',
      gapFromCountertopMm: 500,
      drainerFrontType: 'OPEN',
      isFrontExtended: false
    });

    // Kontrolki
    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('shelfQuantity'), false);
    setControlEnabled(form.get('drawerModel'), false);
    setControlEnabled(form.get('drainerFrontType'), true);
  }
}
