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
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Strona wyspy');
    expect(fixture.nativeElement.textContent).toContain('Pusta przestrzeń przed (mm)');

    stateService.selectedWallSignal.set(buildWall('MAIN'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Strona wyspy');
    expect(fixture.nativeElement.textContent).toContain('Pusta przestrzeń przed (mm)');
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
    openingTypes: [{ code: 'HANDLE', label: 'Handle' }]
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
  applyTypeChange() {
    return {
      visibility: {
        width: true,
        positioningMode: false,
        drainerWidthSelect: false,
        enclosureSection: false
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
