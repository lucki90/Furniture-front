import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { CornerMechanismType, CornerSystemLine } from '../../model/corner-cabinet.model';
import { CornerOptionsFormComponent } from './corner-options-form.component';

describe('CornerOptionsFormComponent', () => {
  let fixture: ComponentFixture<CornerOptionsFormComponent>;
  let component: CornerOptionsFormComponent;
  let form: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CornerOptionsFormComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CornerOptionsFormComponent);
    component = fixture.componentInstance;

    form = DefaultKitchenFormFactory.create(new FormBuilder());
    form.patchValue({
      kitchenCabinetType: KitchenCabinetType.CORNER_CABINET,
      cornerMechanism: CornerMechanismType.BLIND_CORNER,
      blindPanelSplitEnabled: false,
      blindPanelVisibleWidthMm: 49
    });

    component.form = form;
    fixture.detectChanges();
  });

  it('renders the blind-corner split section for Type B (no system params)', () => {
    expect(component.isCornerTypeB).toBeTrue();
    expect(component.showSystemParams).toBeFalse();
    expect(component.hasCornerOptions).toBeTrue();
    // Default (blind) configuration is rendered on the first change-detection pass.
    expect(fixture.nativeElement.querySelector('input[formControlName="blindPanelSplitEnabled"]')).not.toBeNull();
  });

  it('exposes system parameters only for Magic / Le Mans mechanisms', () => {
    form.patchValue({ cornerMechanism: CornerMechanismType.LE_MANS_II });

    expect(component.showSystemParams).toBeTrue();
    expect(component.hasCornerOptions).toBeTrue();
  });

  it('filters out LINE_400 from the system-line dropdown for Magic Corner Comfort', () => {
    form.patchValue({ cornerMechanism: CornerMechanismType.MAGIC_CORNER_COMFORT });

    const lines = component.cornerSystemLineOptions.map(o => o.value);
    expect(lines).not.toContain(CornerSystemLine.LINE_400);
  });

  it('keeps LINE_400 available for Magic Corner Standard', () => {
    form.patchValue({ cornerMechanism: CornerMechanismType.MAGIC_CORNER_STANDARD });

    const lines = component.cornerSystemLineOptions.map(o => o.value);
    expect(lines).toContain(CornerSystemLine.LINE_400);
  });

  it('revalidates blind-panel width when the split checkbox changes (options tab)', () => {
    expect(form.get('blindPanelVisibleWidthMm')?.errors).toBeNull();

    form.get('blindPanelSplitEnabled')?.setValue(true);

    expect(form.get('blindPanelVisibleWidthMm')?.hasError('min')).toBeTrue();
  });

  it('has no content for Type A mechanisms without system params', () => {
    form.patchValue({ cornerMechanism: CornerMechanismType.FIXED_SHELVES });

    expect(component.isCornerTypeB).toBeFalse();
    expect(component.showSystemParams).toBeFalse();
    expect(component.hasCornerOptions).toBeFalse();
  });

  it('marks the system line as order-only metadata for Le Mans (P3)', () => {
    form.patchValue({ cornerMechanism: CornerMechanismType.LE_MANS_I });

    expect(component.cornerSystemLineHint).toContain('nie wpływa na wymiary');
  });

  it('describes the system line as a dimension driver for Magic Corner', () => {
    form.patchValue({ cornerMechanism: CornerMechanismType.MAGIC_CORNER_STANDARD });

    expect(component.cornerSystemLineHint).toContain('min. szerokość frontu');
  });
});
