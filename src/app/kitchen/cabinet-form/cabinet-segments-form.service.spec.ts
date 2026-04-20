import { TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder } from '@angular/forms';
import { CabinetSegmentsFormService } from './cabinet-segments-form.service';
import { SegmentType } from './model/segment.model';

describe('CabinetSegmentsFormService', () => {
  let service: CabinetSegmentsFormService;
  let fb: FormBuilder;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CabinetSegmentsFormService, FormBuilder]
    });

    service = TestBed.inject(CabinetSegmentsFormService);
    fb = TestBed.inject(FormBuilder);
  });

  it('should create a default segment with expected defaults', () => {
    const segment = service.createDefaultSegment(fb, 2);

    expect(segment.getRawValue()).toEqual({
      segmentType: SegmentType.DOOR,
      height: 400,
      orderIndex: 2,
      drawerQuantity: null,
      drawerModel: null,
      shelfQuantity: 0,
      frontType: 'ONE_DOOR'
    });
  });

  it('should replace all segments from saved data', () => {
    const segmentsArray = new FormArray([
      service.createDefaultSegment(fb, 0)
    ]);

    service.replaceSegments(fb, segmentsArray, [
      {
        segmentType: SegmentType.OPEN_SHELF,
        height: 500,
        orderIndex: 0,
        shelfQuantity: 2,
        frontType: null
      } as any,
      {
        segmentType: SegmentType.DOOR,
        height: 600,
        orderIndex: 1,
        drawerQuantity: 3,
        drawerModel: 'ANTARO',
        frontType: 'TWO_DOOR'
      } as any
    ]);

    expect(segmentsArray.length).toBe(2);
    expect(segmentsArray.at(0).getRawValue()).toEqual(jasmine.objectContaining({
      segmentType: SegmentType.OPEN_SHELF,
      height: 500,
      orderIndex: 0,
      shelfQuantity: 2
    }));
    expect(segmentsArray.at(1).getRawValue()).toEqual(jasmine.objectContaining({
      segmentType: SegmentType.DOOR,
      height: 600,
      orderIndex: 1,
      drawerQuantity: 3,
      drawerModel: 'ANTARO'
    }));
  });

  it('should remove a segment and reindex the remaining ones', () => {
    const segmentsArray = new FormArray([
      service.createDefaultSegment(fb, 0),
      service.createDefaultSegment(fb, 1),
      service.createDefaultSegment(fb, 2)
    ]);

    service.removeSegment(segmentsArray, 1);

    expect(segmentsArray.length).toBe(2);
    expect(segmentsArray.at(0).get('orderIndex')?.value).toBe(0);
    expect(segmentsArray.at(1).get('orderIndex')?.value).toBe(1);
  });

  it('should return selected segment form only for a valid index', () => {
    const segmentsArray = new FormArray([
      service.createDefaultSegment(fb, 0)
    ]);

    expect(service.getSelectedSegmentForm(segmentsArray, 0)).toBe(segmentsArray.at(0));
    expect(service.getSelectedSegmentForm(segmentsArray, -1)).toBeNull();
    expect(service.getSelectedSegmentForm(segmentsArray, 2)).toBeNull();
  });
});
