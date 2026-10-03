import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { KCabinetOven } from '../../../model/kitchen-state.model';
import { DictionaryService } from '../../../service/dictionary.service';
import { CabinetFormTypeLifecycleService } from '../../cabinet-form-type-lifecycle.service';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { DEFAULT_MATERIAL_DEFAULTS } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { BaseOvenRequestMapper } from '../../types/base-oven/base-oven-request-mapper';
import { OvenFormComponent } from './oven-form.component';

describe('OvenFormComponent editing restoration', () => {
  let fixture: ComponentFixture<OvenFormComponent>;
  let form: FormGroup;
  let lifecycle: CabinetFormTypeLifecycleService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OvenFormComponent], providers: [FormBuilder, CabinetFormTypeLifecycleService,
        { provide: DictionaryService, useValue: { data: signal({
          ovenHeightTypes: [], ovenLowerSectionTypes: [], drawerModels: []
        }) } }]
    }).compileComponents();
    lifecycle = TestBed.inject(CabinetFormTypeLifecycleService);
    form = DefaultKitchenFormFactory.create(TestBed.inject(FormBuilder));
    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_OVEN);
    fixture = TestBed.createComponent(OvenFormComponent);
    fixture.componentRef.setInput('form', form);
  });

  function restore(lowerSection: string, apronEnabled = false, apronHeight = 50) {
    const cabinet: KCabinetOven = {
      id: 'oven', type: KitchenCabinetType.BASE_OVEN, openingType: 'HANDLE',
      width: 600, height: 850, depth: 560, positionY: 0, shelfQuantity: 0,
      ovenHeightType: 'STANDARD', ovenLowerSectionType: lowerSection,
      ovenApronEnabled: apronEnabled, ovenApronHeightMm: apronHeight, drawerModel: 'LEGRABOX'
    };
    lifecycle.applyTypeChange(form, KitchenCabinetType.BASE_OVEN, cabinet);
  }

  for (const lowerSection of ['HINGED_DOOR', 'NONE']) {
    it(`hides and disables the drawer system for restored ${lowerSection}`, () => {
      restore(lowerSection);
      fixture.detectChanges();
      expect(fixture.componentInstance.showOvenDrawerModel).toBeFalse();
      expect(form.get('drawerModel')?.disabled).toBeTrue();
      expect(fixture.nativeElement.querySelector('[formControlName="drawerModel"]')).toBeNull();
      expect(form.valid).toBeTrue();
      const request = new BaseOvenRequestMapper().map(form.getRawValue(), DEFAULT_MATERIAL_DEFAULTS);
      expect(request.ovenLowerSectionType).toBe(lowerSection);
      expect(request.drawerRequest).toBeNull();
      expect(request.isCoveredWithCounterTop).toBeTrue();
    });
  }

  it('keeps the saved low drawer model instead of the preparer default', () => {
    restore('LOW_DRAWER');
    fixture.detectChanges();
    expect(form.get('drawerModel')?.enabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[formControlName="drawerModel"]')).not.toBeNull();
    const request = new BaseOvenRequestMapper().map(form.getRawValue(), DEFAULT_MATERIAL_DEFAULTS);
    expect(request.drawerRequest).toEqual(jasmine.objectContaining({ drawerModel: 'LEGRABOX', drawerQuantity: 1 }));
  });

  it('validates a restored enabled apron before rendering the section and parent save controls', () => {
    restore('LOW_DRAWER', true, 20);
    expect(form.get('ovenApronHeightMm')?.enabled).toBeTrue();
    expect(form.get('ovenApronHeightMm')?.hasError('outOfRange')).toBeTrue();
    expect(form.invalid).toBeTrue();
  });

  it('shows a restored enabled apron and rejects its invalid saved height until corrected', () => {
    restore('HINGED_DOOR', true, 20);
    fixture.detectChanges();
    expect(fixture.componentInstance.showOvenApronHeight).toBeTrue();
    expect(form.get('ovenApronHeightMm')?.enabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[formControlName="ovenApronHeightMm"]')).not.toBeNull();
    expect(form.get('ovenApronHeightMm')?.hasError('outOfRange')).toBeTrue();
    expect(form.invalid).toBeTrue();
    form.get('ovenApronHeightMm')?.setValue(50);
    expect(form.valid).toBeTrue();
    const request = new BaseOvenRequestMapper().map(form.getRawValue(), DEFAULT_MATERIAL_DEFAULTS);
    expect(request.ovenApronEnabled).toBeTrue();
    expect(request.ovenApronHeightMm).toBe(50);
  });

  it('ignores an inactive invalid apron and validates it when enabled', () => {
    restore('LOW_DRAWER', false, 20);
    fixture.detectChanges();
    expect(form.valid).toBeTrue();
    expect(fixture.nativeElement.querySelector('[formControlName="ovenApronHeightMm"]')).toBeNull();
    form.get('ovenApronEnabled')?.setValue(true);
    fixture.detectChanges();
    expect(form.invalid).toBeTrue();
    form.get('ovenApronEnabled')?.setValue(false);
    fixture.detectChanges();
    expect(form.valid).toBeTrue();
    expect(form.getRawValue().ovenApronHeightMm).toBe(20);
  });

  it('synchronizes a mounted section when another oven cabinet is restored', () => {
    restore('LOW_DRAWER');
    fixture.detectChanges();
    const section = fixture.componentInstance;
    restore('HINGED_DOOR', true, 100);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBe(section);
    expect(section.showOvenDrawerModel).toBeFalse();
    expect(section.showOvenApronHeight).toBeTrue();
    expect(form.get('drawerModel')?.disabled).toBeTrue();
    expect(form.get('ovenApronHeightMm')?.enabled).toBeTrue();
    expect(form.get('ovenApronHeightMm')?.value).toBe(100);
    expect(fixture.nativeElement.querySelector('[formControlName="drawerModel"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[formControlName="ovenApronHeightMm"]')).not.toBeNull();
    expect(form.valid).toBeTrue();

    restore('LOW_DRAWER');
    fixture.detectChanges();
    expect(form.get('drawerModel')?.enabled).toBeTrue();
    expect(form.get('drawerModel')?.value).toBe('LEGRABOX');
    expect(form.get('ovenApronHeightMm')?.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[formControlName="drawerModel"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[formControlName="ovenApronHeightMm"]')).toBeNull();
    expect(form.valid).toBeTrue();
  });

  it('preserves defaults when creating a new oven cabinet', () => {
    lifecycle.applyTypeChange(form, KitchenCabinetType.BASE_OVEN, null);
    fixture.detectChanges();
    expect(fixture.componentInstance.showOvenDrawerModel).toBeTrue();
    expect(fixture.componentInstance.showOvenApronHeight).toBeFalse();
    expect(form.get('drawerModel')?.value).toBe('ANTARO_TANDEMBOX');
    expect(form.valid).toBeTrue();
  });
});
