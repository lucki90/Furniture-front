import { FormBuilder } from '@angular/forms';
import { createSegmentFormGroup } from './segment-form-group';
import { SegmentType } from './segment.model';

describe('createSegmentFormGroup — jedna definicja pól segmentu', () => {
  const fb = new FormBuilder();

  it('nowy segment: drzwi z domyślną wysokością i wszystkimi polami AGD i klapy', () => {
    const group = createSegmentFormGroup(fb, { orderIndex: 2 });

    expect(group.getRawValue()).toEqual({
      segmentType: SegmentType.DOOR,
      height: 400,
      orderIndex: 2,
      drawerQuantity: null,
      drawerModel: null,
      shelfQuantity: 0,
      frontType: 'ONE_DOOR',
      ovenHeightType: null,
      microwaveType: null,
      dishwasherType: null,
      liftMechanismType: null
    });
  });

  it('segment z danych zachowuje typy AGD i podnośnik klapy', () => {
    const group = createSegmentFormGroup(fb, {
      segmentType: SegmentType.DOOR,
      height: 600,
      orderIndex: 0,
      frontType: 'UPWARDS' as never,
      liftMechanismType: 'AVENTOS_HK_TOP',
      microwaveType: 'M45',
      dishwasherType: 'W45'
    });

    expect(group.getRawValue()).toEqual(jasmine.objectContaining({
      frontType: 'UPWARDS', liftMechanismType: 'AVENTOS_HK_TOP', microwaveType: 'M45', dishwasherType: 'W45'
    }));
  });
});
