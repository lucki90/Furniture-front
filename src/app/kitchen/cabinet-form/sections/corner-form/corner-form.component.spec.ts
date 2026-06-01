import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import {
  CornerHandedness,
  CornerHandleType,
  CornerMechanismType,
  CornerSystemLine,
  CornerWreathConstructionType,
  isBlindType
} from '../../model/corner-cabinet.model';
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

  // ==================== Krok ① — karty rodziny (L-kształt vs ślepy) ====================

  it('renders both family cards in the guided layout', () => {
    const cards = fixture.nativeElement.querySelectorAll('.family-card');
    expect(cards.length).toBe(2);
  });

  it('marks the blind family card as selected for BLIND_CORNER', () => {
    expect(component.cornerFamily).toBe('BLIND');
    expect(component.isFamilySelected('BLIND')).toBeTrue();
    expect(component.isFamilySelected('L')).toBeFalse();
  });

  it('switches to FIXED_SHELVES when selecting the L family', () => {
    component.selectFamily('L');
    fixture.detectChanges();

    expect(form.get('cornerMechanism')?.value).toBe(CornerMechanismType.FIXED_SHELVES);
    expect(component.cornerFamily).toBe('L');
  });

  it('switches to BLIND_CORNER when selecting the blind family from an L mechanism', () => {
    form.get('cornerMechanism')?.setValue(CornerMechanismType.FIXED_SHELVES);
    fixture.detectChanges();
    expect(component.cornerFamily).toBe('L');

    component.selectFamily('BLIND');
    fixture.detectChanges();

    expect(form.get('cornerMechanism')?.value).toBe(CornerMechanismType.BLIND_CORNER);
    expect(component.cornerFamily).toBe('BLIND');
  });

  // ==================== Krok ② — karty mechanizmów ====================

  it('renders only blind-family mechanism cards for a Type B corner', () => {
    const cards = component.mechanismCards;
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every(c => isBlindType(c.value))).toBeTrue();

    const domCards = fixture.nativeElement.querySelectorAll('.mech-card');
    expect(domCards.length).toBe(cards.length);
  });

  it('limits mechanism cards to the L family after switching family', () => {
    component.selectFamily('L');
    fixture.detectChanges();

    const cards = component.mechanismCards;
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every(c => !isBlindType(c.value))).toBeTrue();
  });

  it('flags the active mechanism card as selected', () => {
    const selected = component.mechanismCards.filter(c => c.selected);
    expect(selected.length).toBe(1);
    expect(selected[0].value).toBe(CornerMechanismType.BLIND_CORNER);
  });

  it('patches cornerMechanism when selecting a mechanism card', () => {
    component.selectMechanism(CornerMechanismType.MAGIC_CORNER_STANDARD);
    fixture.detectChanges();

    expect(form.get('cornerMechanism')?.value).toBe(CornerMechanismType.MAGIC_CORNER_STANDARD);
  });

  // ==================== Krok ⑥ — ostrzeżenia inline ====================

  it('warns when the swing front is narrower than the system minimum', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.BLIND_CORNER,
      cornerFrontUchylnyWidthMm: 100
    });
    fixture.detectChanges();

    expect(component.cornerWarnings.some(w => w.includes('Front uchylny'))).toBeTrue();
  });

  it('warns when the opening angle exceeds the system maximum', () => {
    form.get('cornerMechanism')?.setValue(CornerMechanismType.MAGIC_CORNER_STANDARD);
    fixture.detectChanges();
    form.get('cornerOpeningAngleDeg')?.setValue(120);
    fixture.detectChanges();

    expect(component.cornerWarnings.some(w => w.includes('przekracza'))).toBeTrue();
  });

  it('warns when FS1 is wider than the swing front', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.BLIND_CORNER,
      blindPanelSplitEnabled: true,
      cornerFrontUchylnyWidthMm: 400,
      blindPanelVisibleWidthMm: 450
    });
    fixture.detectChanges();

    expect(component.cornerWarnings.some(w => w.includes('FS1'))).toBeTrue();
  });

  it('renders inline warning bars when warnings are present', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.BLIND_CORNER,
      cornerFrontUchylnyWidthMm: 100
    });
    fixture.detectChanges();

    const bars = fixture.nativeElement.querySelectorAll('.corner-warning-bar');
    expect(bars.length).toBeGreaterThan(0);
  });

  // ==================== Narożnik górny (wiszący) — bez Type B (Magic/Le Mans) ====================

  it('hides the blind (Type B) family card for an upper corner', () => {
    form.patchValue({ cornerMechanism: CornerMechanismType.FIXED_SHELVES, isUpperCorner: true });
    fixture.detectChanges();

    expect(component.isUpperCorner).toBeTrue();
    const cards = fixture.nativeElement.querySelectorAll('.family-card');
    expect(cards.length).toBe(1);
  });

  it('keeps both family cards for a bottom corner', () => {
    form.patchValue({ cornerMechanism: CornerMechanismType.FIXED_SHELVES, isUpperCorner: false });
    fixture.detectChanges();

    expect(component.isUpperCorner).toBeFalse();
    expect(fixture.nativeElement.querySelectorAll('.family-card').length).toBe(2);
  });

  // ==================== Domyślna konstrukcja wieńca/półek (Type A) ====================

  it('defaults wreathConstructionType to SPLIT_RECTANGLES for a Type A corner', () => {
    form.get('cornerMechanism')?.setValue(CornerMechanismType.FIXED_SHELVES);
    fixture.detectChanges();

    expect(form.get('wreathConstructionType')?.value).toBe(CornerWreathConstructionType.SPLIT_RECTANGLES);
  });

  it('preserves an existing wreathConstructionType (edit mode) when switching to Type A', () => {
    form.get('wreathConstructionType')?.setValue(CornerWreathConstructionType.L_SHAPE_CNC);
    form.get('cornerMechanism')?.setValue(CornerMechanismType.FIXED_SHELVES);
    fixture.detectChanges();

    expect(form.get('wreathConstructionType')?.value).toBe(CornerWreathConstructionType.L_SHAPE_CNC);
  });

  // ==================== Strona narożnika (lewy/prawy) — wszystkie Type B ====================

  it('defaults cornerHandedness to LEFT and renders the side select for a Type B corner', () => {
    expect(component.isCornerTypeB).toBeTrue();
    expect(form.get('cornerHandedness')?.value).toBe(CornerHandedness.LEFT);
    expect(fixture.nativeElement.querySelector('select[formControlName="cornerHandedness"]')).not.toBeNull();
  });

  it('clears cornerHandedness for a Type A corner', () => {
    form.get('cornerMechanism')?.setValue(CornerMechanismType.FIXED_SHELVES);
    fixture.detectChanges();

    expect(form.get('cornerHandedness')?.value).toBeNull();
    expect(component.isCornerTypeB).toBeFalse();
    expect(component.showCornerFrontUchylnyWidth).toBeFalse();
  });
});
