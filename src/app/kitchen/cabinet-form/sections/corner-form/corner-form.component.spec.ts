import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { CornerHandleType, CornerMechanismType, CornerSystemLine } from '../../model/corner-cabinet.model';
import { CornerFormComponent } from './corner-form.component';

describe('CornerFormComponent', () => {
  let fixture: ComponentFixture<CornerFormComponent>;
  let component: CornerFormComponent;
  let form: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CornerFormComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CornerFormComponent);
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

  it('revalidates blind-panel width when the split checkbox changes', () => {
    expect(form.get('blindPanelVisibleWidthMm')?.errors).toBeNull();

    form.get('blindPanelSplitEnabled')?.setValue(true);
    fixture.detectChanges();

    expect(form.get('blindPanelVisibleWidthMm')?.hasError('min')).toBeTrue();
  });

  it('shows opening-type and wreath-construction selects for upper Type A corner', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.FIXED_SHELVES,
      isUpperCorner: true
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select[formControlName="cornerOpeningType"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('select[formControlName="wreathConstructionType"]')).not.toBeNull();
  });

  it('keeps width B enabled for upper Type A corner', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.FIXED_SHELVES,
      isUpperCorner: true
    });

    fixture.detectChanges();

    expect(component.showCornerWidthB).toBeTrue();
  });

  it('revalidates blind-panel min when handle type changes', () => {
    form.patchValue({
      blindPanelSplitEnabled: true,
      cornerHandleType: CornerHandleType.MILLED,
      blindPanelVisibleWidthMm: 14
    });

    fixture.detectChanges();

    expect(form.get('blindPanelVisibleWidthMm')?.hasError('min')).toBeTrue();

    form.get('cornerHandleType')?.setValue(CornerHandleType.PUSH_TO_OPEN);
    fixture.detectChanges();

    expect(form.get('blindPanelVisibleWidthMm')?.errors).toBeNull();
  });

  // ==================== Domyślne parametry systemowe (Magic Corner / Le Mans) ====================

  it('fills Magic Comfort defaults (line 450, angle 90, thickness 18) on selection', () => {
    form.get('cornerMechanism')?.setValue(CornerMechanismType.MAGIC_CORNER_COMFORT);
    fixture.detectChanges();

    expect(form.get('cornerSystemLine')?.value).toBe(CornerSystemLine.LINE_450);
    expect(form.get('cornerOpeningAngleDeg')?.value).toBe(90);
    expect(form.get('cornerFrontThicknessMm')?.value).toBe(18);
  });

  it('fills Magic Standard defaults (line 400, angle 75, thickness 18) on selection', () => {
    form.get('cornerMechanism')?.setValue(CornerMechanismType.MAGIC_CORNER_STANDARD);
    fixture.detectChanges();

    expect(form.get('cornerSystemLine')?.value).toBe(CornerSystemLine.LINE_400);
    expect(form.get('cornerOpeningAngleDeg')?.value).toBe(75);
    expect(form.get('cornerFrontThicknessMm')?.value).toBe(18);
  });

  it('fills Le Mans defaults (angle 90, thickness 18) without forcing a system line', () => {
    form.get('cornerMechanism')?.setValue(CornerMechanismType.LE_MANS_I);
    fixture.detectChanges();

    expect(form.get('cornerOpeningAngleDeg')?.value).toBe(90);
    expect(form.get('cornerFrontThicknessMm')?.value).toBe(18);
    expect(form.get('cornerSystemLine')?.value).toBeNull();
  });

  it('corrects an out-of-range angle when switching Comfort (90) -> Standard (max 75)', () => {
    form.get('cornerMechanism')?.setValue(CornerMechanismType.MAGIC_CORNER_COMFORT);
    fixture.detectChanges();
    expect(form.get('cornerOpeningAngleDeg')?.value).toBe(90);

    form.get('cornerMechanism')?.setValue(CornerMechanismType.MAGIC_CORNER_STANDARD);
    fixture.detectChanges();

    expect(form.get('cornerOpeningAngleDeg')?.value).toBe(75);
  });

  it('preserves a valid user-set angle (edit mode) instead of overwriting with the default', () => {
    form.get('cornerOpeningAngleDeg')?.setValue(100);

    form.get('cornerMechanism')?.setValue(CornerMechanismType.LE_MANS_II);
    fixture.detectChanges();

    expect(form.get('cornerOpeningAngleDeg')?.value).toBe(100);
  });

  it('clears system params when switching back to BLIND_CORNER', () => {
    form.get('cornerMechanism')?.setValue(CornerMechanismType.MAGIC_CORNER_COMFORT);
    fixture.detectChanges();
    expect(form.get('cornerOpeningAngleDeg')?.value).toBe(90);

    form.get('cornerMechanism')?.setValue(CornerMechanismType.BLIND_CORNER);
    fixture.detectChanges();

    expect(form.get('cornerOpeningAngleDeg')?.value).toBeNull();
    expect(form.get('cornerSystemLine')?.value).toBeNull();
    expect(form.get('cornerFrontThicknessMm')?.value).toBeNull();
  });
});
