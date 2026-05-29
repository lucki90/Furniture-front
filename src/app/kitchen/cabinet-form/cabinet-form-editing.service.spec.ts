import { TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder } from '@angular/forms';
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

  it('should load drawerLayoutType from edited BASE_WITH_DRAWERS cabinet (regression for layout reset bug)', () => {
    // Scenariusz: poprzednia szafka miala EQUAL, edytowana ma MIXED_LOW_TOP — formularz musi pokazac MIXED_LOW_TOP,
    // a nie zachowac EQUAL z poprzedniego stanu.
    const form = DefaultKitchenFormFactory.create(fb);
    form.patchValue({ drawerLayoutType: 'EQUAL' }); // simulate prior cabinet leftover

    service.patchFormForEditing(form, createBaseWithDrawersCabinet('MIXED_LOW_TOP'));

    expect(form.get('drawerLayoutType')?.value).toBe('MIXED_LOW_TOP');
  });

  it('should populate drawerCustomHeightsMm FormArray when editing CUSTOM layout cabinet', () => {
    const form = DefaultKitchenFormFactory.create(fb);
    const cabinet = createBaseWithDrawersCabinet('CUSTOM', [120, 200, 200, 200]);

    service.restoreAfterTypePrepared(form, cabinet);

    expect(form.get('drawerLayoutType')?.value).toBe('CUSTOM');
    const heightsArray = form.get('drawerCustomHeightsMm') as FormArray;
    expect(heightsArray.length).toBe(4);
    expect(heightsArray.value).toEqual([120, 200, 200, 200]);
  });

  it('should clear drawerCustomHeightsMm FormArray when editing non-CUSTOM cabinet', () => {
    const form = DefaultKitchenFormFactory.create(fb);
    // Pre-populate with stale custom heights (simulating leftover from previous cabinet edit)
    const heightsArray = form.get('drawerCustomHeightsMm') as FormArray;
    heightsArray.push(fb.control(100));
    heightsArray.push(fb.control(200));
    heightsArray.push(fb.control(300));

    service.restoreAfterTypePrepared(form, createBaseWithDrawersCabinet('EQUAL'));

    expect(form.get('drawerLayoutType')?.value).toBe('EQUAL');
    expect(heightsArray.length).toBe(0);
  });

  it('should default drawerLayoutType to EQUAL when cabinet has no value set (legacy)', () => {
    const form = DefaultKitchenFormFactory.create(fb);
    form.patchValue({ drawerLayoutType: 'CUSTOM' });

    // Legacy cabinet bez pola drawerLayoutType (np. zapisany przed wprowadzeniem feature)
    const legacyCabinet = {
      id: 'legacy',
      type: KitchenCabinetType.BASE_WITH_DRAWERS,
      openingType: 'HANDLE',
      width: 600, height: 720, depth: 510,
      positionY: 0, shelfQuantity: 0,
      drawerQuantity: 3,
      drawerModel: 'ANTARO_TANDEMBOX'
    } as unknown as KitchenCabinet;

    service.patchFormForEditing(form, legacyCabinet);

    expect(form.get('drawerLayoutType')?.value).toBe('EQUAL');
  });

  it('should infer blind-panel split from persisted visible width when legacy corner cabinet has no explicit flag', () => {
    const form = DefaultKitchenFormFactory.create(fb);

    service.patchFormForEditing(form, {
      id: 'corner-legacy',
      type: KitchenCabinetType.CORNER_CABINET,
      openingType: 'HANDLE' as any,
      width: 1000,
      height: 720,
      depth: 510,
      positionY: 0,
      shelfQuantity: 0,
      cornerWidthA: 1000,
      cornerMechanism: 'BLIND_CORNER',
      cornerFrontUchylnyWidthMm: 500,
      blindPanelVisibleWidthMm: 180
    } as unknown as KitchenCabinet);

    expect(form.get('blindPanelSplitEnabled')?.value).toBeTrue();
    expect(form.get('blindPanelVisibleWidthMm')?.value).toBe(180);
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

function createBaseWithDrawersCabinet(
  layout: 'EQUAL' | 'MIXED_LOW_TOP' | 'CUSTOM',
  customHeights?: number[]
): KitchenCabinet {
  return {
    id: 'cab-bwd',
    type: KitchenCabinetType.BASE_WITH_DRAWERS,
    name: 'Z szufladami',
    openingType: 'HANDLE' as any,
    width: 600,
    height: 720,
    depth: 510,
    positionY: 0,
    shelfQuantity: 0,
    drawerQuantity: customHeights?.length ?? 3,
    drawerModel: 'ANTARO_TANDEMBOX',
    drawerLayoutType: layout,
    drawerCustomHeightsMm: customHeights
  } as unknown as KitchenCabinet;
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
