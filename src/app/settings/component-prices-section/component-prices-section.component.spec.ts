import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ComponentPrice, ComponentPriceService } from '../component-price.service';
import { ComponentPricesSectionComponent } from './component-prices-section.component';

describe('ComponentPricesSectionComponent', () => {
  let service: jasmine.SpyObj<ComponentPriceService>;
  let component: ComponentPricesSectionComponent;

  beforeEach(() => {
    service = jasmine.createSpyObj<ComponentPriceService>('ComponentPriceService', ['list', 'update']);
    TestBed.configureTestingModule({
      imports: [ComponentPricesSectionComponent],
      providers: [{ provide: ComponentPriceService, useValue: service }]
    });
    component = TestBed.runInInjectionContext(() => new ComponentPricesSectionComponent());
  });

  it('loads prices and exposes sorted filters scoped to the selected category', () => {
    service.list.and.returnValue(of([
      price(1, 'HINGE', 'B'),
      price(2, 'DRAWER', 'C'),
      price(3, 'HINGE', 'A')
    ]));

    component.ngOnInit();

    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
    expect(component.categories).toEqual(['DRAWER', 'HINGE']);
    component.onCategoryChange('HINGE');
    expect(component.models).toEqual(['A', 'B']);
    expect(component.filteredComponentPrices.map(item => item.id)).toEqual([1, 3]);
  });

  it('clears the model filter when the category changes', () => {
    service.list.and.returnValue(of([price(1, 'HINGE', 'A'), price(2, 'DRAWER', 'B')]));
    component.ngOnInit();
    component.onModelChange('A');

    component.onCategoryChange('DRAWER');

    expect(component.modelFilter).toBe('');
    expect(component.filteredComponentPrices.map(item => item.id)).toEqual([2]);
  });

  it('updates one price and completes the table edit', () => {
    const original = price(1, 'HINGE', 'A', 10);
    const updated = price(1, 'HINGE', 'A', 25);
    component.componentPrices = [original];
    component.filteredComponentPrices = [original];
    service.update.and.returnValue(of(updated));
    const complete = jasmine.createSpy('complete');

    component.savePrice({ id: 1, price: 25, complete });

    expect(service.update).toHaveBeenCalledWith(1, { pricePerUnit: 25 });
    expect(component.componentPrices[0].pricePerUnit).toBe(25);
    expect(complete).toHaveBeenCalledOnceWith(true);
  });

  it('updates all prices returned by a bulk save', () => {
    component.componentPrices = [price(1, 'HINGE', 'A', 10), price(2, 'HINGE', 'B', 20)];
    component.filteredComponentPrices = component.componentPrices;
    service.update.withArgs(1, { pricePerUnit: 50 }).and.returnValue(of(price(1, 'HINGE', 'A', 50)));
    service.update.withArgs(2, { pricePerUnit: 50 }).and.returnValue(of(price(2, 'HINGE', 'B', 50)));
    const complete = jasmine.createSpy('complete');

    component.saveBulk({ ids: [1, 2], price: 50, complete });

    expect(component.componentPrices.map(item => item.pricePerUnit)).toEqual([50, 50]);
    expect(complete).toHaveBeenCalledOnceWith(true);
  });

  describe('bulk save with independent requests', () => {
    let first: Subject<ComponentPrice>;
    let second: Subject<ComponentPrice>;
    let complete: jasmine.Spy;

    beforeEach(() => {
      component.componentPrices = [price(1, 'HINGE', 'A', 10), price(2, 'HINGE', 'B', 20)];
      component.filteredComponentPrices = component.componentPrices;
      first = new Subject<ComponentPrice>();
      second = new Subject<ComponentPrice>();
      service.update.withArgs(1, { pricePerUnit: 50 }).and.returnValue(first);
      service.update.withArgs(2, { pricePerUnit: 50 }).and.returnValue(second);
      complete = jasmine.createSpy('complete');
    });

    it('keeps a confirmed price when another request fails afterwards', () => {
      component.saveBulk({ ids: [1, 2], price: 50, complete });

      first.next(price(1, 'HINGE', 'A', 50));
      first.complete();
      expect(complete).not.toHaveBeenCalled();

      second.error(new Error('500'));

      expect(complete).toHaveBeenCalledOnceWith(false);
      expect(component.componentPrices.map(item => item.pricePerUnit)).toEqual([50, 20]);
      expect(component.filteredComponentPrices.map(item => item.pricePerUnit)).toEqual([50, 20]);
      expect(service.list).not.toHaveBeenCalled();
    });

    it('waits for the remaining requests when a failure arrives first', () => {
      component.saveBulk({ ids: [1, 2], price: 50, complete });

      second.error(new Error('500'));
      expect(complete).not.toHaveBeenCalled();
      expect(first.observed).toBeTrue();

      first.next(price(1, 'HINGE', 'A', 50));
      first.complete();

      expect(complete).toHaveBeenCalledOnceWith(false);
      expect(component.componentPrices.map(item => item.pricePerUnit)).toEqual([50, 20]);
      expect(component.filteredComponentPrices.map(item => item.pricePerUnit)).toEqual([50, 20]);
    });

    it('keeps filters and unselected prices after a partial failure', () => {
      component.componentPrices = [
        price(1, 'HINGE', 'A', 10),
        price(2, 'HINGE', 'B', 20),
        price(3, 'DRAWER', 'C', 30)
      ];
      component.onCategoryChange('HINGE');
      component.onModelChange('A');
      expect(component.filteredComponentPrices.map(item => item.id)).toEqual([1]);

      component.saveBulk({ ids: [1, 2], price: 50, complete });
      first.next(price(1, 'HINGE', 'A', 50));
      first.complete();
      second.error(new Error('500'));

      expect(component.categoryFilter).toBe('HINGE');
      expect(component.modelFilter).toBe('A');
      expect(component.filteredComponentPrices.map(item => [item.id, item.pricePerUnit])).toEqual([[1, 50]]);
      expect(component.componentPrices.map(item => item.pricePerUnit)).toEqual([50, 20, 30]);
    });

    it('completes once with failure and keeps prices when every request fails', () => {
      component.saveBulk({ ids: [1, 2], price: 50, complete });

      first.error(new Error('500'));
      second.error(new Error('500'));

      expect(complete).toHaveBeenCalledOnceWith(false);
      expect(component.componentPrices.map(item => item.pricePerUnit)).toEqual([10, 20]);
    });
  });

  describe('bulk save in the rendered table', () => {
    let fixture: ComponentFixture<ComponentPricesSectionComponent>;
    let first: Subject<ComponentPrice>;
    let second: Subject<ComponentPrice>;

    beforeEach(() => {
      service.list.and.returnValue(of([price(1, 'HINGE', 'A', 10), price(2, 'HINGE', 'B', 20)]));
      first = new Subject<ComponentPrice>();
      second = new Subject<ComponentPrice>();
      service.update.withArgs(1, { pricePerUnit: 50 }).and.returnValue(first);
      service.update.withArgs(2, { pricePerUnit: 50 }).and.returnValue(second);
      fixture = TestBed.createComponent(ComponentPricesSectionComponent);
      fixture.detectChanges();
      startBulkSave(fixture, 50);
    });

    it('shows the confirmed price and a partial-save notice, then unlocks the action', () => {
      first.next(price(1, 'HINGE', 'A', 50));
      first.complete();
      fixture.detectChanges();
      expect(bulkButton(fixture).disabled).toBeTrue();
      expect(bulkButton(fixture).textContent).toContain('Zapisuje...');

      second.error(new Error('500'));
      fixture.detectChanges();

      expect(priceCells(fixture)).toEqual(['50.00 zł', '20.00 zł']);
      expect(bulkNotice(fixture)).toBe(
        'Potwierdzono zapis 1 z 2 pozycji. Nie udało się potwierdzić zapisu pozostałych (1) — ' +
        'ich ceny w tabeli mogą nie odpowiadać stanowi na serwerze. Zaznaczenie zostało zachowane.'
      );
      expect(bulkButton(fixture).disabled).toBeFalse();
      expect(bulkButton(fixture).textContent).toContain('Ustal cene zaznaczonym');
      expect(checkedRowCount(fixture)).toBe(2);
      expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
      expect(service.list).toHaveBeenCalledTimes(1);
    });

    it('shows a failure notice and unlocks the action when every request fails', () => {
      second.error(new Error('500'));
      fixture.detectChanges();
      expect(bulkButton(fixture).disabled).toBeTrue();

      first.error(new Error('500'));
      fixture.detectChanges();

      expect(priceCells(fixture)).toEqual(['10.00 zł', '20.00 zł']);
      expect(bulkNotice(fixture)).toBe(
        'Nie udało się potwierdzić zapisu zaznaczonych pozycji (2). ' +
        'Ceny w tabeli mogą nie odpowiadać stanowi na serwerze. Zaznaczenie zostało zachowane.'
      );
      expect(bulkButton(fixture).disabled).toBeFalse();
      expect(checkedRowCount(fixture)).toBe(2);
    });

    it('updates every price, clears the selection and shows no notice on full success', () => {
      first.next(price(1, 'HINGE', 'A', 50));
      first.complete();
      second.next(price(2, 'HINGE', 'B', 50));
      second.complete();
      fixture.detectChanges();

      expect(priceCells(fixture)).toEqual(['50.00 zł', '50.00 zł']);
      expect(bulkNotice(fixture)).toBeNull();
      expect(checkedRowCount(fixture)).toBe(0);
      expect(fixture.nativeElement.querySelector('.pte-action-bar')).toBeNull();
    });

    it('lets the user edit and save a single price after a partial bulk failure', async () => {
      first.next(price(1, 'HINGE', 'A', 50));
      first.complete();
      second.error(new Error('500'));
      fixture.detectChanges();
      const single = new Subject<ComponentPrice>();
      service.update.withArgs(2, { pricePerUnit: 30 }).and.returnValue(single);

      expect(rowButton(fixture, 1, EDIT)!.disabled).toBeFalse();
      await startSingleSave(fixture, 1, 30);
      expect(service.update).toHaveBeenCalledWith(2, { pricePerUnit: 30 });

      single.next(price(2, 'HINGE', 'B', 30));
      single.complete();
      fixture.detectChanges();

      expect(priceCells(fixture)).toEqual(['50.00 zł', '30.00 zł']);
      expect(bulkButton(fixture).disabled).toBeFalse();
    });
  });

  describe('single save in the rendered table', () => {
    let fixture: ComponentFixture<ComponentPricesSectionComponent>;
    let requests: Subject<ComponentPrice>[];

    beforeEach(async () => {
      service.list.and.returnValue(of([
        price(1, 'HINGE', 'A', 10),
        price(2, 'HINGE', 'B', 20),
        price(3, 'DRAWER', 'C', 30)
      ]));
      requests = [];
      service.update.and.callFake(() => {
        const request = new Subject<ComponentPrice>();
        requests.push(request);
        return request;
      });
      fixture = TestBed.createComponent(ComponentPricesSectionComponent);
      fixture.detectChanges();
      await startSingleSave(fixture, 0, 25);
    });

    it('keeps the editor of the pending row when another row is clicked', () => {
      expect(service.update).toHaveBeenCalledOnceWith(1, { pricePerUnit: 25 });

      rowButton(fixture, 1, EDIT)!.click();
      fixture.detectChanges();

      expect(editingRowIndex(fixture)).toBe(0);
      expect(rowButton(fixture, 0, SAVE)!.disabled).toBeTrue();
      expect(rowButton(fixture, 0, CANCEL)!.disabled).toBeTrue();
      expect(rowButton(fixture, 1, EDIT)!.disabled).toBeTrue();
      expect(rowButton(fixture, 2, EDIT)!.disabled).toBeTrue();
    });

    it('does not send a second update after Anuluj, Edytuj and Zapisz while the first is pending', async () => {
      rowButton(fixture, 0, CANCEL)!.click();
      fixture.detectChanges();
      rowButton(fixture, 1, EDIT)?.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.nativeElement.querySelector('tbody .btn-primary')?.click();
      fixture.detectChanges();

      expect(service.update).toHaveBeenCalledTimes(1);
      expect(editingRowIndex(fixture)).toBe(0);
    });

    it('shows the confirmed price and unlocks editing after success', async () => {
      requests[0].next(price(1, 'HINGE', 'A', 25));
      requests[0].complete();
      fixture.detectChanges();

      expect(priceCells(fixture)).toEqual(['25.00 zł', '20.00 zł', '30.00 zł']);
      expect(editingRowIndex(fixture)).toBe(-1);
      expect(rowButton(fixture, 1, EDIT)!.disabled).toBeFalse();

      await startSingleSave(fixture, 1, 40);
      expect(service.update).toHaveBeenCalledTimes(2);
      expect(service.update.calls.mostRecent().args).toEqual([2, { pricePerUnit: 40 }]);
    });

    it('keeps the draft and lets the user retry after a failure', async () => {
      requests[0].error(new Error('500'));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(editingRowIndex(fixture)).toBe(0);
      expect(editorInput(fixture)!.value).toBe('25');
      expect(rowButton(fixture, 0, SAVE)!.disabled).toBeFalse();
      expect(rowButton(fixture, 0, CANCEL)!.disabled).toBeFalse();
      expect(rowButton(fixture, 1, EDIT)!.disabled).toBeFalse();
      expect(priceCells(fixture)).toEqual(['20.00 zł', '30.00 zł']);

      rowButton(fixture, 0, SAVE)!.click();
      fixture.detectChanges();

      expect(service.update).toHaveBeenCalledTimes(2);
      expect(service.update.calls.mostRecent().args).toEqual([1, { pricePerUnit: 25 }]);
    });

    it('blocks a new edit until the pending update settles after a filter hides the editor', () => {
      chooseCategory(fixture, 'DRAWER');

      expect(editingRowIndex(fixture)).toBe(-1);
      expect(rowButton(fixture, 0, EDIT)!.disabled).toBeTrue();
      rowButton(fixture, 0, EDIT)!.click();
      fixture.detectChanges();
      expect(editingRowIndex(fixture)).toBe(-1);

      requests[0].next(price(1, 'HINGE', 'A', 25));
      requests[0].complete();
      fixture.detectChanges();

      expect(fixture.componentInstance.componentPrices.map(item => item.pricePerUnit)).toEqual([25, 20, 30]);
      expect(rowButton(fixture, 0, EDIT)!.disabled).toBeFalse();
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('does not start a bulk save while a single update is pending', () => {
      selectAllAndTypeBulkPrice(fixture, 50);

      expect(bulkButton(fixture).disabled).toBeTrue();
      bulkButton(fixture).click();
      fixture.detectChanges();
      expect(service.update).toHaveBeenCalledTimes(1);

      requests[0].next(price(1, 'HINGE', 'A', 25));
      requests[0].complete();
      fixture.detectChanges();

      expect(bulkButton(fixture).disabled).toBeFalse();
      bulkButton(fixture).click();
      fixture.detectChanges();
      expect(service.update).toHaveBeenCalledTimes(4);
    });
  });

  describe('single edit while a bulk save is pending', () => {
    let fixture: ComponentFixture<ComponentPricesSectionComponent>;
    let requests: Subject<ComponentPrice>[];

    beforeEach(async () => {
      service.list.and.returnValue(of([price(1, 'HINGE', 'A', 10), price(2, 'HINGE', 'B', 20)]));
      requests = [];
      service.update.and.callFake(() => {
        const request = new Subject<ComponentPrice>();
        requests.push(request);
        return request;
      });
      fixture = TestBed.createComponent(ComponentPricesSectionComponent);
      fixture.detectChanges();
      await openEditor(fixture, 0);
      typeEditorPrice(fixture, 25);
      startBulkSave(fixture, 50);
    });

    it('does not save an open editor or open another one until the bulk save settles', () => {
      expect(service.update).toHaveBeenCalledTimes(2);
      expect(rowButton(fixture, 0, SAVE)!.disabled).toBeTrue();
      expect(rowButton(fixture, 1, EDIT)!.disabled).toBeTrue();

      rowButton(fixture, 0, SAVE)!.click();
      rowButton(fixture, 1, EDIT)!.click();
      fixture.detectChanges();

      expect(service.update).toHaveBeenCalledTimes(2);
      expect(editingRowIndex(fixture)).toBe(0);
    });

    it('lets the open editor save once the bulk save has partially failed', () => {
      requests[0].error(new Error('500'));
      requests[1].next(price(2, 'HINGE', 'B', 50));
      requests[1].complete();
      fixture.detectChanges();

      expect(bulkNotice(fixture)).toContain('Potwierdzono zapis 1 z 2 pozycji.');
      expect(rowButton(fixture, 0, SAVE)!.disabled).toBeFalse();
      expect(rowButton(fixture, 1, EDIT)!.disabled).toBeFalse();

      rowButton(fixture, 0, SAVE)!.click();
      fixture.detectChanges();

      expect(service.update).toHaveBeenCalledTimes(3);
      expect(service.update.calls.mostRecent().args).toEqual([1, { pricePerUnit: 25 }]);
    });
  });

  it('shows a load error without leaving the loading state active', () => {
    service.list.and.returnValue(throwError(() => new Error('offline')));

    component.load();

    expect(component.loading).toBeFalse();
    expect(component.error).toBe('Nie udało się załadować cennika komponentów.');
  });
});

function price(id: number, category: string, modelCode: string, pricePerUnit = 10): ComponentPrice {
  return {
    id,
    componentId: id,
    componentCode: `COMP_${id}`,
    componentName: `Component ${id}`,
    category,
    modelCode,
    additionalInfo: null,
    unit: 'szt.',
    pricePerUnit,
    componentActive: true,
    variantActive: true,
    priceEntryId: id,
    updatedAt: null
  };
}

function selectAllAndTypeBulkPrice(fixture: ComponentFixture<unknown>, value: number): void {
  const root: HTMLElement = fixture.nativeElement;
  root.querySelector<HTMLInputElement>('thead input[type="checkbox"]')!.click();
  fixture.detectChanges();
  const priceInput = root.querySelector<HTMLInputElement>('.pte-action-bar input')!;
  priceInput.value = String(value);
  priceInput.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

function startBulkSave(fixture: ComponentFixture<unknown>, value: number): void {
  selectAllAndTypeBulkPrice(fixture, value);
  bulkButton(fixture).click();
  fixture.detectChanges();
}

const EDIT = '.btn-outline:not(.pte-btn-cancel)';
const SAVE = '.btn-primary';
const CANCEL = '.pte-btn-cancel';

function rowButton(fixture: ComponentFixture<unknown>, rowIndex: number, selector: string): HTMLButtonElement | null {
  const row = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')[rowIndex];
  return row?.querySelector<HTMLButtonElement>(`.pte-actions-cell ${selector}`) ?? null;
}

function editorInput(fixture: ComponentFixture<unknown>): HTMLInputElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('tbody .pte-price-input');
}

function editingRowIndex(fixture: ComponentFixture<unknown>): number {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'))
    .findIndex(row => row.querySelector('.pte-price-input') !== null);
}

async function openEditor(fixture: ComponentFixture<unknown>, rowIndex: number): Promise<void> {
  rowButton(fixture, rowIndex, EDIT)!.click();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function typeEditorPrice(fixture: ComponentFixture<unknown>, value: number): void {
  const input = editorInput(fixture)!;
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

async function startSingleSave(fixture: ComponentFixture<unknown>, rowIndex: number, value: number): Promise<void> {
  await openEditor(fixture, rowIndex);
  typeEditorPrice(fixture, value);
  rowButton(fixture, rowIndex, SAVE)!.click();
  fixture.detectChanges();
}

function chooseCategory(fixture: ComponentFixture<unknown>, category: string): void {
  const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('.price-toolbar select')!;
  select.value = Array.from(select.options).find(option => option.textContent!.trim() === category)!.value;
  select.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

function bulkButton(fixture: ComponentFixture<unknown>): HTMLButtonElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.pte-action-bar .btn-primary')!;
}

function priceCells(fixture: ComponentFixture<unknown>): string[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.pte-price-cell'))
    .map(cell => cell.textContent!.trim());
}

function bulkNotice(fixture: ComponentFixture<unknown>): string | null {
  return (fixture.nativeElement as HTMLElement).querySelector('.pte-bulk-error')?.textContent?.trim() ?? null;
}

function checkedRowCount(fixture: ComponentFixture<unknown>): number {
  return (fixture.nativeElement as HTMLElement).querySelectorAll('tbody input[type="checkbox"]:checked').length;
}
