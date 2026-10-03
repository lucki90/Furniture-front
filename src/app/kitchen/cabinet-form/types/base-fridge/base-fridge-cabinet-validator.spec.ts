import { FormArray, FormBuilder } from '@angular/forms';
import { BaseFridgeCabinetValidator } from './base-fridge-cabinet-validator';
import { CABINET_FORM_MESSAGES } from '../../cabinet-form-validation-messages';

describe('BaseFridgeCabinetValidator fridge section', () => {
  const fb = new FormBuilder();
  const validator = new BaseFridgeCabinetValidator();

  function formFor(upperTotal: number, sectionType = 'TWO_DOORS') {
    return fb.group({ width: 600, height: 2000, depth: 560,
      fridgeSectionType: sectionType, lowerFrontHeightMm: 713,
      segments: fb.array([fb.group({ height: upperTotal / 2 }),
        fb.group({ height: upperTotal / 2 })]) });
  }

  for (const upperTotal of [1200, 1178]) {
    it(`rejects upper sections totaling ${upperTotal} mm when the upper fridge front is below 100 mm`, () => {
      const form = formFor(upperTotal);
      expect(validator.getUpperSectionsError(form, CABINET_FORM_MESSAGES.pl)).not.toBeNull();
    });
  }

  it('accepts the 100 mm nominal front boundary including the existing gaps', () => {
    expect(validator.getUpperSectionsError(formFor(1177), CABINET_FORM_MESSAGES.pl)).toBeNull();
  });

  it('updates the error after resizing an upper section', () => {
    const form = formFor(1000);
    expect(validator.getUpperSectionsError(form, CABINET_FORM_MESSAGES.pl)).toBeNull();
    (form.get('segments') as FormArray).at(0).get('height')?.setValue(700);
    expect(validator.getUpperSectionsError(form, CABINET_FORM_MESSAGES.pl)).not.toBeNull();
  });

  it('keeps one-door and unsegmented fridges valid', () => {
    expect(validator.getUpperSectionsError(formFor(1200, 'ONE_DOOR'), CABINET_FORM_MESSAGES.pl)).toBeNull();
    const form = formFor(0);
    (form.get('segments') as FormArray).clear();
    expect(validator.getUpperSectionsError(form, CABINET_FORM_MESSAGES.pl)).toBeNull();
  });
});
