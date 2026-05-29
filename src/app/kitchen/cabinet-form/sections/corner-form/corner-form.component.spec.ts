import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { CornerHandleType, CornerMechanismType } from '../../model/corner-cabinet.model';
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
});
