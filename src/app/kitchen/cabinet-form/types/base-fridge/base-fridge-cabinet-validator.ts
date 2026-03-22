import { FormArray, FormGroup } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

/** Minimalna wysokość sekcji lodówki po odjęciu sekcji górnych (mm). */
const MIN_FRIDGE_SECTION_HEIGHT_MM = 400;

export class BaseFridgeCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const c = KitchenCabinetConstraints.BASE_FRIDGE;

    // Width
    const widthCtrl = form.get('width');
    if (widthCtrl) {
      const w = widthCtrl.value;
      if (w < c.WIDTH_MIN || w > c.WIDTH_MAX) {
        widthCtrl.setErrors({ outOfRange: true });
      } else {
        widthCtrl.setErrors(null);
      }
    }

    // Height
    const heightCtrl = form.get('height');
    if (heightCtrl) {
      const h = heightCtrl.value;
      if (h < c.HEIGHT_MIN || h > c.HEIGHT_MAX) {
        heightCtrl.setErrors({ outOfRange: true });
      } else {
        heightCtrl.setErrors(null);
      }
    }

    // Depth
    const depthCtrl = form.get('depth');
    if (depthCtrl) {
      const d = depthCtrl.value;
      if (d < c.DEPTH_MIN || d > c.DEPTH_MAX) {
        depthCtrl.setErrors({ outOfRange: true });
      } else {
        depthCtrl.setErrors(null);
      }
    }

    // lowerFrontHeightMm — tylko dla TWO_DOORS
    const sectionType: string = form.get('fridgeSectionType')?.value ?? 'TWO_DOORS';
    const lowerFrontCtrl = form.get('lowerFrontHeightMm');
    if (lowerFrontCtrl) {
      if (sectionType === 'TWO_DOORS') {
        const lf = lowerFrontCtrl.value;
        if (lf < c.LOWER_FRONT_MIN || lf > c.LOWER_FRONT_MAX) {
          lowerFrontCtrl.setErrors({ outOfRange: true });
        } else {
          lowerFrontCtrl.setErrors(null);
        }
      } else {
        lowerFrontCtrl.setErrors(null);
      }
    }
  }

  /**
   * Oblicza sumę wysokości sekcji górnych (segmentów nad lodówką).
   */
  getUpperSectionsHeightSum(form: FormGroup): number {
    const segmentsControl = form.get('segments');
    if (!(segmentsControl instanceof FormArray)) {
      return 0;
    }
    return segmentsControl.controls.reduce((sum, seg) => {
      return sum + (seg.get('height')?.value ?? 0);
    }, 0);
  }

  /**
   * Oblicza wysokość sekcji lodówki = całkowita - sekcje górne.
   */
  getFridgeSectionHeight(form: FormGroup): number {
    const totalHeight = form.get('height')?.value ?? 0;
    const upperSum = this.getUpperSectionsHeightSum(form);
    return totalHeight - upperSum;
  }

  /**
   * Zwraca błąd walidacji sekcji górnych, jeśli przekraczają dopuszczalną wysokość.
   * Zwraca null gdy poprawne, lub string z komunikatem błędu.
   */
  getUpperSectionsError(form: FormGroup): string | null {
    const segmentsControl = form.get('segments');
    if (!(segmentsControl instanceof FormArray) || segmentsControl.length === 0) {
      return null; // brak sekcji górnych — OK
    }

    const fridgeH = this.getFridgeSectionHeight(form);
    if (fridgeH < MIN_FRIDGE_SECTION_HEIGHT_MM) {
      const totalH = form.get('height')?.value ?? 0;
      const upperSum = this.getUpperSectionsHeightSum(form);
      return `Sekcje górne (${upperSum}mm) zbyt wysokie — sekcja lodówki wynosiłaby tylko ${fridgeH}mm (min. ${MIN_FRIDGE_SECTION_HEIGHT_MM}mm). Zmniejsz sekcje lub zwiększ wysokość szafki (${totalH}mm).`;
    }

    return null;
  }
}
