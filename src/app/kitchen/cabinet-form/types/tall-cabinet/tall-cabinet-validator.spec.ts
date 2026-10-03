import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { createSegmentFormGroup } from '../../model/segment-form-group';
import { SegmentType } from '../../model/segment.model';
import { TallCabinetValidator } from './tall-cabinet-validator';

describe('TallCabinetValidator — walidatory pól segmentu', () => {
  const fb = new FormBuilder();

  function tallForm(...segments: FormGroup[]): FormGroup {
    return fb.group({ width: [600], height: [2000], depth: [560], segments: new FormArray(segments) });
  }

  it('zmiana szuflad na drzwi nie zostawia wymaganej liczby szuflad (walidatory nie były przeliczane)', () => {
    const drawers = createSegmentFormGroup(fb, {
      segmentType: SegmentType.DRAWER, height: 500, orderIndex: 0, drawerQuantity: 3
    });
    const form = tallForm(drawers);
    new TallCabinetValidator().validate(form);

    drawers.patchValue({ segmentType: SegmentType.DOOR, drawerQuantity: null, shelfQuantity: 0 });

    expect(drawers.get('drawerQuantity')!.valid).toBeTrue();
    expect(drawers.valid).toBeTrue();
  });

  it('zmiana drzwi na szuflady wymaga liczby szuflad z zakresu', () => {
    const door = createSegmentFormGroup(fb, { orderIndex: 0 });
    const form = tallForm(door);
    new TallCabinetValidator().validate(form);

    door.patchValue({ segmentType: SegmentType.DRAWER, drawerQuantity: null });

    expect(door.get('drawerQuantity')!.hasError('required')).toBeTrue();

    door.patchValue({ drawerQuantity: 3 });

    expect(door.get('drawerQuantity')!.valid).toBeTrue();
  });
});
