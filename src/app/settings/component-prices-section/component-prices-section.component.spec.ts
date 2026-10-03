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

function startBulkSave(fixture: ComponentFixture<unknown>, value: number): void {
  const root: HTMLElement = fixture.nativeElement;
  root.querySelector<HTMLInputElement>('thead input[type="checkbox"]')!.click();
  fixture.detectChanges();
  const priceInput = root.querySelector<HTMLInputElement>('.pte-action-bar input')!;
  priceInput.value = String(value);
  priceInput.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  bulkButton(fixture).click();
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
