import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { CabinetSegmentsFormService } from './cabinet-segments-form.service';
import { CabinetFormEditingService } from './cabinet-form-editing.service';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { SegmentType } from './model/segment.model';

describe('CabinetFormEditingService', () => {
  let service: CabinetFormEditingService;
  let fb: FormBuilder;
  let segmentsFormService: jasmine.SpyObj<CabinetSegmentsFormService>;

  beforeEach(() => {
    segmentsFormService = jasmine.createSpyObj<CabinetSegmentsFormService>('CabinetSegmentsFormService', ['replaceSegments']);

    TestBed.configureTestingModule({
      providers: [
        CabinetFormEditingService,
        FormBuilder,
        { provide: CabinetSegmentsFormService, useValue: segmentsFormService }
      ]
    });

    service = TestBed.inject(CabinetFormEditingService);
    fb = TestBed.inject(FormBuilder);
  });

  it('should patch the full editing state including type-specific fields', () => {
    const form = DefaultKitchenFormFactory.create(fb);

    service.patchFormForEditing(form, createCascadeCabinet());

    expect(form.get('kitchenCabinetType')?.value).toBe(KitchenCabinetType.UPPER_CASCADE);
    expect(form.get('name')?.value).toBe('Kaskada');
    expect(form.get('cascadeLowerHeight')?.value).toBe(450);
    expect(form.get('cascadeLowerIsLiftUp')?.value).toBeTrue();
    expect(form.get('cascadeLowerIsFrontExtended')?.value).toBeTrue();
    expect(form.get('cascadeUpperIsLiftUp')?.value).toBeTrue();
    expect(form.get('leftEnclosureType')?.value).toBe('SIDE_PLATE_WITH_PLINTH');
  });

  it('should restore values after prepare and replace saved segments', () => {
    const form = DefaultKitchenFormFactory.create(fb);
    const cabinet = createTallCabinet();

    form.patchValue({
      width: 999,
      height: 999,
      openingType: 'TIP_ON'
    });

    service.restoreAfterTypePrepared(form, cabinet);

    expect(form.get('kitchenCabinetType')?.value).toBe(KitchenCabinetType.BASE_ONE_DOOR);
    expect(form.get('width')?.value).toBe(600);
    expect(form.get('height')?.value).toBe(2200);
    expect(form.get('openingType')?.value).toBe('HANDLE');
    expect(segmentsFormService.replaceSegments).toHaveBeenCalledWith(
      fb,
      form.get('segments') as any,
      cabinet.segments
    );
  });
});

function createCascadeCabinet(): KitchenCabinet {
  return {
    id: 'cab-1',
    type: KitchenCabinetType.UPPER_CASCADE,
    name: 'Kaskada',
    openingType: 'HANDLE' as any,
    width: 800,
    height: 720,
    depth: 320,
    positionY: 1400,
    shelfQuantity: 2,
    cascadeLowerHeight: 450,
    cascadeLowerDepth: 420,
    cascadeUpperHeight: 300,
    cascadeUpperDepth: 280,
    cascadeLowerIsLiftUp: true,
    cascadeLowerIsFrontExtended: true,
    cascadeUpperIsLiftUp: true,
    leftEnclosureType: 'SIDE_PLATE_WITH_PLINTH',
    rightEnclosureType: 'NONE',
    leftSupportPlate: false,
    rightSupportPlate: false
  } as KitchenCabinet;
}

function createTallCabinet(): any {
  return {
    id: 'cab-2',
    type: KitchenCabinetType.TALL_CABINET,
    openingType: 'HANDLE',
    width: 600,
    height: 2200,
    depth: 560,
    positionY: 0,
    shelfQuantity: 4,
    segments: [
      { segmentType: SegmentType.DOOR, height: 700, orderIndex: 0 },
      { segmentType: SegmentType.OPEN_SHELF, height: 500, orderIndex: 1 }
    ]
  };
}
