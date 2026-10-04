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
import { KitchenCabinet, WallWithCabinets } from '../model/kitchen-state.model';
import { PantryPassageCabinetValidator } from './types/pantry-passage/pantry-passage-cabinet-validator';
import { MaterialPresetService } from '../service/material-preset.service';
import { TranslationService } from '../../translation/translation.service';
import { LanguageService } from '../../service/language.service';
import { BaseCargoCabinetValidator } from './types/base-cargo/base-cargo-cabinet-validator';
import { BaseOvenCabinetValidator } from './types/base-oven/base-oven-cabinet-validator';
import { UpperCascadeCabinetValidator } from './types/upper-cascade/upper-cascade-cabinet-validator';
import { BaseFridgeCabinetValidator } from './types/base-fridge/base-fridge-cabinet-validator';
import { UpperDrainerCabinetValidator } from './types/upper-drainer/upper-drainer-cabinet-validator';
import { BaseOvenFreestandingCabinetValidator } from './types/base-oven/base-oven-freestanding-cabinet-validator';
import { CABINET_FORM_MESSAGES } from './cabinet-form-validation-messages';
import { KitchenProjectLayoutService } from '../service/kitchen-project-layout.service';

describe('CabinetFormComponent', () => {
  let component: CabinetFormComponent;
  let fixture: ComponentFixture<CabinetFormComponent>;
  let stateService: KitchenStateServiceStub;
  let projectLayoutService: KitchenProjectLayoutServiceStub;

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
        { provide: MaterialPresetService, useClass: MaterialPresetServiceStub },
        { provide: TranslationService, useClass: TranslationServiceStub },
        { provide: LanguageService, useClass: LanguageServiceStub },
        { provide: ApiErrorHandler, useClass: ApiErrorHandlerStub },
        { provide: MatDialog, useClass: MatDialogStub },
        { provide: KitchenProjectLayoutService, useClass: KitchenProjectLayoutServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CabinetFormComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(KitchenStateService) as unknown as KitchenStateServiceStub;
    projectLayoutService = TestBed.inject(KitchenProjectLayoutService) as unknown as KitchenProjectLayoutServiceStub;
    fixture.detectChanges();
  });

  describe('presety i ilość (Faza 19)', () => {
    const preset = { id: 'preset-1', type: KitchenCabinetType.BASE_ONE_DOOR, width: 600, name: '' } as KitchenCabinet;

    it('P4: preset idzie przez cykl typu jak edytowana szafka; nazwa i odstęp jak dla nowej szafki', () => {
      const lifecycle = TestBed.inject(CabinetFormTypeLifecycleService);
      const applyTypeChange = spyOn(lifecycle, 'applyTypeChange').and.callThrough();
      component.form.patchValue({ name: 'Stara', gapBeforeMm: 50 }, { emitEvent: false });

      component.applyPreset(preset);

      expect(applyTypeChange).toHaveBeenCalledWith(component.form, KitchenCabinetType.BASE_ONE_DOOR, preset);
      expect(component.form.get('kitchenCabinetType')?.value).toBe(KitchenCabinetType.BASE_ONE_DOOR);
      expect(component.form.get('name')?.value).toBe('');
      expect(component.form.get('gapBeforeMm')?.value).toBe(0);

      component.applyPreset(preset);
      expect(applyTypeChange.calls.mostRecent().args[2]).toBe(preset);
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_OPEN);
      expect(applyTypeChange.calls.mostRecent().args[2]).toBeNull();
    });

    it('N1: dodanie przekazuje ilość (1–10) i wraca do 1; „Preset” emituje osobne zdarzenie', () => {
      component.form.patchValue({ kitchenCabinetType: KitchenCabinetType.BASE_ONE_DOOR, width: 600, height: 720,
        depth: 500 }, { emitEvent: false });
      const added: { quantity?: number }[] = [];
      const presetRequests: unknown[] = [];
      component.calculated.subscribe(event => added.push(event));
      component.presetRequested.subscribe(event => presetRequests.push(event));

      component.quantityControl.setValue(3);
      component.calculate();
      component.quantityControl.setValue(25);
      component.calculate();
      component.calculate('preset');

      expect(added.map(event => event.quantity)).toEqual([3, 10]);
      expect(component.quantityControl.value).toBe(1);
      expect(presetRequests).toHaveSize(1);
    });
  });

  it('blocks saving a freestanding oven with invalid or missing edited dimensions', () => {
    component.form.patchValue({ kitchenCabinetType: KitchenCabinetType.BASE_OVEN_FREESTANDING,
      width: 600, height: 720, depth: 560 });
    new BaseOvenFreestandingCabinetValidator().validate(component.form);
    component.form.get('width')?.setValue(1);
    expect(component.isAddDisabled).toBeTrue();
    component.form.get('width')?.setValue(600);
    component.form.get('height')?.setValue(null);
    expect(component.isAddDisabled).toBeTrue();
    component.form.get('height')?.setValue(720);
    expect(component.isAddDisabled).toBeFalsy();
  });

  it('blocks saving a drainer with an unsupported restored width until it is corrected', () => {
    component.form.patchValue({ kitchenCabinetType: KitchenCabinetType.UPPER_DRAINER,
      width: 600, height: 600, depth: 300, shelfQuantity: 0 });
    component.visibility.width = false;
    component.visibility.drainerWidthSelect = true;
    new UpperDrainerCabinetValidator().validate(component.form);
    component.form.patchValue({ width: 700 }, { emitEvent: false });
    expect(component.isAddDisabled).toBeTrue();
    component.form.get('width')?.setValue(600);
    expect(component.isAddDisabled).toBeFalsy();
  });

  it('blocks adding a cascade until the invalid depth order is corrected', () => {
    component.form.patchValue({ kitchenCabinetType: KitchenCabinetType.UPPER_CASCADE,
      width: 600, cascadeLowerHeight: 400, cascadeUpperHeight: 320,
      cascadeLowerDepth: 400, cascadeUpperDepth: 300 });
    new UpperCascadeCabinetValidator().validate(component.form);
    expect(component.isAddDisabled).toBeTrue();
    component.form.get('cascadeUpperDepth')?.setValue(400);
    expect(component.isAddDisabled).toBeFalsy();
  });

  it('blocks adding a fridge when upper sections leave an undersized upper front', () => {
    const validator = new BaseFridgeCabinetValidator();
    const validationService = TestBed.inject(CabinetSegmentValidationService);
    spyOn(validationService, 'getSegmentHeightError').and.callFake(form =>
      validator.getUpperSectionsError(form, CABINET_FORM_MESSAGES.pl));
    component.form.patchValue({ kitchenCabinetType: KitchenCabinetType.BASE_FRIDGE,
      width: 600, height: 2000, depth: 560, fridgeSectionType: 'TWO_DOORS', lowerFrontHeightMm: 713 });
    component.visibility.segments = true;
    component.segmentsArray.push(new FormBuilder().group({ height: 600 }));
    component.segmentsArray.push(new FormBuilder().group({ height: 600 }));
    expect(component.isAddDisabled).toBeTrue();
    component.segmentsArray.at(0).get('height')?.setValue(500);
    component.segmentsArray.at(1).get('height')?.setValue(500);
    expect(component.isAddDisabled).toBeFalsy();
  });

  function prepareOven(height: number, ovenHeightType: string) {
    component.form.patchValue({ kitchenCabinetType: KitchenCabinetType.BASE_OVEN,
      width: 600, height, depth: 560, ovenHeightType,
      ovenApronEnabled: false, ovenApronHeightMm: 100 });
    new BaseOvenCabinetValidator().validate(component.form);
    fixture.detectChanges();
  }

  it('updates the add-button state when oven height type changes', () => {
    prepareOven(650, 'COMPACT');
    expect(component.isAddDisabled).toBeFalsy();
    component.form.get('ovenHeightType')?.setValue('STANDARD');
    expect(component.form.get('height')?.hasError('tooShortForOven')).toBeTrue();
    expect(component.isAddDisabled).toBeTrue();
    component.form.get('ovenHeightType')?.setValue('COMPACT');
    expect(component.isAddDisabled).toBeFalsy();
  });

  it('revalidates the oven lower section when apron settings change', () => {
    prepareOven(750, 'STANDARD');
    expect(component.isAddDisabled).toBeFalsy();
    component.form.get('ovenApronEnabled')?.setValue(true);
    expect(component.isAddDisabled).toBeTrue();
    component.form.get('ovenApronHeightMm')?.setValue(40);
    expect(component.isAddDisabled).toBeFalsy();
    component.form.get('ovenApronHeightMm')?.setValue(50);
    expect(component.isAddDisabled).toBeTrue();
    component.form.get('ovenApronEnabled')?.setValue(false);
    expect(component.isAddDisabled).toBeFalsy();
  });

  it('blocks an out-of-range apron and clears its error when the apron is disabled', () => {
    prepareOven(850, 'STANDARD');
    component.form.get('ovenApronEnabled')?.setValue(true);
    component.form.get('ovenApronHeightMm')?.setValue(20);
    expect(component.form.get('ovenApronHeightMm')?.hasError('outOfRange')).toBeTrue();
    expect(component.isAddDisabled).toBeTrue();
    component.form.get('ovenApronEnabled')?.setValue(false);
    expect(component.form.get('ovenApronHeightMm')?.errors).toBeNull();
    expect(component.isAddDisabled).toBeFalsy();
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

  it('pobiera rzeczywisty zasięg sąsiada dla podpowiedzi ślepego narożnika', () => {
    component.form.patchValue({
      cornerMechanism: 'BLIND_CORNER',
      depth: 510,
      frontMountingType: 'OVERLAY'
    });

    expect(component.blindCornerNeighborReachMm).toBe(578);
    expect(projectLayoutService.blindCornerNeighborReachMm).toHaveBeenCalledWith(
      'wall-1',
      528,
      { cabinetId: null, level: 'BASE' }
    );
  });

  it('shows front mounting for supported cabinet and defaults to overlay', () => {
    expect(component.supportsFrontMountingSelection).toBeTrue();
    expect(component.form.get('frontMountingType')?.value).toBe('OVERLAY');
    expect(fixture.nativeElement.textContent).toContain('Osadzenie frontu');
  });

  it('resets inset mounting after switching to an unsupported cabinet', () => {
    component.form.get('frontMountingType')?.setValue('INSET');
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_OPEN);
    fixture.detectChanges();

    expect(component.supportsFrontMountingSelection).toBeFalse();
    expect(component.form.get('frontMountingType')?.value).toBe('OVERLAY');
    expect(fixture.nativeElement.textContent).not.toContain('Osadzenie frontu');
  });

  it('keeps inset mounting available for a sink cabinet', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_SINK);
    component.form.get('frontMountingType')?.setValue('INSET');
    fixture.detectChanges();

    expect(component.supportsFrontMountingSelection).toBeTrue();
    expect(component.form.get('frontMountingType')?.value).toBe('INSET');
  });

  it('resets inset mounting when switching from gas lift to Aventos', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
    component.form.get('frontMountingType')?.setValue('INSET');
    component.form.get('liftMechanismType')?.setValue('AVENTOS_HK_TOP');
    fixture.detectChanges();

    expect(component.supportsFrontMountingSelection).toBeFalse();
    expect(component.form.get('frontMountingType')?.value).toBe('OVERLAY');
  });

  it('keeps inset mounting available when bottom wreath is placed on the floor', () => {
    component.form.get('frontMountingType')?.setValue('INSET');
    component.form.get('bottomWreathOnFloor')?.setValue(true);
    fixture.detectChanges();

    expect(component.supportsFrontMountingSelection).toBeTrue();
    expect(component.form.get('frontMountingType')?.value).toBe('INSET');
  });

  it('passes selected material preset override to calculation service', () => {
    const calculationService = TestBed.inject(CabinetFormCalculationService) as unknown as CabinetFormCalculationServiceStub;

    component.onMaterialOverrideToggle(true);
    component.onMaterialPresetChange('WHITE_LACQUER_PREMIUM');
    component.calculate();

    expect(calculationService.lastMaterialOverride).toEqual({
      materialRequest: {
        boxMaterial: 'CHIPBOARD',
        boxBoardThickness: 18,
        boxColor: 'WHITE',
        boxVeneerColor: 'WHITE',
        frontMaterial: 'MDF',
        frontBoardThickness: 18,
        frontColor: 'WHITE',
        frontVeneerColor: null
      },
      varnishedFront: true,
      materialPresetCode: 'WHITE_LACQUER_PREMIUM'
    });
  });

  it('does not preserve persisted material when an edited cabinet preset is disabled', () => {
    const calculationService = TestBed.inject(CabinetFormCalculationService) as unknown as CabinetFormCalculationServiceStub;
    component.editingCabinet = {
      id: 'cab-loaded',
      type: KitchenCabinetType.BASE_ONE_DOOR,
      materialPresetCode: 'WHITE_LACQUER_PREMIUM'
    } as any;

    component.onMaterialOverrideToggle(false);
    component.calculate();

    expect(calculationService.lastMaterialOverride).toBeUndefined();
    expect(calculationService.lastPreservePersistedMaterial).toBeFalse();
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

    expect(fixture.nativeElement.textContent).toContain('mechanizm cargo może nie pasować');
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

  it('revalidates cargo depth when the variant changes', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_CARGO);
    new BaseCargoCabinetValidator().validate(component.form);
    component.form.get('depth')?.setValue(300);

    expect(component.form.get('depth')?.errors?.['min']?.min).toBe(510);

    component.form.get('cargoVariant')?.setValue('DRAWERS');
    expect(component.form.get('depth')?.valid).toBeTrue();

    component.form.get('cargoVariant')?.setValue('MECHANISM');
    expect(component.form.get('depth')?.errors?.['min']?.min).toBe(510);
  });

  it('shows a strong usability warning for cargo drawers up to 200 mm', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_CARGO);
    component.form.get('cargoVariant')?.setValue('DRAWERS');
    component.form.get('width')?.setValue(200);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('przy szerokości 200 mm cargo z szufladami jest technicznie możliwe');
    expect(fixture.nativeElement.textContent).toContain('mało użytkowe');
  });

  it('shows a narrower usability warning for cargo drawers above 200 mm but below 250 mm', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_CARGO);
    component.form.get('cargoVariant')?.setValue('DRAWERS');
    component.form.get('width')?.setValue(220);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('szuflady wewnętrzne będą bardzo wąskie');
    expect(fixture.nativeElement.textContent).not.toContain('Marka mechanizmu');
  });

  it('does not show a drawers usability warning from 250 mm upwards', () => {
    component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_CARGO);
    component.form.get('cargoVariant')?.setValue('DRAWERS');
    component.form.get('width')?.setValue(250);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('mało użytkowe');
    expect(fixture.nativeElement.textContent).not.toContain('szuflady wewnętrzne będą bardzo wąskie');
    expect(fixture.nativeElement.textContent).not.toContain('mechanizm cargo może nie pasować');
  });

  describe('UPPER_LIFT_UP — third Aventos mechanism checkbox visibility', () => {
    it('treats the lift mechanism section as options tab content', () => {
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      (component as any).activeTab = 'options';
      fixture.detectChanges();

      expect(component.hasOptionsTab).toBeTrue();
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

  /**
   * Cache `hasOptionsTab` jest przeliczany wyłącznie w `setVisibility()`. Te testy pilnują, by wartość cache
   * pozostała zgodna z realnym stanem `visibility` przy każdej zmianie typu — gdyby ktoś w przyszłości zapisał
   * `this.visibility` z pominięciem `setVisibility()`, cache rozjechałby się i te asercje by to wychwyciły.
   */
  describe('hasOptionsTab cache stays in sync with visibility', () => {
    const recompute = () => (component as any).computeHasOptionsTab() as boolean;

    it('flips to true for a type with specialist options (UPPER_LIFT_UP)', () => {
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      fixture.detectChanges();

      expect(component.hasOptionsTab).toBeTrue();
      expect(component.hasOptionsTab).toBe(recompute());
    });

    it('flips back to false for a type without specialist options (BASE_ONE_DOOR)', () => {
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_ONE_DOOR);
      fixture.detectChanges();

      expect(component.hasOptionsTab).toBeFalse();
      expect(component.hasOptionsTab).toBe(recompute());
    });

    it('stays consistent across consecutive type switches', () => {
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      fixture.detectChanges();
      expect(component.hasOptionsTab).toBeTrue();

      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_ONE_DOOR);
      fixture.detectChanges();
      expect(component.hasOptionsTab).toBeFalse();
      expect(component.hasOptionsTab).toBe(recompute());

      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_LIFT_UP);
      fixture.detectChanges();
      expect(component.hasOptionsTab).toBeTrue();
      expect(component.hasOptionsTab).toBe(recompute());
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

  describe('BASE_WITH_DRAWERS — CUSTOM drawer heights', () => {
    let segmentsServiceSpy: jasmine.SpyObj<CabinetSegmentsFormServiceStub>;

    beforeEach(() => {
      segmentsServiceSpy = TestBed.inject(CabinetSegmentsFormService) as unknown as jasmine.SpyObj<CabinetSegmentsFormServiceStub>;
      spyOn(segmentsServiceSpy, 'syncDrawerCustomHeights');
      component.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_WITH_DRAWERS);
    });

    it('wywołuje syncDrawerCustomHeights gdy drawerLayoutType zmienia się na CUSTOM', () => {
      component.form.get('drawerLayoutType')?.setValue('CUSTOM');
      expect(segmentsServiceSpy.syncDrawerCustomHeights).toHaveBeenCalled();
    });

    it('wywołuje syncDrawerCustomHeights i ukrywa sekcję przy zmianie na EQUAL', () => {
      component.form.get('drawerLayoutType')?.setValue('EQUAL');
      expect(segmentsServiceSpy.syncDrawerCustomHeights).toHaveBeenCalled();
      expect(component.visibility.drawerCustomHeights).toBeFalse();
    });

    it('wywołuje syncDrawerCustomHeights przy zmianie drawerQuantity gdy układ CUSTOM', () => {
      component.form.get('drawerLayoutType')?.setValue('CUSTOM');
      (segmentsServiceSpy.syncDrawerCustomHeights as jasmine.Spy).calls.reset();

      component.form.get('drawerQuantity')?.setValue(4);
      expect(segmentsServiceSpy.syncDrawerCustomHeights).toHaveBeenCalled();
    });

    it('pokazuje ostrzeżenie w widoku gdy customHeightsTotalWarning zwraca komunikat', () => {
      spyOn(segmentsServiceSpy, 'getCustomHeightsTotalWarning').and.returnValue(
        'Suma wysokości szuflad powinna wynieść 708 mm (korpus po odjęciu szczelin). Aktualna: 600 mm, różnica: +108 mm.'
      );
      component.form.get('drawerLayoutType')?.setValue('CUSTOM');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Suma wysokości szuflad powinna wynieść 708 mm');
      expect(fixture.nativeElement.textContent).toContain('+108 mm');
    });

    it('nie pokazuje ostrzeżenia gdy customHeightsTotalWarning zwraca null', () => {
      spyOn(segmentsServiceSpy, 'getCustomHeightsTotalWarning').and.returnValue(null);
      component.form.get('drawerLayoutType')?.setValue('CUSTOM');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.form-error')).toBeNull();
    });

    it('blocks saving while custom heights do not fill the cabinet', () => {
      const warning = spyOn(segmentsServiceSpy, 'getCustomHeightsTotalWarning').and.returnValue('Niepoprawna suma wysokości');
      component.form.get('drawerLayoutType')?.setValue('CUSTOM');
      expect(component.isAddDisabled).toBeTrue();
      expect(component.addDisabledReason).toBe('Niepoprawna suma wysokości');
      warning.and.returnValue(null);
      expect(component.isAddDisabled).toBeFalsy();
      warning.and.returnValue('Niepoprawna suma wysokości');
      component.form.get('drawerLayoutType')?.setValue('EQUAL');
      expect(component.isAddDisabled).toBeFalsy();
    });
  });
});

describe('CabinetFormComponent — obudowa boczna przy edycji kolejnych szafek', () => {
  let fixture: ComponentFixture<CabinetFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CabinetFormComponent],
      providers: [
        FormBuilder,
        // Prawdziwe CabinetFormEditingService i CabinetFormTypeLifecycleService — ta sama ścieżka edycji co w aplikacji.
        { provide: DictionaryService, useClass: DictionaryServiceStub },
        { provide: KitchenStateService, useClass: KitchenStateServiceStub },
        { provide: CabinetSegmentsFormService, useClass: CabinetSegmentsFormServiceStub },
        { provide: CabinetFormValidationErrorsService, useClass: CabinetFormValidationErrorsServiceStub },
        { provide: CabinetFormCalculationService, useClass: CabinetFormCalculationServiceStub },
        { provide: CabinetSegmentValidationService, useClass: CabinetSegmentValidationServiceStub },
        { provide: MaterialPresetService, useClass: MaterialPresetServiceStub },
        { provide: TranslationService, useClass: TranslationServiceStub },
        { provide: LanguageService, useClass: LanguageServiceStub },
        { provide: ApiErrorHandler, useClass: ApiErrorHandlerStub },
        { provide: MatDialog, useClass: MatDialogStub },
        { provide: KitchenProjectLayoutService, useClass: KitchenProjectLayoutServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CabinetFormComponent);
    fixture.detectChanges();
  });

  function edit(cabinet: KitchenCabinet): void {
    fixture.componentRef.setInput('editingCabinet', cabinet);
    fixture.detectChanges();
  }

  function openOptionsTab(): void {
    const tabs: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button[role="tab"]'));
    tabs.find(tab => tab.textContent?.trim() === 'Opcje')!.click();
    fixture.detectChanges();
  }

  function enclosureLabels(side: 'left' | 'right'): string[] {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector(`select[formControlName="${side}EnclosureType"]`);
    return Array.from(select.options).map(option => option.textContent!.trim());
  }

  it('pokazuje etykiety obudowy zgodne z typem każdej kolejno edytowanej szafki', () => {
    const base = { id: 'base-1', type: KitchenCabinetType.BASE_ONE_DOOR, width: 600, height: 720, depth: 500,
      positionY: 0, openingType: 'HANDLE', shelfQuantity: 1 } as KitchenCabinet;
    const upper = { ...base, id: 'upper-1', type: KitchenCabinetType.UPPER_ONE_DOOR, depth: 340 } as KitchenCabinet;
    const baseLabels = ['Brak obudowy', 'Płyta boczna + cokół', 'Płyta boczna do podłogi', 'Blenda równoległa'];
    const upperLabels = ['Brak obudowy', 'Płyta boczna', 'Płyta boczna do sufitu', 'Blenda równoległa'];

    // Zmiana typu przełącza formularz na zakładkę „Podstawowe”, więc sekcja powstaje ponownie po otwarciu „Opcji”
    // i typ musi dotrzeć do niej z wiązania rodzica.
    for (const [cabinet, labels] of [[base, baseLabels], [upper, upperLabels], [base, baseLabels]] as const) {
      edit(cabinet);
      openOptionsTab();
      expect(fixture.componentInstance.form.get('kitchenCabinetType')?.value).toBe(cabinet.type);
      expect(enclosureLabels('left')).toEqual([...labels]);
      expect(enclosureLabels('right')).toEqual([...labels]);
    }
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
    frontMountingTypes: [
      { code: 'OVERLAY', label: 'Nakładany' },
      { code: 'INSET', label: 'Wpuszczany' }
    ],
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

class MaterialPresetServiceStub {
  listActive() {
    return of([
      {
        code: 'WHITE_STANDARD',
        translationKey: 'MATERIAL_PRESET.WHITE_STANDARD',
        defaultPreset: true,
        sortOrder: 10,
        varnishedFront: false,
        materialRequest: {
          boxMaterial: 'CHIPBOARD',
          boxBoardThickness: 18,
          boxColor: 'WHITE',
          boxVeneerColor: 'WHITE',
          frontMaterial: 'CHIPBOARD',
          frontBoardThickness: 18,
          frontColor: 'WHITE',
          frontVeneerColor: 'WHITE'
        },
        backMaterial: 'HDF',
        backBoardThickness: 3,
        backColor: 'NATURAL'
      },
      {
        code: 'WHITE_LACQUER_PREMIUM',
        translationKey: 'MATERIAL_PRESET.WHITE_LACQUER_PREMIUM',
        defaultPreset: false,
        sortOrder: 30,
        varnishedFront: true,
        materialRequest: {
          boxMaterial: 'CHIPBOARD',
          boxBoardThickness: 18,
          boxColor: 'WHITE',
          boxVeneerColor: 'WHITE',
          frontMaterial: 'MDF',
          frontBoardThickness: 18,
          frontColor: 'WHITE',
          frontVeneerColor: null
        },
        backMaterial: 'HDF',
        backBoardThickness: 3,
        backColor: 'NATURAL'
      }
    ]);
  }
}

class TranslationServiceStub {
  getByCategories() {
    return of({
      'MATERIAL_PRESET.WHITE_STANDARD': 'Biały standard',
      'MATERIAL_PRESET.WHITE_LACQUER_PREMIUM': 'Lakier biały premium'
    });
  }
}

class LanguageServiceStub {
  readonly lang = signal('pl');
}

class KitchenStateServiceStub {
  readonly selectedWallSignal = signal<WallWithCabinets | null>(buildWall('MAIN'));
  readonly selectedWall = this.selectedWallSignal;
  readonly visibleIslandSide = signal<'FRONT' | 'BACK'>('FRONT');
  readonly plinthHeightMm = signal(100);
  readonly countertopThicknessMm = signal(38);
  readonly upperFillerHeightMm = signal(100);
  readonly selectedWallId = signal('wall-1');
  readonly distanceFromWallMm = signal(560);
  readonly fillerWidthMm = signal(50);

  materialDefaults() {
    return {};
  }
}

class KitchenProjectLayoutServiceStub {
  readonly blindCornerNeighborReachMm = jasmine.createSpy('blindCornerNeighborReachMm').and.returnValue(578);

  cornerSettings() {
    return { defaultFrontThicknessMm: 18 };
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

  syncDrawerCustomHeights() {}

  getCustomHeightsTotalWarning(): string | null {
    return null;
  }
}

class CabinetFormEditingServiceStub {
  patchFormForEditing() {}
}

class CabinetFormTypeLifecycleServiceStub {
  createBaseVisibility() {
    return { openingType: true } as any;
  }

  refreshLiftMechanismDependentVisibility(form: any, visibility: any, mechanism: string | null) {
    const allowsThird = mechanism === 'AVENTOS_HK_S' || mechanism === 'AVENTOS_HF_TOP';
    const allowsHfAsymmetry = mechanism === 'AVENTOS_HF_TOP';
    if (!allowsThird) {
      form.get('allowThirdLiftMechanism')?.setValue(false, { emitEvent: false });
    }
    if (!allowsHfAsymmetry && form.get('hfUpperFrontHeightMm')?.value != null) {
      form.get('hfUpperFrontHeightMm')?.setValue(null, { emitEvent: false });
    }
    return { ...visibility, allowThirdLiftMechanism: allowsThird, hfUpperFrontHeightMm: allowsHfAsymmetry };
  }

  refreshCornerHangingVisibility(form: any, visibility: any, mechanism: string | null) {
    const wantsUpper = form.get('isUpperCorner')?.value ?? false;
    const upperBlind = mechanism === 'BLIND_CORNER' && wantsUpper;
    if (upperBlind) {
      form.patchValue({ isLiftUp: false }, { emitEvent: false });
    }
    return {
      ...visibility,
      positioningMode: upperBlind,
      gapFromCountertopMm: upperBlind,
      gapFromAnchorMm: upperBlind,
      extendedFront: upperBlind,
      liftUp: false,
      blockUpperAbove: !upperBlind
    };
  }

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
  lastMaterialOverride: unknown;
  lastPreservePersistedMaterial: boolean | undefined;

  calculateCabinet(
    type: KitchenCabinetType,
    formData: unknown,
    materialDefaults?: unknown,
    editingCabinetId?: string,
    materialOverride?: unknown,
    preservePersistedMaterial?: boolean
  ) {
    this.lastMaterialOverride = materialOverride;
    this.lastPreservePersistedMaterial = preservePersistedMaterial;
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
