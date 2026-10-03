import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DictionaryService } from '../../../service/dictionary.service';
import { KCabinetCooktop } from '../../../model/kitchen-state.model';
import { CabinetFormTypeLifecycleService } from '../../cabinet-form-type-lifecycle.service';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { DEFAULT_MATERIAL_DEFAULTS } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { BaseCooktopRequestMapper } from '../../types/base-cooktop/base-cooktop-request-mapper';
import { CooktopFormComponent } from './cooktop-form.component';

describe('CooktopFormComponent editing restoration', () => {
  let fixture: ComponentFixture<CooktopFormComponent>;
  let form: FormGroup;
  let lifecycle: CabinetFormTypeLifecycleService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CooktopFormComponent],
      providers: [FormBuilder, CabinetFormTypeLifecycleService,
        { provide: DictionaryService, useValue: { data: signal({
          cooktopTypes: [], cooktopFrontTypes: [], drawerModels: []
        }) } }]
    }).compileComponents();
    lifecycle = TestBed.inject(CabinetFormTypeLifecycleService);
    form = DefaultKitchenFormFactory.create(TestBed.inject(FormBuilder));
    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_COOKTOP);
    fixture = TestBed.createComponent(CooktopFormComponent);
    fixture.componentRef.setInput('form', form);
  });

  function restore(frontType: string, quantity = 0, cooktopType = 'INDUCTION') {
    const cabinet: KCabinetCooktop = {
      id: 'cooktop', type: KitchenCabinetType.BASE_COOKTOP, openingType: 'HANDLE',
      width: 600, height: 720, depth: 560, positionY: 0, shelfQuantity: 0,
      cooktopType, cooktopFrontType: frontType, drawerQuantity: quantity, drawerModel: 'ANTARO_TANDEMBOX'
    };
    lifecycle.applyTypeChange(form, KitchenCabinetType.BASE_COOKTOP, cabinet);
  }

  for (const cooktopType of ['GAS', 'INDUCTION']) {
    for (const frontType of ['ONE_DOOR', 'TWO_DOORS']) {
      it(`hides and disables drawer fields when restoring ${cooktopType} with ${frontType}`, () => {
        restore(frontType, 0, cooktopType);
        fixture.detectChanges();

        expect(fixture.componentInstance.showDrawerOptions).toBeFalse();
        expect(form.get('drawerQuantity')?.disabled).toBeTrue();
        expect(form.get('drawerModel')?.disabled).toBeTrue();
        expect(fixture.nativeElement.querySelector('[formControlName="drawerQuantity"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('[formControlName="drawerModel"]')).toBeNull();
        expect(form.valid).toBeTrue();
        expect(form.getRawValue().drawerQuantity).toBe(0);
        const request = new BaseCooktopRequestMapper().map(form.getRawValue(), DEFAULT_MATERIAL_DEFAULTS);
        expect(request.cooktopFrontType).toBe(frontType);
        expect(request.cooktopType).toBe(cooktopType);
        expect(request.drawerRequest).toBeNull();
      });
    }
  }

  it('shows restored drawers and preserves the saved quantity and model in the request', () => {
    restore('DRAWERS', 2);
    fixture.detectChanges();

    expect(fixture.componentInstance.showDrawerOptions).toBeTrue();
    expect(form.get('drawerQuantity')?.enabled).toBeTrue();
    expect(form.get('drawerModel')?.enabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[formControlName="drawerQuantity"]')).not.toBeNull();
    expect(form.valid).toBeTrue();
    const request = new BaseCooktopRequestMapper().map(form.getRawValue(), DEFAULT_MATERIAL_DEFAULTS);
    expect(request.drawerRequest).toEqual(jasmine.objectContaining({
      drawerQuantity: 2, drawerModel: 'ANTARO_TANDEMBOX'
    }));
  });

  it('enables drawer validation on switching to drawers and unblocks the form on switching back to doors', () => {
    restore('TWO_DOORS', 0);
    fixture.detectChanges();
    form.get('cooktopFrontType')?.setValue('DRAWERS');
    fixture.detectChanges();
    expect(form.get('drawerQuantity')?.enabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[formControlName="drawerQuantity"]')).not.toBeNull();

    for (const quantity of [0, 1, 4, 2.5, null]) {
      form.get('drawerQuantity')?.setValue(quantity);
      expect(form.invalid).withContext(String(quantity)).toBeTrue();
    }
    for (const quantity of [2, 3]) {
      form.get('drawerQuantity')?.setValue(quantity);
      expect(form.valid).withContext(String(quantity)).toBeTrue();
    }
    form.get('drawerQuantity')?.setValue(1);
    form.get('cooktopFrontType')?.setValue('ONE_DOOR');
    fixture.detectChanges();
    expect(form.valid).toBeTrue();
    expect(form.get('drawerQuantity')?.disabled).toBeTrue();
    expect(form.getRawValue().drawerQuantity).toBe(1);
    expect(fixture.nativeElement.querySelector('[formControlName="drawerQuantity"]')).toBeNull();
  });

  it('updates a mounted section when restoring another cooktop cabinet without recreating the component', () => {
    restore('DRAWERS', 3);
    fixture.detectChanges();
    const section = fixture.componentInstance;

    restore('TWO_DOORS');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBe(section);
    expect(section.showDrawerOptions).toBeFalse();
    expect(form.get('drawerQuantity')?.disabled).toBeTrue();
    expect(form.get('drawerModel')?.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[formControlName="drawerQuantity"]')).toBeNull();

    restore('DRAWERS', 2);
    fixture.detectChanges();
    expect(section.showDrawerOptions).toBeTrue();
    expect(form.get('drawerQuantity')?.enabled).toBeTrue();
    expect(form.get('drawerQuantity')?.value).toBe(2);
    expect(fixture.nativeElement.querySelector('[formControlName="drawerQuantity"]')).not.toBeNull();
    expect(form.valid).toBeTrue();
  });
});
