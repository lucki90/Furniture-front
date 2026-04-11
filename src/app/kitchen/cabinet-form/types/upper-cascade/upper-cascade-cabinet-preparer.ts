import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';

/**
 * Preparer dla szafki wiszącej kaskadowej (UPPER_CASCADE).
 * Szafka składa się z 2 segmentów o różnych głębokościach:
 *   - Dolny segment (płytszy, bliżej blatu):  300mm głębokości, 400mm wysokości
 *   - Górny segment (głębszy, bliżej sufitu): 400mm głębokości, 320mm wysokości
 *
 * Wymiary szafki:
 *   height = cascadeLowerHeight + cascadeUpperHeight
 *   depth  = cascadeUpperDepth (głębszy, górny segment decyduje o głębokości do kalkulacji)
 */
export class UpperCascadeCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Widoczność — standardowe pola + kaskada
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

    // Pokaż sekcję segmentów kaskadowych
    v.cascadeSegments = true;

    // Pokaż sekcję obudowy bocznej
    v.enclosureSection = true;

    // Opcje frontu — per segment (widoczne w sekcji kaskadowej, nie globalne v.liftUp/extendedFront)
    v.liftUp = false;
    v.extendedFront = false;

    // Wartości domyślne
    // Dolny = płytszy (300mm), górny = głębszy (400mm)
    form.patchValue({
      width: 400,
      cascadeLowerHeight: 400,
      cascadeLowerDepth: 300,   // dolny: płytszy
      cascadeUpperHeight: 320,
      cascadeUpperDepth: 400,   // górny: głębszy
      drawerQuantity: 0,
      drawerModel: null,
      positioningMode: 'RELATIVE_TO_CEILING',
      gapFromCountertopMm: 500,
      cascadeLowerIsLiftUp: false,
      cascadeLowerIsFrontExtended: false,
      cascadeUpperIsLiftUp: false
    });

    // Oblicz i ustaw wymiary z segmentów
    this.recalculateDimensions(form);

    // Zablokuj pola obliczane automatycznie
    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('shelfQuantity'), false);
    setControlEnabled(form.get('drawerModel'), false);
    setControlEnabled(form.get('height'), false);
    setControlEnabled(form.get('depth'), false);
  }

  /**
   * Przelicza height i depth na podstawie danych cascade segments.
   * height = cascadeLowerHeight + cascadeUpperHeight
   * depth  = cascadeUpperDepth (górny, głębszy segment — decyduje o głębokości do kalkulacji)
   */
  recalculateDimensions(form: FormGroup): void {
    const lowerHeight = form.get('cascadeLowerHeight')?.value ?? 400;
    const upperHeight = form.get('cascadeUpperHeight')?.value ?? 320;
    const upperDepth = form.get('cascadeUpperDepth')?.value ?? 400;
    form.patchValue({ height: lowerHeight + upperHeight, depth: upperDepth });
  }
}
