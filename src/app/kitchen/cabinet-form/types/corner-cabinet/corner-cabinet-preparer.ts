import { FormGroup } from '@angular/forms';
import { setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { ProjectSettingsConstraints } from '../../model/kitchen-cabinet-constants';
import {
  CornerMechanismType,
  CornerOpeningType,
  BASE_CORNER_CONSTRAINTS,
  UPPER_CORNER_CONSTRAINTS,
  BLIND_CORNER_CONSTRAINTS,
  isBlindType
} from '../../model/corner-cabinet.model';

/**
 * Preparer dla szafki narożnej (CORNER_CABINET).
 *
 * Obsługuje dwa fizycznie różne typy narożników:
 * - Type A (L-shaped): FIXED_SHELVES, NONE, CAROUSEL_270, CAROUSEL_360
 *   widthA + widthB, głębokość 560mm, typ otwarcia (TWO_DOORS | BIFOLD)
 * - Type B (Blind/Rectangular): BLIND_CORNER, MAGIC_CORNER, LE_MANS
 *   tylko widthA, głębokość 510mm, frontUchylnyWidthMm 400-600mm, wyłącznie dolna
 */
export class CornerCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Ukryj standardowe pola — narożnik używa własnych
    v.width = false;
    v.shelfQuantity = false;
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = false;

    // Pola wspólne narożnika
    v.cornerWidthA = true;
    v.cornerMechanism = true;
    v.enclosureSection = true;

    // Wstępna konfiguracja na podstawie bieżącego mechanizmu.
    // Narożnik górny (wiszący) obsługuje Type A (L-kształt) ORAZ wiszący ślepy narożnik (BLIND_CORNER) —
    // konstrukcja ślepego górnego jest identyczna jak dolnego, różni się brakiem nóżek i opcjami szafki
    // wiszącej (przedłużany front). Magic Corner / Le Mans nie mają wariantu wiszącego, więc gdy użytkownik
    // przełącza taki dolny narożnik na górny (picker ustawia isUpperCorner=true przed zmianą typu),
    // wymuszamy FIXED_SHELVES, żeby kontekst formularza faktycznie się zmienił (bug-fix 2026-06-01).
    const rawMechanism = (form.get('cornerMechanism')?.value ?? CornerMechanismType.FIXED_SHELVES) as CornerMechanismType;
    const wantsUpper = form.get('isUpperCorner')?.value ?? false;
    const mustCoerce = wantsUpper && isBlindType(rawMechanism) && rawMechanism !== CornerMechanismType.BLIND_CORNER;
    const mechanism = mustCoerce ? CornerMechanismType.FIXED_SHELVES : rawMechanism;
    this.updateVisibilityForMechanism(mechanism, form, v);

    // Wartości domyślne
    this.applyDefaultValues(form, mechanism);

    // Wyłącz pola nieużywane
    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('shelfQuantity'), false);
    setControlEnabled(form.get('drawerModel'), false);

    // NOTE R.9: Logika reaktywna (zmiany mechanizmu / isUpperCorner) jest obsługiwana
    // w CornerFormComponent z prawidłowym takeUntilDestroyed(). Preparer NIE może
    // subskrybować valueChanges — jest singletonem (tworzonym raz w type-config),
    // więc każde wywołanie prepare() akumulowałoby nowe subskrypcje bez cleanup.
  }

  /**
   * Ustawia widoczność pól w zależności od mechanizmu (Type A / Type B).
   */
  private updateVisibilityForMechanism(
    mechanism: CornerMechanismType, form: FormGroup, v: CabinetFormVisibility
  ): void {
    const typeB = isBlindType(mechanism);
    const wantsUpper = form.get('isUpperCorner')?.value ?? false;
    // Wiszący ślepy narożnik: BLIND_CORNER + górny. Pokazuje opcje szafki wiszącej (przedłużany front).
    const upperBlind = typeB && mechanism === CornerMechanismType.BLIND_CORNER && wantsUpper;

    // Type B: brak widthB; Type A zachowuje cornerOpeningType dla dolnych i gornych naroznikow
    v.cornerWidthB = !typeB;
    // Iteracja 3 poprawka 2026-05-24: isUpperCorner ZAWSZE ukryty — dolna/górna wybierana w pickerze
    // typu szafki (entry-points "Narożna" w sekcji dolnych vs wiszących), nie w formularzu.
    // Wartość pola `isUpperCorner` w FormGroup nadal jest używana przez logikę (constraints, request mapper),
    // ale UI nie pokazuje selectu.
    v.isUpperCorner = false;
    v.cornerOpeningType = !typeB;
    v.cornerFrontUchylnyWidth = typeB;

    // Półki: FIXED_SHELVES (Type A) lub BLIND_CORNER (Type B)
    v.cornerShelfQuantity = mechanism === CornerMechanismType.FIXED_SHELVES
      || mechanism === CornerMechanismType.BLIND_CORNER;

    // Opcje szafki wiszącej (pozycjonowanie + przedłużany front) — tylko dla wiszącego ślepego narożnika.
    // Pozostałe warianty narożnika (dolne, górne Type A) nie mają tych pól; blockUpperAbove dotyczy tylko dolnych.
    v.positioningMode = upperBlind;
    v.gapFromCountertopMm = upperBlind;
    v.gapFromAnchorMm = upperBlind;
    v.extendedFront = upperBlind;
    v.liftUp = false;
    v.blockUpperAbove = !upperBlind;
  }

  private applyDefaultValues(form: FormGroup, mechanism: CornerMechanismType): void {
    const typeB = isBlindType(mechanism);
    const wantsUpper = form.get('isUpperCorner')?.value ?? false;
    // Type B jako wiszący istnieje WYŁĄCZNIE dla BLIND_CORNER (Magic/Le Mans już skoercowane do FIXED_SHELVES).
    const upperBlind = typeB && mechanism === CornerMechanismType.BLIND_CORNER && wantsUpper;
    const isUpperTypeA = !typeB && wantsUpper;
    // Wiszący ślepy narożnik ma konstrukcję identyczną jak dolny → BLIND_CORNER_CONSTRAINTS (depth 510, width 800–1200).
    const constraints = typeB ? BLIND_CORNER_CONSTRAINTS
                      : isUpperTypeA ? UPPER_CORNER_CONSTRAINTS
                      : BASE_CORNER_CONSTRAINTS;

    // TODO R.9: `patch: any` — rozważ typowany interfejs CornerPatchValues zamiast any
    const patch: any = {
      cornerWidthA: typeB ? 1000 : (isUpperTypeA ? 700 : 900),
      cornerWidthB: isUpperTypeA ? 700 : 900,
      height: 720,
      depth: constraints.depth,
      cornerMechanism: mechanism,
      width: typeB ? 1000 : (isUpperTypeA ? 700 : 900),
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null
    };

    if (typeB) {
      patch.cornerFrontUchylnyWidthMm = form.get('cornerFrontUchylnyWidthMm')?.value ?? 500;
      patch.cornerShelfQuantity = mechanism === CornerMechanismType.BLIND_CORNER
        ? (form.get('cornerShelfQuantity')?.value ?? 0) : 0;
      // Zachowaj wybór dolny/górny dla ślepego narożnika (BLIND_CORNER ma wariant wiszący).
      patch.isUpperCorner = upperBlind;
    } else {
      patch.cornerOpeningType = form.get('cornerOpeningType')?.value ?? CornerOpeningType.TWO_DOORS;
      patch.cornerShelfQuantity = mechanism === CornerMechanismType.FIXED_SHELVES
        ? (form.get('cornerShelfQuantity')?.value ?? 2) : 0;
    }

    // Opcje szafki wiszącej dla wiszącego ślepego narożnika (przedłużany front + pozycjonowanie).
    // Zachowujemy istniejące wartości (tryb edycji), z domyślnymi jak dla zwykłych szafek wiszących.
    if (upperBlind) {
      patch.positioningMode = form.get('positioningMode')?.value ?? 'RELATIVE_TO_CEILING';
      patch.gapFromCountertopMm = form.get('gapFromCountertopMm')?.value
        ?? ProjectSettingsConstraints.UPPER_GAP_FROM_COUNTERTOP_DEFAULT;
      patch.isFrontExtended = form.get('isFrontExtended')?.value ?? false;
      patch.isLiftUp = false;
    }

    form.patchValue(patch);
  }

}
