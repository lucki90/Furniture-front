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

  /**
   * Codex review fix 2026-05-28 (P2 testy FE):
   * Testy `openTypePicker()` — handler odpowiedzi pickera dla CORNER_CABINET z preset isUpperCorner.
   * Pokrywa logikę z `cabinet-form.component.ts` linia 193.
   */
  describe('openTypePicker — preset CORNER (Iter.3 fix)', () => {
    it('CORNER + isUpperCorner=false → ustawia oba pola (isUpperCorner silently przed type)', () => {
      const dialog = TestBed.inject(MatDialog);
      spyOn(dialog, 'open').and.returnValue({
        afterClosed: () => of({ type: KitchenCabinetType.CORNER_CABINET, isUpperCorner: false })
      } as any);

      component.openTypePicker();

      expect(component.form.get('isUpperCorner')?.value).toBe(false);
      expect(component.form.get('kitchenCabinetType')?.value).toBe(KitchenCabinetType.CORNER_CABINET);
    });

    it('CORNER + isUpperCorner=true → propaguje true do isUpperCorner przed type change', () => {
      const dialog = TestBed.inject(MatDialog);
      spyOn(dialog, 'open').and.returnValue({
        afterClosed: () => of({ type: KitchenCabinetType.CORNER_CABINET, isUpperCorner: true })
      } as any);

      component.openTypePicker();

      expect(component.form.get('isUpperCorner')?.value).toBe(true);
      expect(component.form.get('kitchenCabinetType')?.value).toBe(KitchenCabinetType.CORNER_CABINET);
    });

    it('BASE_ONE_DOOR (bez isUpperCorner w result) → nie zmienia isUpperCorner', () => {
      component.form.get('isUpperCorner')?.setValue(false);
      const dialog = TestBed.inject(MatDialog);
      spyOn(dialog, 'open').and.returnValue({
        afterClosed: () => of({ type: KitchenCabinetType.BASE_ONE_DOOR })
      } as any);

      component.openTypePicker();

      expect(component.form.get('kitchenCabinetType')?.value).toBe(KitchenCabinetType.BASE_ONE_DOOR);
      expect(component.form.get('isUpperCorner')?.value).toBe(false); // bez zmian
    });

    it('null (anulowanie pickera) → nie zmienia żadnego pola', () => {
      const initialType = component.form.get('kitchenCabinetType')?.value;
      const dialog = TestBed.inject(MatDialog);
      spyOn(dialog, 'open').and.returnValue({
        afterClosed: () => of(null)
      } as any);

      component.openTypePicker();

      expect(component.form.get('kitchenCabinetType')?.value).toBe(initialType);
    });
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

  describe('UPPER_LIFT_UP — third Aventos mechanism checkbox visibility', () => {
    it('treats the lift mechanism section as options tab content', () => {
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      (component as any).activeTab = 'options';
      fixture.detectChanges();

      expect(component.hasOptionsTabContent()).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('Mechanizm podnośnika');
      expect(fixture.nativeElement.textContent).not.toContain('Ten typ szafki nie ma dodatkowych opcji');
    });

    it('hides the third-mechanism checkbox for default GAS_GTV mechanism', () => {
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      (component as any).activeTab = 'options';
      fixture.detectChanges();

      expect(component.form.get('liftMechanismType')?.value).toBe('GAS_GTV');
      expect(component.visibility.allowThirdLiftMechanism).toBeFalse();
      expect(fixture.nativeElement.textContent).toContain('Mechanizm podnośnika');
      expect(fixture.nativeElement.textContent).not.toContain('Zezwól na trzeci mechanizm Aventos');
    });

    it('shows the third-mechanism checkbox for AVENTOS_HK_S', () => {
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      (component as any).activeTab = 'options';
      component.form.get('liftMechanismType')?.setValue('AVENTOS_HK_S');
      fixture.detectChanges();

      expect(component.visibility.allowThirdLiftMechanism).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('Zezwól na trzeci mechanizm Aventos');
    });

    it('keeps the third-mechanism checkbox hidden for AVENTOS_HK_TOP', () => {
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      (component as any).activeTab = 'options';
      component.form.get('liftMechanismType')?.setValue('AVENTOS_HK_TOP');
      fixture.detectChanges();

      expect(component.visibility.allowThirdLiftMechanism).toBeFalse();
      expect(fixture.nativeElement.textContent).toContain('Mechanizm podnośnika');
      expect(fixture.nativeElement.textContent).not.toContain('Zezwól na trzeci mechanizm Aventos');
    });

    it('shows the third-mechanism checkbox for AVENTOS_HF_TOP', () => {
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      (component as any).activeTab = 'options';
      component.form.get('liftMechanismType')?.setValue('AVENTOS_HF_TOP');
      fixture.detectChanges();

      expect(component.visibility.allowThirdLiftMechanism).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('Zezwól na trzeci mechanizm Aventos');
    });

    it('zeroes the opt-in when switching from a supported mechanism to GAS_GTV', () => {
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      component.form.get('liftMechanismType')?.setValue('AVENTOS_HK_S');
      component.form.get('allowThirdLiftMechanism')?.setValue(true);
      fixture.detectChanges();

      component.form.get('liftMechanismType')?.setValue('GAS_GTV');
      fixture.detectChanges();

      expect(component.visibility.allowThirdLiftMechanism).toBeFalse();
      expect(component.form.get('allowThirdLiftMechanism')?.value).toBeFalse();
    });

    it('sanitizes a saved-but-unsupported AVENTOS_HK_TOP + opt-in: hides checkbox and zeroes the control', () => {
      // [P3] Stan z bazy moze niesc "martwy" opt-in (HK top nie wspiera trzeciego mechanizmu, ale raw zapis go zachowal).
      // Gdy formularz odswiezy widocznosc dla HK top, checkbox musi zniknac, a kontrolka wyzerowac sie — zeby nie wyslac
      // martwego allowThirdLiftMechanism dalej do backendu.
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      (component as any).activeTab = 'options';
      component.form.get('allowThirdLiftMechanism')?.setValue(true);
      component.form.get('liftMechanismType')?.setValue('AVENTOS_HK_TOP');
      fixture.detectChanges();

      expect(component.visibility.allowThirdLiftMechanism).toBeFalse();
      expect(component.form.get('allowThirdLiftMechanism')?.value).toBeFalse();
      expect(fixture.nativeElement.textContent).not.toContain('Zezwól na trzeci mechanizm Aventos');
    });
  });

  describe('UPPER_LIFT_UP — HF asymmetric front field visibility (hfUpperFrontHeightMm)', () => {
    it('shows the upper-front height field only for AVENTOS_HF_TOP', () => {
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      (component as any).activeTab = 'options';
      component.form.get('liftMechanismType')?.setValue('AVENTOS_HF_TOP');
      fixture.detectChanges();

      expect(component.visibility.hfUpperFrontHeightMm).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('Wysokość górnego frontu (mm)');
    });

    it('keeps the upper-front height field hidden for non-HF mechanisms (HK-S)', () => {
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      (component as any).activeTab = 'options';
      component.form.get('liftMechanismType')?.setValue('AVENTOS_HK_S');
      fixture.detectChanges();

      expect(component.visibility.hfUpperFrontHeightMm).toBeFalse();
      expect(fixture.nativeElement.textContent).not.toContain('Wysokość górnego frontu (mm)');
    });

    it('zeroes the upper-front height when switching from AVENTOS_HF_TOP to another mechanism', () => {
      // Wartość asymetrii nie może przeżyć zmiany mechanizmu — walidator BE odrzuca hfUpperFrontHeightMm
      // dla mechanizmów innych niż AVENTOS_HF_TOP.
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      (component as any).activeTab = 'options';
      component.form.get('liftMechanismType')?.setValue('AVENTOS_HF_TOP');
      component.form.get('hfUpperFrontHeightMm')?.setValue(420);
      fixture.detectChanges();

      component.form.get('liftMechanismType')?.setValue('AVENTOS_HK_S');
      fixture.detectChanges();

      expect(component.visibility.hfUpperFrontHeightMm).toBeFalse();
      expect(component.form.get('hfUpperFrontHeightMm')?.value).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Wysokość górnego frontu (mm)');
    });
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
    expect(component.form.get('width')?.errors?.['cabinetValidation']).toEqual({
      code: 'PANTRY_ONE_DOOR_TOO_WIDE',
    });
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
    ],
    liftMechanismTypes: [
      { code: 'GAS_GTV', label: 'Podnośnik gazowy (GTV)' },
      { code: 'AVENTOS_HK_TOP', label: 'Aventos HK top' },
      { code: 'AVENTOS_HK_S', label: 'Aventos HK-S' },
      { code: 'AVENTOS_HF_TOP', label: 'Aventos HF top (front składany)' }
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
        liftMechanismType: type === KitchenCabinetType.UPPER_LIFT_UP,
        liftUp: type === KitchenCabinetType.UPPER_LIFT_UP,
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

  getControlError() {
    return null;
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
