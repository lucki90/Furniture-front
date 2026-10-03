import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormBuilder } from '@angular/forms';
import { EnclosureFormComponent } from './enclosure-form.component';
import { CabinetFormEditingService } from '../../cabinet-form-editing.service';
import { CabinetFormTypeLifecycleService } from '../../cabinet-form-type-lifecycle.service';
import { CabinetSegmentsFormService } from '../../cabinet-segments-form.service';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { CabinetFormData, KitchenCabinet } from '../../../model/kitchen-state.model';
import { CabinetResponse } from '../../model/kitchen-cabinet-form.model';
import { KitchenStateService } from '../../../service/kitchen-state.service';
import { KitchenCabinetStateFactory } from '../../../service/kitchen-cabinet-state.factory';
import { ProjectRequestBuilderService } from '../../../service/project-request-builder.service';
import { ProjectWallCabinetsBuilder } from '../../../service/project-wall-cabinets.builder';
import { ProjectWallAddonsRequestBuilder } from '../../../service/project-wall-addons-request.builder';
import { KitchenGeometryService } from '../../../service/kitchen-geometry.service';

const BASE_LABELS = ['Brak obudowy', 'Płyta boczna + cokół', 'Płyta boczna do podłogi', 'Blenda równoległa'];
const UPPER_LABELS = ['Brak obudowy', 'Płyta boczna', 'Płyta boczna do sufitu', 'Blenda równoległa'];
const OPTION_CODES = ['NONE', 'SIDE_PLATE_WITH_PLINTH', 'SIDE_PLATE_TO_FLOOR', 'PARALLEL_FILLER_STRIP'];

/**
 * Host odwzorowujący CabinetFormComponent: OnPush, współdzielony formularz, sekcja zamontowana na stałe
 * i to samo wiązanie wejść sekcji co w cabinet-form.component.html.
 */
@Component({
  standalone: true,
  imports: [EnclosureFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-enclosure-form [form]="form" [cabinetType]="form.get('kitchenCabinetType')?.value"></app-enclosure-form>`
})
class EnclosureHostComponent {
  readonly form = DefaultKitchenFormFactory.create(inject(FormBuilder));
  private readonly editingService = inject(CabinetFormEditingService);
  private readonly lifecycle = inject(CabinetFormTypeLifecycleService);
  private readonly cdr = inject(ChangeDetectorRef);
  private editingCabinet: KitchenCabinet | null = null;
  enclosureSectionVisible = false;

  constructor() {
    // Jak rodzic: zwykła (emitowana) zmiana typu uruchamia lifecycle typu.
    this.form.get('kitchenCabinetType')!.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(type => this.onTypeChange(type as KitchenCabinetType));
  }

  /** Ta sama ścieżka co CabinetFormComponent.fillFormWithCabinet(): cichy patch i lifecycle typu. */
  edit(cabinet: KitchenCabinet): void {
    this.editingCabinet = cabinet;
    this.editingService.patchFormForEditing(this.form, cabinet);
    this.onTypeChange(cabinet.type);
  }

  /** Odpowiednik CabinetFormComponent.onTypeChange() bez obsługi zakładek i innych sekcji. */
  private onTypeChange(type: KitchenCabinetType): void {
    const result = this.lifecycle.applyTypeChange(this.form, type, this.editingCabinet);
    this.enclosureSectionVisible = result.visibility.enclosureSection;
    this.cdr.markForCheck();
  }
}

describe('EnclosureFormComponent', () => {
  let fixture: ComponentFixture<EnclosureHostComponent>;
  let host: EnclosureHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnclosureHostComponent],
      providers: [
        FormBuilder,
        { provide: KitchenStateService, useValue: { fillerWidthMm: signal(50), distanceFromWallMm: signal(560) } },
        // Szafki jednodrzwiowe nie mają segmentów — serwis segmentów nie jest używany przy odtwarzaniu.
        { provide: CabinetSegmentsFormService, useValue: jasmine.createSpyObj('CabinetSegmentsFormService', ['replaceSegments']) },
        KitchenCabinetStateFactory,
        ProjectRequestBuilderService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EnclosureHostComponent);
    host = fixture.componentInstance;
  });

  function section(): EnclosureFormComponent {
    return fixture.debugElement.query(By.directive(EnclosureFormComponent)).componentInstance;
  }

  function select(side: 'left' | 'right'): HTMLSelectElement {
    return fixture.nativeElement.querySelector(`select[formControlName="${side}EnclosureType"]`);
  }

  function optionLabels(side: 'left' | 'right'): string[] {
    return Array.from(select(side).options).map(option => option.textContent!.trim());
  }

  function optionCodes(side: 'left' | 'right'): string[] {
    return Array.from(select(side).options).map(option => option.value);
  }

  function selectedLabel(side: 'left' | 'right'): string {
    const element = select(side);
    return element.options[element.selectedIndex].textContent!.trim();
  }

  function expectLabels(expected: string[]): void {
    expect(optionLabels('left')).toEqual(expected);
    expect(optionLabels('right')).toEqual(expected);
    expect(optionCodes('left')).toEqual(OPTION_CODES);
    expect(optionCodes('right')).toEqual(OPTION_CODES);
  }

  /** Edycja szafki w już wyrenderowanym widoku (po pierwszym renderze) — bez ponownego montażu sekcji. */
  function editMounted(cabinet: KitchenCabinet): void {
    host.edit(cabinet);
    fixture.detectChanges();
  }

  it('aktualizuje etykiety w obu selectach po odtworzeniu szafki wiszącej po dolnej', () => {
    host.edit(baseCabinet({ leftEnclosureType: 'SIDE_PLATE_WITH_PLINTH', rightEnclosureType: 'SIDE_PLATE_TO_FLOOR' }));
    fixture.detectChanges();
    const mountedSection = section();
    expect(host.enclosureSectionVisible).toBeTrue();
    expectLabels(BASE_LABELS);
    expect(selectedLabel('left')).toBe('Płyta boczna + cokół');
    expect(selectedLabel('right')).toBe('Płyta boczna do podłogi');

    editMounted(upperCabinet({ leftEnclosureType: 'SIDE_PLATE_TO_FLOOR', rightEnclosureType: 'SIDE_PLATE_WITH_PLINTH' }));

    expect(section()).toBe(mountedSection);
    expect(mountedSection.form).toBe(host.form);
    expect(host.form.get('kitchenCabinetType')?.value).toBe(KitchenCabinetType.UPPER_ONE_DOOR);
    expect(host.enclosureSectionVisible).toBeTrue();
    expectLabels(UPPER_LABELS);
    expect(selectedLabel('left')).toBe('Płyta boczna do sufitu');
    expect(selectedLabel('right')).toBe('Płyta boczna');
    expect(fixture.nativeElement.textContent).not.toContain('cokół');
    expect(fixture.nativeElement.textContent).not.toContain('do podłogi');
  });

  it('aktualizuje etykiety po odtworzeniu szafki dolnej po wiszącej', () => {
    host.edit(upperCabinet({ leftEnclosureType: 'SIDE_PLATE_WITH_PLINTH', rightEnclosureType: 'SIDE_PLATE_TO_FLOOR' }));
    fixture.detectChanges();
    const mountedSection = section();
    expectLabels(UPPER_LABELS);

    editMounted(baseCabinet({ leftEnclosureType: 'SIDE_PLATE_TO_FLOOR', rightEnclosureType: 'SIDE_PLATE_WITH_PLINTH' }));

    expect(section()).toBe(mountedSection);
    expectLabels(BASE_LABELS);
    expect(selectedLabel('left')).toBe('Płyta boczna do podłogi');
    expect(selectedLabel('right')).toBe('Płyta boczna + cokół');
  });

  it('synchronizuje etykiety przy kolejnych edycjach BASE → UPPER → BASE w tej samej sekcji', () => {
    host.edit(baseCabinet({ id: 'base-1' }));
    fixture.detectChanges();
    const mountedSection = section();
    expectLabels(BASE_LABELS);

    editMounted(upperCabinet({ id: 'upper-1' }));
    expect(section()).toBe(mountedSection);
    expectLabels(UPPER_LABELS);

    editMounted(baseCabinet({ id: 'base-2' }));
    expect(section()).toBe(mountedSection);
    expectLabels(BASE_LABELS);
  });

  it('nadal aktualizuje widok po zwykłej zmianie typu z emitowanym zdarzeniem', () => {
    fixture.detectChanges();
    const mountedSection = section();
    expect(host.form.get('kitchenCabinetType')?.value).toBe(KitchenCabinetType.BASE_ONE_DOOR);
    expectLabels(BASE_LABELS);

    host.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_ONE_DOOR);
    fixture.detectChanges();
    expect(section()).toBe(mountedSection);
    expectLabels(UPPER_LABELS);

    host.form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.BASE_ONE_DOOR);
    fixture.detectChanges();
    expect(section()).toBe(mountedSection);
    expectLabels(BASE_LABELS);
  });

  it('zachowuje stabilne opcje i elementy option (trackBy) między sprawdzeniami i edycjami', () => {
    host.edit(baseCabinet());
    fixture.detectChanges();
    const baseOptions = section().enclosureOptions;
    const optionElements = Array.from(select('left').options);

    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(section().enclosureOptions).toBe(baseOptions);

    editMounted(upperCabinet({ id: 'upper-1' }));
    const upperOptions = section().enclosureOptions;
    expect(upperOptions).not.toBe(baseOptions);
    editMounted(upperCabinet({ id: 'upper-2' }));
    expect(section().enclosureOptions).toBe(upperOptions);

    // trackBy po kodzie: zmiana strefy podmienia tylko etykiety, elementy <option> pozostają te same.
    const currentElements = Array.from(select('left').options);
    expect(currentElements.length).toBe(optionElements.length);
    currentElements.forEach((element, index) => expect(element).toBe(optionElements[index]));
    expectLabels(UPPER_LABELS);
  });

  it('zmiana etykiet nie zmienia wartości obudowy, podpór, blendy, głębokości ani kodów w requeście', () => {
    host.edit(baseCabinet({
      leftEnclosureType: 'PARALLEL_FILLER_STRIP',
      leftSupportPlate: true,
      leftFillerWidthOverrideMm: 60,
      rightEnclosureType: 'SIDE_PLATE_TO_FLOOR',
      distanceFromWallMm: 580
    }));
    fixture.detectChanges();
    const mountedSection = section();

    const upper = upperCabinet({
      leftEnclosureType: 'SIDE_PLATE_TO_FLOOR',
      leftSupportPlate: false,
      leftFillerWidthOverrideMm: null,
      rightEnclosureType: 'PARALLEL_FILLER_STRIP',
      rightSupportPlate: true,
      rightFillerWidthOverrideMm: 80,
      distanceFromWallMm: 450
    });
    editMounted(upper);

    expect(section()).toBe(mountedSection);
    expectLabels(UPPER_LABELS);
    const expectedEnclosure = {
      leftEnclosureType: 'SIDE_PLATE_TO_FLOOR',
      rightEnclosureType: 'PARALLEL_FILLER_STRIP',
      leftSupportPlate: false,
      rightSupportPlate: true,
      leftFillerWidthOverrideMm: null,
      rightFillerWidthOverrideMm: 80,
      distanceFromWallMm: 450
    };
    expect(enclosureValues()).toEqual(expectedEnclosure);

    // Widok pokazuje odtworzone wartości z etykietami szafki wiszącej.
    expect(select('left').value).toBe('SIDE_PLATE_TO_FLOOR');
    expect(selectedLabel('left')).toBe('Płyta boczna do sufitu');
    expect(select('right').value).toBe('PARALLEL_FILLER_STRIP');
    expect(selectedLabel('right')).toBe('Blenda równoległa');
    expect(input('leftFillerW')).toBeNull();
    expect(input('rightFillerW')?.value).toBe('80');
    expect(supportCheckboxes().length).toBe(1);
    expect(supportCheckboxes()[0].checked).toBeTrue();
    expect(input('distanceFromWallMm')?.value).toBe('450');

    // Kolejne sprawdzenie widoku nie nadpisuje formularza.
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(enclosureValues()).toEqual(expectedEnclosure);

    // Mapowanie zapisu projektu nadal wysyła te same kody enum.
    const cabinet = TestBed.inject(KitchenCabinetStateFactory)
      .fromFormData(host.form.getRawValue() as CabinetFormData, upper.id, emptyCalculationResponse());
    const [request] = new ProjectWallCabinetsBuilder(new ProjectWallAddonsRequestBuilder(), new KitchenGeometryService())
      .buildCabinets(
        { id: 'wall-1', type: 'MAIN', widthMm: 3000, heightMm: 2600, cabinets: [cabinet] },
        { plinthHeightMm: 100, countertopThicknessMm: 38, upperFillerHeightMm: 100, fillerWidthMm: 50 }
      );
    expect(request.kitchenCabinetType).toBe(KitchenCabinetType.UPPER_ONE_DOOR);
    expect(request.leftEnclosure).toEqual({ type: 'SIDE_PLATE_TO_FLOOR', supportPlate: false, fillerWidthOverrideMm: null });
    expect(request.rightEnclosure).toEqual({ type: 'PARALLEL_FILLER_STRIP', supportPlate: true, fillerWidthOverrideMm: 80 });
    expect(request.distanceFromWallMm).toBe(450);
  });

  function enclosureValues() {
    const raw = host.form.getRawValue();
    return {
      leftEnclosureType: raw.leftEnclosureType,
      rightEnclosureType: raw.rightEnclosureType,
      leftSupportPlate: raw.leftSupportPlate,
      rightSupportPlate: raw.rightSupportPlate,
      leftFillerWidthOverrideMm: raw.leftFillerWidthOverrideMm,
      rightFillerWidthOverrideMm: raw.rightFillerWidthOverrideMm,
      distanceFromWallMm: raw.distanceFromWallMm
    };
  }

  function input(id: string): HTMLInputElement | null {
    return fixture.nativeElement.querySelector(`#${id}`);
  }

  function supportCheckboxes(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type="checkbox"]'));
  }
});

function baseCabinet(overrides: Partial<KitchenCabinet> = {}): KitchenCabinet {
  return {
    id: 'base-1',
    type: KitchenCabinetType.BASE_ONE_DOOR,
    width: 600,
    height: 720,
    depth: 500,
    positionY: 0,
    openingType: 'HANDLE',
    shelfQuantity: 1,
    ...overrides
  } as KitchenCabinet;
}

function upperCabinet(overrides: Partial<KitchenCabinet> = {}): KitchenCabinet {
  return {
    id: 'upper-1',
    type: KitchenCabinetType.UPPER_ONE_DOOR,
    width: 600,
    height: 720,
    depth: 340,
    positionY: 0,
    openingType: 'HANDLE',
    shelfQuantity: 1,
    ...overrides
  } as KitchenCabinet;
}

function emptyCalculationResponse(): CabinetResponse {
  return { boards: [], components: [], jobs: [] } as unknown as CabinetResponse;
}
