import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HoodFormComponent } from './hood-form.component';
import { DictionaryService } from '../../../service/dictionary.service';
import { CabinetFormEditingService } from '../../cabinet-form-editing.service';
import { CabinetFormTypeLifecycleService } from '../../cabinet-form-type-lifecycle.service';
import { CabinetSegmentsFormService } from '../../cabinet-segments-form.service';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { KCabinetHood } from '../../../model/kitchen-state.model';

describe('HoodFormComponent', () => {
  let fixture: ComponentFixture<HoodFormComponent>;
  let lifecycle: CabinetFormTypeLifecycleService;
  let editingService: CabinetFormEditingService;
  let form: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HoodFormComponent],
      providers: [
        FormBuilder,
        { provide: DictionaryService, useClass: DictionaryServiceStub },
        // UPPER_HOOD nie ma segmentów — serwis segmentów nie jest używany przy odtwarzaniu okapu.
        { provide: CabinetSegmentsFormService, useValue: jasmine.createSpyObj('CabinetSegmentsFormService', ['replaceSegments']) }
      ]
    }).compileComponents();

    lifecycle = TestBed.inject(CabinetFormTypeLifecycleService);
    editingService = TestBed.inject(CabinetFormEditingService);
    form = DefaultKitchenFormFactory.create(TestBed.inject(FormBuilder));
  });

  /** Ta sama ścieżka co CabinetFormComponent.fillFormWithCabinet(): patch bez zdarzeń + lifecycle typu. */
  function restore(cabinet: KCabinetHood): void {
    editingService.patchFormForEditing(form, cabinet);
    lifecycle.applyTypeChange(form, cabinet.type, cabinet);
  }

  function mount(): HoodFormComponent {
    fixture = TestBed.createComponent(HoodFormComponent);
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function heightInput(): HTMLInputElement | null {
    return fixture.nativeElement.querySelector('input[formControlName="hoodScreenHeightMm"]');
  }

  function screenCheckbox(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[formControlName="hoodScreenEnabled"]');
  }

  function rangeErrorShown(): boolean {
    return (fixture.nativeElement.textContent as string)
      .includes('Wysokość blendy musi mieścić się w zakresie 50–200mm');
  }

  it('pokazuje pole wysokości po odtworzeniu kolejnego okapu z blendą w już zamontowanej sekcji', () => {
    restore(hoodCabinet({ id: 'hood-1', hoodScreenEnabled: false }));
    const component = mount();
    expect(heightInput()).toBeNull();

    restore(hoodCabinet({ id: 'hood-2', hoodScreenEnabled: true, hoodScreenHeightMm: 10 }));
    fixture.detectChanges();

    expect(fixture.componentInstance).toBe(component);
    expect(component.form).toBe(form);
    expect(screenCheckbox().checked).toBeTrue();
    expect(component.showHoodScreenHeight).toBeTrue();
    const input = heightInput();
    expect(input).not.toBeNull();
    expect(input!.disabled).toBeFalse();
    expect(input!.value).toBe('10');
    expect(rangeErrorShown()).toBeTrue();
    expect(form.get('hoodScreenHeightMm')?.hasError('outOfRange')).toBeTrue();
    expect(form.valid).toBeFalse();
  });

  it('synchronizuje zamontowaną sekcję przy kolejnych odtworzeniach false → true → false', () => {
    restore(hoodCabinet({ id: 'hood-1', hoodScreenEnabled: false }));
    const component = mount();

    // Prawidłowa blenda nie zmienia statusu formularza, więc widok OnPush odświeża tylko markForCheck sekcji.
    restore(hoodCabinet({ id: 'hood-2', hoodScreenEnabled: true, hoodScreenHeightMm: 100 }));
    fixture.detectChanges();
    expect(heightInput()?.value).toBe('100');
    expect(rangeErrorShown()).toBeFalse();
    expect(form.valid).toBeTrue();

    restore(hoodCabinet({ id: 'hood-3', hoodScreenEnabled: false, hoodScreenHeightMm: 10 }));
    fixture.detectChanges();

    expect(fixture.componentInstance).toBe(component);
    expect(screenCheckbox().checked).toBeFalse();
    expect(component.showHoodScreenHeight).toBeFalse();
    expect(heightInput()).toBeNull();
    expect(form.get('hoodScreenHeightMm')?.disabled).toBeTrue();
    expect(form.valid).toBeTrue();
    expect(form.getRawValue().hoodScreenHeightMm).toBe(10);
  });

  it('pokazuje pole i błąd przy montażu sekcji po odtworzeniu blendy 10 mm', () => {
    restore(hoodCabinet({ hoodScreenEnabled: true, hoodScreenHeightMm: 10 }));

    const component = mount();

    expect(component.showHoodScreenHeight).toBeTrue();
    expect(heightInput()?.disabled).toBeFalse();
    expect(rangeErrorShown()).toBeTrue();
    expect(form.valid).toBeFalse();
  });

  it('włącza i wyłącza pole wysokości oraz jego walidację po kliknięciu checkboxa', () => {
    restore(hoodCabinet({ hoodScreenEnabled: false }));
    mount();

    screenCheckbox().click();
    fixture.detectChanges();
    const input = heightInput()!;
    expect(input).not.toBeNull();
    expect(form.valid).toBeTrue();

    input.value = '10';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(rangeErrorShown()).toBeTrue();
    expect(form.valid).toBeFalse();

    screenCheckbox().click();
    fixture.detectChanges();
    expect(heightInput()).toBeNull();
    expect(form.valid).toBeTrue();
  });

  it('nie pozostawia błędu blendy po zmianie typu szafki z zamontowanej sekcji', () => {
    restore(hoodCabinet({ hoodScreenEnabled: false }));
    mount();
    screenCheckbox().click();
    fixture.detectChanges();
    const input = heightInput()!;
    input.value = '10';
    input.dispatchEvent(new Event('input'));
    expect(form.valid).toBeFalse();

    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_ONE_DOOR);
    lifecycle.applyTypeChange(form, KitchenCabinetType.UPPER_ONE_DOOR, null);
    // Rodzic usuwa sekcję okapu (*ngIf) po zmianie typu — razem z walidatorami min/max inputu.
    fixture.destroy();

    expect(form.get('hoodScreenHeightMm')?.errors).toBeNull();
    expect(form.valid).toBeTrue();
  });
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

class DictionaryServiceStub {
  readonly data = signal({
    hoodFrontTypes: [
      { code: 'FLAP', label: 'Klapa (lift-up)' },
      { code: 'TWO_DOORS', label: 'Dwoje drzwi' },
      { code: 'OPEN', label: 'Otwarta' }
    ]
  });
}
