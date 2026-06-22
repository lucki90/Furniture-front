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
    const segment = service.createDefaultSegment(2);

    expect(segment.getRawValue()).toEqual({
      segmentType: SegmentType.DOOR,
      height: 400,
      orderIndex: 2,
      drawerQuantity: null,
      drawerModel: null,
      shelfQuantity: 0,
      frontType: 'ONE_DOOR',
      ovenHeightType: null
    });
  });

  it('should replace all segments from saved data', () => {
    const segmentsArray = new FormArray([
      service.createDefaultSegment(0)
    ]);

    service.replaceSegments(segmentsArray, [
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
      service.createDefaultSegment(0),
      service.createDefaultSegment(1),
      service.createDefaultSegment(2)
    ]);

    service.removeSegment(segmentsArray, 1);

    expect(segmentsArray.length).toBe(2);
    expect(segmentsArray.at(0).get('orderIndex')?.value).toBe(0);
    expect(segmentsArray.at(1).get('orderIndex')?.value).toBe(1);
  });

  it('should return selected segment form only for a valid index', () => {
    const segmentsArray = new FormArray([
      service.createDefaultSegment(0)
    ]);

    expect(service.getSelectedSegmentForm(segmentsArray, 0)).toBe(segmentsArray.at(0));
    expect(service.getSelectedSegmentForm(segmentsArray, -1)).toBeNull();
    expect(service.getSelectedSegmentForm(segmentsArray, 2)).toBeNull();
  });

  describe('syncDrawerCustomHeights', () => {
    it('powinien dodać brakujące kontrolki do pustej tablicy', () => {
      const arr = new FormArray<any>([]);
      service.syncDrawerCustomHeights(arr, 3);
      expect(arr.length).toBe(3);
      expect(arr.at(0).value).toBeNull();
    });

    it('powinien usunąć nadmiarowe kontrolki', () => {
      const arr = new FormArray([fb.control(100), fb.control(200), fb.control(300)]);
      service.syncDrawerCustomHeights(arr, 2);
      expect(arr.length).toBe(2);
    });

    it('powinien nie zmieniać tablicy gdy rozmiar jest już równy qty', () => {
      const arr = new FormArray([fb.control(100), fb.control(200)]);
      service.syncDrawerCustomHeights(arr, 2);
      expect(arr.length).toBe(2);
      expect(arr.at(0).value).toBe(100);
    });

    it('powinien obsłużyć ujemną wartość qty bez zapętlenia (clamp do 0)', () => {
      const arr = new FormArray([fb.control(100), fb.control(200)]);
      service.syncDrawerCustomHeights(arr, -1);
      expect(arr.length).toBe(0);
    });

    it('powinien obsłużyć NaN bez zapętlenia (clamp do 0)', () => {
      const arr = new FormArray([fb.control(100)]);
      service.syncDrawerCustomHeights(arr, NaN);
      expect(arr.length).toBe(0);
    });

    it('powinien obsłużyć Infinity bez zapętlenia (clamp do 0)', () => {
      const arr = new FormArray([fb.control(100)]);
      service.syncDrawerCustomHeights(arr, Infinity);
      expect(arr.length).toBe(0);
    });

    it('powinien ograniczyć qty powyżej maksimum do MAX_DRAWER_CUSTOM_HEIGHTS', () => {
      const arr = new FormArray<any>([]);
      service.syncDrawerCustomHeights(arr, 999);
      expect(arr.length).toBe(6);
    });

    it('powinien zaokrąglić ułamkową liczbę szuflad do liczby całkowitej', () => {
      const arr = new FormArray<any>([]);
      service.syncDrawerCustomHeights(arr, 2.4);
      expect(arr.length).toBe(2);
    });
  });

  describe('getCustomHeightsTotalWarning', () => {
    it('powinien zwrócić null gdy układ nie jest CUSTOM', () => {
      expect(service.getCustomHeightsTotalWarning('EQUAL', 3, 720, [200, 200, 200])).toBeNull();
    });

    it('powinien zwrócić null dla ułamkowej liczby szuflad, którą obsługuje walidator pola', () => {
      expect(service.getCustomHeightsTotalWarning('CUSTOM', 2.4, 720, [300, 300])).toBeNull();
    });

    it('powinien zwrócić komunikat gdy brak wartości szuflady', () => {
      const result = service.getCustomHeightsTotalWarning('CUSTOM', 3, 720, [200, null, 200]);
      expect(result).toContain('Wpisz 3 wysokości');
    });

    it('powinien zwrócić null gdy suma jest poprawna (tolerancja ±1mm)', () => {
      // H=720, 3 szuflady: expectedSum = 720 - 6 - 6 = 708; heights 236+236+236=708
      expect(service.getCustomHeightsTotalWarning('CUSTOM', 3, 720, [236, 236, 236])).toBeNull();
    });

    it('powinien zwrócić komunikat gdy suma odbiega o więcej niż 1mm', () => {
      // expectedSum = 720 - 2×3 - 2×3 = 708; actualSum = 600; diff = +108
      const result = service.getCustomHeightsTotalWarning('CUSTOM', 3, 720, [200, 200, 200]);
      expect(result).toContain('708');
      expect(result).toContain('600');
      expect(result).toContain('+108');
    });
  });
});
