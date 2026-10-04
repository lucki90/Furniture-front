import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { CabinetFormTypeLifecycleService } from '../cabinet-form/cabinet-form-type-lifecycle.service';
import { DefaultKitchenFormFactory } from '../cabinet-form/model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { KitchenCabinetStateFactory } from '../service/kitchen-cabinet-state.factory';
import { ProjectRequestBuilderService } from '../service/project-request-builder.service';
import { drawersPresetFixture } from './testing/cabinet-preset.fixture';

describe('Preset szafki — formularz i zapis konfiguracji', () => {
  let lifecycle: CabinetFormTypeLifecycleService;
  let factory: KitchenCabinetStateFactory;
  let requestBuilder: ProjectRequestBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FormBuilder] });
    lifecycle = TestBed.inject(CabinetFormTypeLifecycleService);
    factory = TestBed.inject(KitchenCabinetStateFactory);
    requestBuilder = TestBed.inject(ProjectRequestBuilderService);
  });

  it('P4: preset wypełnia formularz jak edycja szafki — wymiary i szuflady z presetu, materiały z projektu', () => {
    const form = DefaultKitchenFormFactory.create(TestBed.inject(FormBuilder));
    const cabinet = factory.fromPlacementResponse(drawersPresetFixture().cabinet, 'preset-1');
    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_WITH_DRAWERS, { emitEvent: false });

    const result = lifecycle.applyTypeChange(form, KitchenCabinetType.BASE_WITH_DRAWERS, cabinet);

    expect(result.restoreApplied).toBeTrue();
    const value = form.getRawValue();
    // Preparer typu ustawia szerokość 450 — wartość z presetu wygrywa jak przy edycji.
    expect(value.width).toBe(600);
    expect(value.height).toBe(720);
    expect(value.depth).toBe(500);
    expect(value.drawerQuantity).toBe(3);
    expect(value.drawerModel).toBe('ANTARO_TANDEMBOX');
    expect(value.useMaterialOverride).toBeFalse();
    expect(value.materialPresetCode).toBeNull();
    expect(value.gapBeforeMm).toBe(0);
  });

  it('konfiguracja do presetu ma pola szafki bez pozycji na ścianie', () => {
    const cabinet = { ...factory.fromPlacementResponse(drawersPresetFixture().cabinet, 'cab-3'), gapBeforeMm: 40 };

    const request = requestBuilder.buildCabinetConfiguration(cabinet);

    expect(request.positionX).toBe(0);
    expect(request.positionY).toBe(0);
    expect(request.kitchenCabinetType).toBe(KitchenCabinetType.BASE_WITH_DRAWERS);
    expect(request.width).toBe(600);
    expect(request.drawerRequest?.drawerQuantity).toBe(3);
    expect(request.cabinetId).toBe('cab-3');
  });
});
