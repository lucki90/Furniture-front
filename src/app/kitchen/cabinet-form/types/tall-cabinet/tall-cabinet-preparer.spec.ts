import { FormArray, FormBuilder } from '@angular/forms';
import { SegmentType } from '../../model/segment.model';
import { TallCabinetPreparer } from './tall-cabinet-preparer';

describe('TallCabinetPreparer — domyślny słupek', () => {
  it('drzwi na górze, szuflady na dole (szuflady na wysokości 1,5–2 m były niewygodne)', () => {
    const form = new FormBuilder().group({
      width: [null], height: [null], depth: [null], shelfQuantity: [null], drawerQuantity: [null],
      drawerModel: [null], segments: new FormArray([])
    });

    new TallCabinetPreparer().prepare(form, {} as never);

    const segments = (form.get('segments') as FormArray).getRawValue();
    expect(segments.map(segment => [segment.segmentType, segment.height, segment.orderIndex])).toEqual([
      [SegmentType.DOOR, 1500, 0],
      [SegmentType.DRAWER, 500, 1]
    ]);
    expect(segments[1].drawerQuantity).toBe(3);
    expect(Object.keys(segments[0])).toContain('liftMechanismType');
  });
});
