import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CabinetTypePickerComponent, CabinetTypePickerResult } from './cabinet-type-picker.component';
import { KitchenCabinetType } from '../model/kitchen-cabinet-type';

/**
 * Codex review fix 2026-05-28 (P2 testy FE):
 * Testy {@link CabinetTypePickerComponent} dla Iteracji 3 preset CORNER_CABINET
 * (linia 29 — `presetIsUpperCorner` w TypeCard).
 */
describe('CabinetTypePickerComponent — preset CORNER_CABINET (Iter.3 fix)', () => {
  let component: CabinetTypePickerComponent;
  let fixture: ComponentFixture<CabinetTypePickerComponent>;
  let dialogRefMock: jasmine.SpyObj<MatDialogRef<CabinetTypePickerComponent>>;

  beforeEach(async () => {
    dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [CabinetTypePickerComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { isIslandWall: false } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CabinetTypePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('powinien mieć CORNER_CABINET w sekcji "Szafki dolne" z presetIsUpperCorner=false', () => {
    const baseGroup = component.groups.find(g => g.title === 'Szafki dolne');
    expect(baseGroup).toBeDefined();
    const cornerCard = baseGroup!.types.find(c => c.type === KitchenCabinetType.CORNER_CABINET);
    expect(cornerCard).toBeDefined();
    expect(cornerCard!.presetIsUpperCorner).toBe(false);
  });

  it('powinien mieć CORNER_CABINET w sekcji "Szafki wiszące" z presetIsUpperCorner=true', () => {
    const upperGroup = component.groups.find(g => g.title === 'Szafki wiszące');
    expect(upperGroup).toBeDefined();
    const cornerCard = upperGroup!.types.find(c => c.type === KitchenCabinetType.CORNER_CABINET);
    expect(cornerCard).toBeDefined();
    expect(cornerCard!.presetIsUpperCorner).toBe(true);
  });

  it('NIE powinien mieć CORNER_CABINET w sekcji "Specjalne" (przeniesione w Iter.3)', () => {
    const specialGroup = component.groups.find(g => g.title === 'Specjalne');
    expect(specialGroup).toBeDefined();
    const cornerCard = specialGroup!.types.find(c => c.type === KitchenCabinetType.CORNER_CABINET);
    expect(cornerCard).toBeUndefined();
  });

  it('select(CORNER dolna) → dialogRef.close({type, isUpperCorner: false})', () => {
    const baseCornerCard = component.groups
      .find(g => g.title === 'Szafki dolne')!
      .types.find(c => c.type === KitchenCabinetType.CORNER_CABINET)!;

    component.select(baseCornerCard);

    const expectedResult: CabinetTypePickerResult = {
      type: KitchenCabinetType.CORNER_CABINET,
      isUpperCorner: false
    };
    expect(dialogRefMock.close).toHaveBeenCalledWith(expectedResult);
  });

  it('select(CORNER górna) → dialogRef.close({type, isUpperCorner: true})', () => {
    const upperCornerCard = component.groups
      .find(g => g.title === 'Szafki wiszące')!
      .types.find(c => c.type === KitchenCabinetType.CORNER_CABINET)!;

    component.select(upperCornerCard);

    const expectedResult: CabinetTypePickerResult = {
      type: KitchenCabinetType.CORNER_CABINET,
      isUpperCorner: true
    };
    expect(dialogRefMock.close).toHaveBeenCalledWith(expectedResult);
  });

  it('select(zwykły typ bez preset) → dialogRef.close({type}) bez isUpperCorner', () => {
    const baseOneDoorCard = component.groups
      .find(g => g.title === 'Szafki dolne')!
      .types.find(c => c.type === KitchenCabinetType.BASE_ONE_DOOR)!;

    component.select(baseOneDoorCard);

    expect(dialogRefMock.close).toHaveBeenCalledWith({ type: KitchenCabinetType.BASE_ONE_DOOR });
  });

  it('trackByType używa kompozytu type+presetIsUpperCorner (unikalny dla 2× CORNER)', () => {
    const cornerCards = component.groups
      .flatMap(g => g.types)
      .filter(c => c.type === KitchenCabinetType.CORNER_CABINET);
    expect(cornerCards.length).toBe(2); // dolna + górna

    const keys = cornerCards.map((c, i) => component['trackByType'](i, c));
    expect(new Set(keys).size).toBe(2); // unikalne klucze
  });
});

describe('CabinetTypePickerComponent — wyspa (filtrowanie typów)', () => {
  let component: CabinetTypePickerComponent;
  let fixture: ComponentFixture<CabinetTypePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CabinetTypePickerComponent],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: { isIslandWall: true } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CabinetTypePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('na wyspie ukrywa szafki wiszące — więc CORNER górna nie jest dostępna', () => {
    const upperGroup = component.groups.find(g => g.title === 'Szafki wiszące');
    expect(upperGroup).toBeUndefined();
  });

  it('na wyspie zostawia CORNER dolna (sekcja dolnych)', () => {
    const baseGroup = component.groups.find(g => g.title === 'Szafki dolne');
    expect(baseGroup).toBeDefined();
    const cornerCard = baseGroup!.types.find(c => c.type === KitchenCabinetType.CORNER_CABINET);
    expect(cornerCard).toBeDefined();
    expect(cornerCard!.presetIsUpperCorner).toBe(false);
  });
});
