import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { AppLanguage, LanguageService } from '../../service/language.service';
import { CabinetSegmentValidationService } from './cabinet-segment-validation.service';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';

function makeLanguageStub(lang: AppLanguage): Partial<LanguageService> {
  return { lang: signal(lang).asReadonly() };
}

describe('CabinetSegmentValidationService', () => {
  let service: CabinetSegmentValidationService;
  let form: FormGroup;
  let fb: FormBuilder;

  function setup(lang: AppLanguage = 'pl'): void {
    TestBed.configureTestingModule({
      providers: [
        CabinetSegmentValidationService,
        { provide: LanguageService, useValue: makeLanguageStub(lang) },
      ],
    });
    service = TestBed.inject(CabinetSegmentValidationService);
    fb = new FormBuilder();
    form = DefaultKitchenFormFactory.create(fb);
  }

  beforeEach(() => {
    setup('pl');
  });

  it('validates tall cabinet dimensions and segments', () => {
    form.patchValue({
      kitchenCabinetType: KitchenCabinetType.TALL_CABINET,
      width: 20,
      height: 600,
      depth: 100
    });
    form.setControl('segments', fb.array([]));

    service.validate(form, KitchenCabinetType.TALL_CABINET);

    expect(form.get('width')?.invalid).toBeTrue();
    expect(form.get('height')?.invalid).toBeTrue();
    expect(form.get('depth')?.invalid).toBeTrue();
    expect(service.getSegmentHeightError(form, KitchenCabinetType.TALL_CABINET)).toBe('Dodaj co najmniej jeden segment.');
  });

  it('returns upper section error for built-in fridge when upper segments leave too little space', () => {
    form.patchValue({
      kitchenCabinetType: KitchenCabinetType.BASE_FRIDGE,
      width: 600,
      height: 1900,
      depth: 560
    });
    form.setControl('segments', new FormArray([
      fb.group({ height: [800] }),
      fb.group({ height: [750] })
    ]));

    expect(service.getSegmentHeightError(form, KitchenCabinetType.BASE_FRIDGE)).toContain('sekcja lodówki');
  });

  it('does nothing for non-segment cabinet types', () => {
    form.patchValue({
      kitchenCabinetType: KitchenCabinetType.BASE_ONE_DOOR,
      width: 600,
      height: 720,
      depth: 560
    });

    service.validate(form, KitchenCabinetType.BASE_ONE_DOOR);

    expect(service.getSegmentHeightError(form, KitchenCabinetType.BASE_ONE_DOOR)).toBeNull();
  });

  it('zwraca komunikat po angielsku gdy lang=en', () => {
    TestBed.resetTestingModule();
    setup('en');

    form.patchValue({
      kitchenCabinetType: KitchenCabinetType.TALL_CABINET,
      height: 2000,
      depth: 560,
    });
    form.setControl('segments', fb.array([]));

    expect(service.getSegmentHeightError(form, KitchenCabinetType.TALL_CABINET)).toBe('Add at least one segment.');
  });
});
