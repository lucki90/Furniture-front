import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { CabinetFormEditingService } from './cabinet-form-editing.service';
import { CabinetFormTypeLifecycleService } from './cabinet-form-type-lifecycle.service';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { CornerMechanismType } from './model/corner-cabinet.model';
import { CabinetFormVisibility } from './type-config/preparer/cabinet-form-visibility';

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

  describe('refreshCornerHangingVisibility', () => {
    let baseVisibility: CabinetFormVisibility;

    beforeEach(() => {
      baseVisibility = service.createBaseVisibility();
    });

    it('powinien włączyć opcje wiszącego ślepego narożnika gdy mechanizm BLIND_CORNER i isUpperCorner=true', () => {
      const form = DefaultKitchenFormFactory.create(fb);
      form.get('isUpperCorner')?.setValue(true, { emitEvent: false });

      const result = service.refreshCornerHangingVisibility(form, baseVisibility, CornerMechanismType.BLIND_CORNER);

      expect(result.positioningMode).toBeTrue();
      expect(result.gapFromCountertopMm).toBeTrue();
      expect(result.gapFromAnchorMm).toBeTrue();
      expect(result.extendedFront).toBeTrue();
      expect(result.liftUp).toBeFalse();
      expect(result.blockUpperAbove).toBeFalse();
    });

    it('powinien wyłączyć opcje wiszącej blendy gdy mechanizm BLIND_CORNER ale isUpperCorner=false', () => {
      const form = DefaultKitchenFormFactory.create(fb);
      form.get('isUpperCorner')?.setValue(false, { emitEvent: false });

      const result = service.refreshCornerHangingVisibility(form, baseVisibility, CornerMechanismType.BLIND_CORNER);

      expect(result.positioningMode).toBeFalse();
      expect(result.blockUpperAbove).toBeTrue();
    });

    it('powinien wyłączyć opcje wiszącej blendy gdy mechanizm nie jest BLIND_CORNER', () => {
      const form = DefaultKitchenFormFactory.create(fb);
      form.get('isUpperCorner')?.setValue(true, { emitEvent: false });

      const result = service.refreshCornerHangingVisibility(form, baseVisibility, CornerMechanismType.FIXED_SHELVES);

      expect(result.positioningMode).toBeFalse();
      expect(result.blockUpperAbove).toBeTrue();
    });

    it('powinien wstawić domyślne wartości pozycjonowania do formularza dla wiszącej blendy', () => {
      const form = DefaultKitchenFormFactory.create(fb);
      form.get('isUpperCorner')?.setValue(true, { emitEvent: false });

      service.refreshCornerHangingVisibility(form, baseVisibility, CornerMechanismType.BLIND_CORNER);

      expect(form.get('isLiftUp')?.value).toBeFalse();
    });
  });

  describe('refreshLiftMechanismDependentVisibility', () => {
    let baseVisibility: CabinetFormVisibility;

    beforeEach(() => {
      baseVisibility = service.createBaseVisibility();
    });

    it('powinien włączyć allowThirdLiftMechanism dla HK-S', () => {
      const form = DefaultKitchenFormFactory.create(fb);

      const result = service.refreshLiftMechanismDependentVisibility(form, baseVisibility, 'AVENTOS_HK_S');

      expect(result.allowThirdLiftMechanism).toBeTrue();
      expect(result.hfUpperFrontHeightMm).toBeFalse();
    });

    it('powinien włączyć allowThirdLiftMechanism i hfUpperFrontHeightMm dla HF top', () => {
      const form = DefaultKitchenFormFactory.create(fb);

      const result = service.refreshLiftMechanismDependentVisibility(form, baseVisibility, 'AVENTOS_HF_TOP');

      expect(result.allowThirdLiftMechanism).toBeTrue();
      expect(result.hfUpperFrontHeightMm).toBeTrue();
    });

    it('powinien wyłączyć obie opcje dla GAS_GTV i wyczyścić allowThirdLiftMechanism z formularza', () => {
      const form = DefaultKitchenFormFactory.create(fb);
      form.get('allowThirdLiftMechanism')?.setValue(true, { emitEvent: false });

      const result = service.refreshLiftMechanismDependentVisibility(form, baseVisibility, 'GAS_GTV');

      expect(result.allowThirdLiftMechanism).toBeFalse();
      expect(result.hfUpperFrontHeightMm).toBeFalse();
      expect(form.get('allowThirdLiftMechanism')?.value).toBeFalse();
    });

    it('powinien wyczyścić hfUpperFrontHeightMm z formularza przy zmianie na HK-S', () => {
      const form = DefaultKitchenFormFactory.create(fb);
      form.get('hfUpperFrontHeightMm')?.setValue(300, { emitEvent: false });

      service.refreshLiftMechanismDependentVisibility(form, baseVisibility, 'AVENTOS_HK_S');

      expect(form.get('hfUpperFrontHeightMm')?.value).toBeNull();
    });
  });
});
