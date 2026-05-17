import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { CabinetFormComponent } from './cabinet-form.component';
import { DictionaryService } from '../service/dictionary.service';
import { KitchenStateService } from '../service/kitchen-state.service';
import { CabinetSegmentsFormService } from './cabinet-segments-form.service';
import { CabinetFormEditingService } from './cabinet-form-editing.service';
import { CabinetFormTypeLifecycleService } from './cabinet-form-type-lifecycle.service';
import { CabinetFormValidationErrorsService } from './cabinet-form-validation-errors.service';
import { CabinetFormCalculationService } from './cabinet-form-calculation.service';
import { CabinetSegmentValidationService } from './cabinet-segment-validation.service';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { PantryPassageCabinetValidator } from './types/pantry-passage/pantry-passage-cabinet-validator';

describe('CabinetFormComponent', () => {
  let component: CabinetFormComponent;
  let fixture: ComponentFixture<CabinetFormComponent>;
  let stateService: KitchenStateServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CabinetFormComponent],
      providers: [
        FormBuilder,
        { provide: DictionaryService, useClass: DictionaryServiceStub },
        { provide: KitchenStateService, useClass: KitchenStateServiceStub },
        { provide: CabinetSegmentsFormService, useClass: CabinetSegmentsFormServiceStub },
        { provide: CabinetFormEditingService, useClass: CabinetFormEditingServiceStub },
        { provide: CabinetFormTypeLifecycleService, useClass: CabinetFormTypeLifecycleServiceStub },
        { provide: CabinetFormValidationErrorsService, useClass: CabinetFormValidationErrorsServiceStub },
        { provide: CabinetFormCalculationService, useClass: CabinetFormCalculationServiceStub },
        { provide: CabinetSegmentValidationService, useClass: CabinetSegmentValidationServiceStub },
        { provide: ApiErrorHandler, useClass: ApiErrorHandlerStub },
        { provide: MatDialog, useClass: MatDialogStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CabinetFormComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(KitchenStateService) as unknown as KitchenStateServiceStub;
    fixture.detectChanges();
  });

  it('shows cabinet side field only for island wall', () => {
    stateService.selectedWallSignal.set(buildWall('ISLAND'));
    component.setActiveTab('position');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Strona wyspy');
    expect(fixture.nativeElement.textContent).toContain('Pusta');

    stateService.selectedWallSignal.set(buildWall('MAIN'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Strona wyspy');
    expect(fixture.nativeElement.textContent).toContain('Pusta');
  });

  it('defaults cabinet side control to FRONT', () => {
    expect(component.form.get('cabinetSide')?.value).toBe('FRONT');
  });

  it('resets gap before when selected wall changes', () => {
    stateService.selectedWallSignal.set(buildWall('ISLAND'));
    fixture.detectChanges();
    component.form.get('gapBeforeMm')?.setValue(900);

    stateService.selectedWallSignal.set(buildWall('MAIN'));
    fixture.detectChanges();

    expect(component.form.get('gapBeforeMm')?.value).toBe(0);
  });

  it('resets gap before when cabinet type changes in create mode', () => {
    component.form.get('gapBeforeMm')?.setValue(900);

    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_WITH_DRAWERS);
    fixture.detectChanges();

    expect(component.form.get('gapBeforeMm')?.value).toBe(0);
  });

  it('shows cargo variant selector for BASE_CARGO', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_CARGO);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Wariant cargo');
    expect(fixture.nativeElement.textContent).toContain('Mechanizm cargo');
  });

  it('hides opening type and keeps shelves for BASE_OPEN', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_OPEN);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Polki');
    expect(fixture.nativeElement.textContent).not.toContain('Typ otwarcia');
    expect(component.form.get('openingType')?.value).toBe('NONE');
  });

  it('shows warning hint for non-nominal cargo mechanism width', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_CARGO);
    component.form.get('width')?.setValue(350);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('mechanizm cargo moze nie pasowac');
    expect(fixture.nativeElement.textContent).toContain('Marka mechanizmu');
    expect(component.form.get('drawerModel')?.value).toBeNull();
  });

  it('switches cargo form to drawers variant with drawer system and no mechanism brand', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_CARGO);
    component.form.get('cargoVariant')?.setValue('DRAWERS');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargo z szufladami');
    expect(fixture.nativeElement.textContent).toContain('System szuflad');
    expect(fixture.nativeElement.textContent).not.toContain('Marka mechanizmu');
    expect(component.form.get('drawerModel')?.value).toBe('ANTARO_TANDEMBOX');
  });

  it('shows a strong usability warning for cargo drawers up to 200 mm', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_CARGO);
    component.form.get('cargoVariant')?.setValue('DRAWERS');
    component.form.get('width')?.setValue(200);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('przy szerokosci 200 mm cargo z szufladami jest technicznie mozliwe');
    expect(fixture.nativeElement.textContent).toContain('bardzo malo uzytkowe');
  });

  it('shows a narrower usability warning for cargo drawers above 200 mm but below 250 mm', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_CARGO);
    component.form.get('cargoVariant')?.setValue('DRAWERS');
    component.form.get('width')?.setValue(220);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('szuflady wewnetrzne beda bardzo waskie');
    expect(fixture.nativeElement.textContent).not.toContain('Marka mechanizmu');
  });

  it('does not show a drawers usability warning from 250 mm upwards', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_CARGO);
    component.form.get('cargoVariant')?.setValue('DRAWERS');
    component.form.get('width')?.setValue(250);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('bardzo malo uzytkowe');
    expect(fixture.nativeElement.textContent).not.toContain('szuflady wewnetrzne beda bardzo waskie');
    expect(fixture.nativeElement.textContent).not.toContain('mechanizm cargo moze nie pasowac');
  });

  it('shows pantry passage door variant selector and validates one-door width over 600 mm', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.PANTRY_PASSAGE);
    new PantryPassageCabinetValidator().validate(component.form);
    component.form.get('pantryPassageFrontType')?.setValue('ONE_DOOR');
    component.form.get('width')?.setValue(650);
    component.form.get('width')?.markAsTouched();
    component.form.get('width')?.updateValueAndValidity();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Wariant drzwi przejscia');
    expect(component.form.get('width')?.errors?.['message']).toContain('powyzej 600 mm');
  });
});

function buildWall(type: 'MAIN' | 'ISLAND'): WallWithCabinets {
  return {
    id: 'wall-1',
    type,
    widthMm: 2400,
    heightMm: 2600,
    cabinets: []
  };
}

class DictionaryServiceStub {
  readonly data = signal({
    openingTypes: [{ code: 'HANDLE', label: 'Handle' }],
    drawerModels: [
      { code: 'ANTARO_TANDEMBOX', label: 'Blum Antaro / Tandembox' },
      { code: 'SEVROLL_BALL', label: 'Sevroll kulkowe' }
    ]
  });
}

class KitchenStateServiceStub {
  readonly selectedWallSignal = signal<WallWithCabinets | null>(buildWall('MAIN'));
  readonly selectedWall = this.selectedWallSignal;
  readonly visibleIslandSide = signal<'FRONT' | 'BACK'>('FRONT');
  readonly plinthHeightMm = signal(100);
  readonly countertopThicknessMm = signal(38);
  readonly upperFillerHeightMm = signal(100);

  materialDefaults() {
    return {};
  }
}

class CabinetSegmentsFormServiceStub {
  createDefaultSegment() {
    return new FormBuilder().group({});
  }

  removeSegment() {}

  getSelectedSegmentForm() {
    return null;
  }
}

class CabinetFormEditingServiceStub {
  patchFormForEditing() {}
}

class CabinetFormTypeLifecycleServiceStub {
  applyTypeChange(form: any, type: KitchenCabinetType) {
    if (type === KitchenCabinetType.BASE_OPEN) {
      form.get('openingType')?.setValue('NONE', { emitEvent: false });
    }

    return {
      visibility: {
        width: type !== KitchenCabinetType.BASE_CARGO,
        shelfQuantity: type === KitchenCabinetType.BASE_OPEN,
        drawerQuantity: type === KitchenCabinetType.BASE_CARGO,
        drawerModel: type === KitchenCabinetType.BASE_CARGO,
        cargoBrand: type === KitchenCabinetType.BASE_CARGO,
        positioningMode: false,
        drainerWidthSelect: false,
        cargoWidthSelect: type === KitchenCabinetType.BASE_CARGO,
        cargoVariant: type === KitchenCabinetType.BASE_CARGO,
        pantryPassageFrontType: type === KitchenCabinetType.PANTRY_PASSAGE,
        enclosureSection: false,
        openingType: type !== KitchenCabinetType.BASE_OPEN
      },
      restoreApplied: false
    };
  }
}

class CabinetFormValidationErrorsServiceStub {
  getValidationErrors() {
    return [];
  }
}

class CabinetFormCalculationServiceStub {
  calculateCabinet(type: KitchenCabinetType, formData: unknown) {
    return of({ formData, result: { kitchenCabinetType: type } });
  }
}

class CabinetSegmentValidationServiceStub {
  getFridgeSectionHeight() {
    return 0;
  }

  getUpperSectionsHeightSum() {
    return 0;
  }

  getSegmentHeightError() {
    return null;
  }

  validate() {}
}

class ApiErrorHandlerStub {
  handle() {}
}

class MatDialogStub {
  open() {
    return {
      afterClosed: () => of(null)
    };
  }
}
