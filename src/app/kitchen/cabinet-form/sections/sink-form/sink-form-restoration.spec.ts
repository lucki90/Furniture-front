import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { KCabinetSink } from '../../../model/kitchen-state.model';
import { DictionaryService } from '../../../service/dictionary.service';
import { CabinetFormTypeLifecycleService } from '../../cabinet-form-type-lifecycle.service';
import { CabinetFormValidationErrorsService } from '../../cabinet-form-validation-errors.service';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { DEFAULT_MATERIAL_DEFAULTS } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { BaseSinkRequestMapper } from '../../types/base-sink/base-sink-request-mapper';
import { SinkFormComponent } from './sink-form.component';

describe('SinkFormComponent editing restoration', () => {
  let fixture: ComponentFixture<SinkFormComponent>;
  let form: FormGroup;
  let lifecycle: CabinetFormTypeLifecycleService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SinkFormComponent],
      providers: [FormBuilder, CabinetFormTypeLifecycleService,
        { provide: DictionaryService, useValue: { data: signal({ sinkFrontTypes: [], drawerModels: [] }) } },
        { provide: CabinetFormValidationErrorsService, useValue: { getControlError: () => null } }]
    }).compileComponents();
    lifecycle = TestBed.inject(CabinetFormTypeLifecycleService);
    form = DefaultKitchenFormFactory.create(TestBed.inject(FormBuilder));
    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_SINK);
    fixture = TestBed.createComponent(SinkFormComponent);
    fixture.componentRef.setInput('form', form);
  });

  function restore(frontType: string, width: number, apronEnabled = true) {
    const cabinet: KCabinetSink = {
      id: 'sink', type: KitchenCabinetType.BASE_SINK, openingType: 'HANDLE',
      width, height: 720, depth: 500, positionY: 0, shelfQuantity: 0,
      sinkFrontType: frontType, sinkApronEnabled: apronEnabled, sinkApronHeightMm: 150,
      sinkDrawerModel: 'LEGRABOX'
    };
    lifecycle.applyTypeChange(form, KitchenCabinetType.BASE_SINK, cabinet);
  }

  for (const [frontType, min, max, invalidWidth] of [
    ['ONE_DOOR', 450, 600, 900], ['TWO_DOORS', 600, 1000, 450], ['DRAWER', 450, 900, 1000]
  ] as const) {
    it(`restores ${frontType} constraints and drawer availability before and after section initialization`, () => {
      restore(frontType, min);
      expect(form.valid).toBeTrue();
      fixture.detectChanges();
      expect(form.valid).toBeTrue();
      expect(fixture.componentInstance.showSinkDrawerModel).toBe(frontType === 'DRAWER');
      expect(form.get('sinkDrawerModel')?.enabled).toBe(frontType === 'DRAWER');
      const modelSelect = fixture.nativeElement.querySelector('[formControlName="sinkDrawerModel"]');
      expect(!!modelSelect).toBe(frontType === 'DRAWER');
      form.get('width')?.setValue(max);
      expect(form.valid).toBeTrue();
      form.get('width')?.setValue(invalidWidth);
      expect(form.invalid).toBeTrue();
      form.get('width')?.setValue(min);
      const request = new BaseSinkRequestMapper().map(form.getRawValue(), DEFAULT_MATERIAL_DEFAULTS);
      expect(request.width).toBe(min);
      expect(request.sinkFrontType).toBe(frontType);
      if (frontType === 'DRAWER') {
        expect(request.drawerRequest).toEqual(jasmine.objectContaining({ drawerModel: 'LEGRABOX', drawerQuantity: 1 }));
      } else {
        expect(request.drawerRequest).toBeNull();
      }
    });
  }

  it('synchronizes a mounted section when another sink cabinet is restored without losing its saved values', () => {
    restore('DRAWER', 900);
    fixture.detectChanges();
    const section = fixture.componentInstance;
    restore('ONE_DOOR', 450, false);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBe(section);
    expect(form.valid).toBeTrue();
    expect(form.get('width')?.value).toBe(450);
    expect(form.get('sinkDrawerModel')?.disabled).toBeTrue();
    expect(form.get('sinkApronHeightMm')?.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[formControlName="sinkDrawerModel"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[formControlName="sinkApronHeightMm"]')).toBeNull();

    restore('DRAWER', 450);
    fixture.detectChanges();
    expect(form.valid).toBeTrue();
    expect(form.get('sinkDrawerModel')?.enabled).toBeTrue();
    expect(form.get('sinkDrawerModel')?.value).toBe('LEGRABOX');
    expect(form.get('sinkApronHeightMm')?.enabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[formControlName="sinkDrawerModel"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[formControlName="sinkApronHeightMm"]')).not.toBeNull();
  });
});
