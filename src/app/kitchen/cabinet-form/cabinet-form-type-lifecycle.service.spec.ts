import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { CabinetFormEditingService } from './cabinet-form-editing.service';
import { CabinetFormTypeLifecycleService } from './cabinet-form-type-lifecycle.service';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';

describe('CabinetFormTypeLifecycleService', () => {
  let service: CabinetFormTypeLifecycleService;
  let editingService: jasmine.SpyObj<CabinetFormEditingService>;
  let fb: FormBuilder;

  beforeEach(() => {
    editingService = jasmine.createSpyObj<CabinetFormEditingService>('CabinetFormEditingService', [
      'restoreAfterTypePrepared'
    ]);

    TestBed.configureTestingModule({
      providers: [
        CabinetFormTypeLifecycleService,
        FormBuilder,
        { provide: CabinetFormEditingService, useValue: editingService }
      ]
    });

    service = TestBed.inject(CabinetFormTypeLifecycleService);
    fb = TestBed.inject(FormBuilder);
  });

  it('should create fully reset base visibility with opening type enabled', () => {
    expect(service.createBaseVisibility()).toEqual(jasmine.objectContaining({
      width: false,
      drawerQuantity: false,
      drawerModel: false,
      cargoBrand: false,
      segments: false,
      enclosureSection: false,
      openingType: true
    }));
  });

  it('should prepare a type without restore when not editing', () => {
    const form = DefaultKitchenFormFactory.create(fb);

    const result = service.applyTypeChange(form, KitchenCabinetType.BASE_ONE_DOOR, null);

    expect(result.restoreApplied).toBeFalse();
    expect(result.visibility.width).toBeTrue();
    expect(result.visibility.enclosureSection).toBeTrue();
    expect(editingService.restoreAfterTypePrepared).not.toHaveBeenCalled();
  });

  it('should prepare BASE_CARGO with cargo-specific visibility', () => {
    const form = DefaultKitchenFormFactory.create(fb);

    const result = service.applyTypeChange(form, KitchenCabinetType.BASE_CARGO, null);

    expect(result.visibility.cargoVariant).toBeTrue();
    expect(result.visibility.cargoWidthSelect).toBeTrue();
    expect(result.visibility.cargoBrand).toBeTrue();
    expect(result.visibility.drawerQuantity).toBeTrue();
    expect(result.visibility.drawerModel).toBeTrue();
    expect(result.visibility.width).toBeFalse();
    expect(result.visibility.enclosureSection).toBeTrue();
    expect(form.get('cargoVariant')?.value).toBe('MECHANISM');
    expect(form.get('cargoBrand')?.value).toBe('BLUM');
    expect(form.get('drawerQuantity')?.value).toBe(3);
    expect(form.get('drawerModel')?.value).toBeNull();
    expect(form.get('width')?.value).toBe(300);
  });

  it('should restore editing state when cabinet type matches', () => {
    const form = DefaultKitchenFormFactory.create(fb);
    const cabinet = { type: KitchenCabinetType.BASE_FRIDGE } as any;

    const result = service.applyTypeChange(form, KitchenCabinetType.BASE_FRIDGE, cabinet);

    expect(result.restoreApplied).toBeTrue();
    expect(result.visibility.fridgeSectionType).toBeTrue();
    expect(editingService.restoreAfterTypePrepared).toHaveBeenCalledWith(form, cabinet);
  });
});
