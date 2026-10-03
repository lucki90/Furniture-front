import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CabinetFormEditingService } from './cabinet-form-editing.service';
import { CabinetFormTypeLifecycleService } from './cabinet-form-type-lifecycle.service';
import { CabinetSegmentsFormService } from './cabinet-segments-form.service';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { CornerMechanismType } from './model/corner-cabinet.model';
import { CabinetFormVisibility } from './type-config/preparer/cabinet-form-visibility';
import { DEFAULT_MATERIAL_DEFAULTS } from './type-config/request-mapper/kitchen-cabinet-request-mapper';
import { UpperHoodRequestMapper } from './types/upper-hood/upper-hood-request-mapper';
import { KCabinetHood } from '../model/kitchen-state.model';

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

  it('does not carry oven apron errors into a standard base cabinet', () => {
    const form = DefaultKitchenFormFactory.create(fb);
    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_OVEN);
    service.applyTypeChange(form, KitchenCabinetType.BASE_OVEN, null);
    form.get('ovenApronHeightMm')?.enable();
    form.patchValue({ ovenApronEnabled: true, ovenApronHeightMm: 20 });
    expect(form.invalid).toBeTrue();

    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_ONE_DOOR);
    service.applyTypeChange(form, KitchenCabinetType.BASE_ONE_DOOR, null);
    expect(form.get('ovenApronHeightMm')?.errors).toBeNull();
    expect(form.valid).toBeTrue();
  });

  it('revalidates restored oven dimensions against the restored height type and apron', () => {
    const form = DefaultKitchenFormFactory.create(fb);
    const cabinet = { type: KitchenCabinetType.BASE_OVEN } as any;
    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_OVEN);
    editingService.restoreAfterTypePrepared.and.callFake(restoredForm => {
      restoredForm.patchValue({ height: 650, ovenHeightType: 'COMPACT',
        ovenApronEnabled: false }, { emitEvent: false });
    });
    service.applyTypeChange(form, KitchenCabinetType.BASE_OVEN, cabinet);
    expect(form.valid).toBeTrue();
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

describe('CabinetFormTypeLifecycleService — odtwarzanie blendy UPPER_HOOD przed montażem sekcji', () => {
  let service: CabinetFormTypeLifecycleService;
  let editingService: CabinetFormEditingService;
  let fb: FormBuilder;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        // UPPER_HOOD nie ma segmentów — serwis segmentów nie jest używany przy odtwarzaniu okapu.
        { provide: CabinetSegmentsFormService, useValue: jasmine.createSpyObj('CabinetSegmentsFormService', ['replaceSegments']) }
      ]
    });

    service = TestBed.inject(CabinetFormTypeLifecycleService);
    editingService = TestBed.inject(CabinetFormEditingService);
    fb = TestBed.inject(FormBuilder);
  });

  function hoodCabinet(overrides: Partial<KCabinetHood> = {}): KCabinetHood {
    return {
      id: 'hood-1',
      type: KitchenCabinetType.UPPER_HOOD,
      width: 600,
      height: 500,
      depth: 350,
      positionY: 0,
      openingType: 'HANDLE',
      shelfQuantity: 0,
      hoodFrontType: 'FLAP',
      hoodScreenEnabled: false,
      hoodScreenHeightMm: 100,
      ...overrides
    };
  }

  /** Ta sama ścieżka co CabinetFormComponent.fillFormWithCabinet(): patch bez zdarzeń + lifecycle typu. */
  function restore(form: FormGroup, cabinet: KCabinetHood): void {
    editingService.patchFormForEditing(form, cabinet);
    service.applyTypeChange(form, cabinet.type, cabinet);
  }

  it('włącza wysokość odtworzonej blendy i zgłasza błąd dla 10 mm jeszcze przed montażem sekcji', () => {
    const form = DefaultKitchenFormFactory.create(fb);

    restore(form, hoodCabinet({ hoodScreenEnabled: true, hoodScreenHeightMm: 10 }));

    const heightCtrl = form.get('hoodScreenHeightMm')!;
    expect(form.get('hoodScreenEnabled')?.value).toBeTrue();
    expect(heightCtrl.enabled).toBeTrue();
    expect(heightCtrl.hasError('outOfRange')).toBeTrue();
    expect(form.valid).toBeFalse();
  });

  it('przyjmuje odtworzoną blendę 100 mm jako prawidłową', () => {
    const form = DefaultKitchenFormFactory.create(fb);

    restore(form, hoodCabinet({ hoodScreenEnabled: true, hoodScreenHeightMm: 100 }));

    expect(form.get('hoodScreenHeightMm')?.enabled).toBeTrue();
    expect(form.get('hoodScreenHeightMm')?.errors).toBeNull();
    expect(form.valid).toBeTrue();
  });

  for (const [heightMm, valid] of [[49, false], [50, true], [200, true], [201, false]] as const) {
    it(`waliduje granicę odtworzonej blendy ${heightMm} mm jako ${valid ? 'prawidłową' : 'nieprawidłową'}`, () => {
      const form = DefaultKitchenFormFactory.create(fb);

      restore(form, hoodCabinet({ hoodScreenEnabled: true, hoodScreenHeightMm: heightMm }));

      expect(form.get('hoodScreenHeightMm')?.hasError('outOfRange')).toBe(!valid);
      expect(form.valid).toBe(valid);
    });
  }

  it('synchronizuje kolejne odtworzenia false → true → false w tym samym formularzu', () => {
    const form = DefaultKitchenFormFactory.create(fb);
    const heightCtrl = form.get('hoodScreenHeightMm')!;

    restore(form, hoodCabinet({ id: 'hood-1', hoodScreenEnabled: false, hoodScreenHeightMm: 100 }));
    expect(heightCtrl.disabled).toBeTrue();
    expect(form.valid).toBeTrue();

    restore(form, hoodCabinet({ id: 'hood-2', hoodScreenEnabled: true, hoodScreenHeightMm: 10 }));
    expect(heightCtrl.enabled).toBeTrue();
    expect(heightCtrl.hasError('outOfRange')).toBeTrue();
    expect(form.valid).toBeFalse();

    restore(form, hoodCabinet({ id: 'hood-3', hoodScreenEnabled: false, hoodScreenHeightMm: 10 }));
    expect(heightCtrl.disabled).toBeTrue();
    expect(heightCtrl.errors).toBeNull();
    expect(form.valid).toBeTrue();
    // Nieaktywna wysokość nie jest resetowana — zostaje w surowych danych, ale nie w form.value.
    expect(form.getRawValue().hoodScreenHeightMm).toBe(10);
    expect('hoodScreenHeightMm' in form.value).toBeFalse();
  });

  it('nie pozostawia aktywnej walidacji blendy po przejściu do innego typu szafki', () => {
    const form = DefaultKitchenFormFactory.create(fb);
    restore(form, hoodCabinet({ hoodScreenEnabled: true, hoodScreenHeightMm: 10 }));
    expect(form.valid).toBeFalse();

    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_ONE_DOOR);
    service.applyTypeChange(form, KitchenCabinetType.UPPER_ONE_DOOR, null);

    expect(form.get('hoodScreenHeightMm')?.errors).toBeNull();
    expect(form.valid).toBeTrue();
  });

  it('mapper wysyła 0 dla wyłączonej blendy i zapisaną wysokość dla włączonej', () => {
    const mapper = new UpperHoodRequestMapper();
    const form = DefaultKitchenFormFactory.create(fb);

    restore(form, hoodCabinet({ hoodScreenEnabled: false, hoodScreenHeightMm: 10 }));
    const disabledRequest = mapper.map(form.getRawValue(), DEFAULT_MATERIAL_DEFAULTS);
    expect(disabledRequest.hoodScreenEnabled).toBeFalse();
    expect(disabledRequest.hoodScreenHeightMm).toBe(0);

    restore(form, hoodCabinet({ id: 'hood-2', hoodScreenEnabled: true, hoodScreenHeightMm: 150 }));
    const enabledRequest = mapper.map(form.getRawValue(), DEFAULT_MATERIAL_DEFAULTS);
    expect(enabledRequest.hoodScreenEnabled).toBeTrue();
    expect(enabledRequest.hoodScreenHeightMm).toBe(150);
  });
});
