import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { JobPrice, JobPriceService } from '../job-price.service';
import { JobPricesSectionComponent } from './job-prices-section.component';

describe('JobPricesSectionComponent', () => {
  let service: jasmine.SpyObj<JobPriceService>;
  let component: JobPricesSectionComponent;

  beforeEach(() => {
    service = jasmine.createSpyObj<JobPriceService>('JobPriceService', ['list', 'update']);
    TestBed.configureTestingModule({
      imports: [JobPricesSectionComponent],
      providers: [{ provide: JobPriceService, useValue: service }]
    });
    component = TestBed.runInInjectionContext(() => new JobPricesSectionComponent());
  });

  it('loads prices and exposes sorted filters scoped to the selected category', () => {
    service.list.and.returnValue(of([
      price(1, 'CUTTING', 'B'),
      price(2, 'EDGING', 'C'),
      price(3, 'CUTTING', 'A')
    ]));

    component.ngOnInit();

    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
    expect(component.categories).toEqual(['CUTTING', 'EDGING']);
    component.onCategoryChange('CUTTING');
    expect(component.variants).toEqual(['A', 'B']);
    expect(component.filteredJobPrices.map(item => item.id)).toEqual([1, 3]);
  });

  it('clears the variant filter when the category changes', () => {
    service.list.and.returnValue(of([price(1, 'CUTTING', 'A'), price(2, 'EDGING', 'B')]));
    component.ngOnInit();
    component.onVariantChange('A');

    component.onCategoryChange('EDGING');

    expect(component.variantFilter).toBe('');
    expect(component.filteredJobPrices.map(item => item.id)).toEqual([2]);
  });

  it('updates one price and completes the table edit', () => {
    const original = price(1, 'CUTTING', 'A', 10);
    const updated = price(1, 'CUTTING', 'A', 25);
    component.jobPrices = [original];
    component.filteredJobPrices = [original];
    service.update.and.returnValue(of(updated));
    const complete = jasmine.createSpy('complete');

    component.savePrice({ id: 1, price: 25, complete });

    expect(service.update).toHaveBeenCalledWith(1, { pricePerUnit: 25 });
    expect(component.jobPrices[0].pricePerUnit).toBe(25);
    expect(complete).toHaveBeenCalledOnceWith(true);
  });

  it('updates all prices returned by a bulk save', () => {
    component.jobPrices = [price(1, 'CUTTING', 'A', 10), price(2, 'CUTTING', 'B', 20)];
    component.filteredJobPrices = component.jobPrices;
    service.update.withArgs(1, { pricePerUnit: 50 }).and.returnValue(of(price(1, 'CUTTING', 'A', 50)));
    service.update.withArgs(2, { pricePerUnit: 50 }).and.returnValue(of(price(2, 'CUTTING', 'B', 50)));
    const complete = jasmine.createSpy('complete');

    component.saveBulk({ ids: [1, 2], price: 50, complete });

    expect(component.jobPrices.map(item => item.pricePerUnit)).toEqual([50, 50]);
    expect(complete).toHaveBeenCalledOnceWith(true);
  });

  describe('bulk save with independent requests', () => {
    let first: Subject<JobPrice>;
    let second: Subject<JobPrice>;
    let complete: jasmine.Spy;

    beforeEach(() => {
      component.jobPrices = [price(1, 'CUTTING', 'A', 10), price(2, 'CUTTING', 'B', 20)];
      component.filteredJobPrices = component.jobPrices;
      first = new Subject<JobPrice>();
      second = new Subject<JobPrice>();
      service.update.withArgs(1, { pricePerUnit: 50 }).and.returnValue(first);
      service.update.withArgs(2, { pricePerUnit: 50 }).and.returnValue(second);
      complete = jasmine.createSpy('complete');
    });

    it('keeps a confirmed price when another request fails afterwards', () => {
      component.saveBulk({ ids: [1, 2], price: 50, complete });

      first.next(price(1, 'CUTTING', 'A', 50));
      first.complete();
      expect(complete).not.toHaveBeenCalled();

      second.error(new Error('500'));

      expect(complete).toHaveBeenCalledOnceWith(false);
      expect(component.jobPrices.map(item => item.pricePerUnit)).toEqual([50, 20]);
      expect(component.filteredJobPrices.map(item => item.pricePerUnit)).toEqual([50, 20]);
      expect(service.list).not.toHaveBeenCalled();
    });

    it('waits for the remaining requests when a failure arrives first', () => {
      component.saveBulk({ ids: [1, 2], price: 50, complete });

      second.error(new Error('500'));
      expect(complete).not.toHaveBeenCalled();
      expect(first.observed).toBeTrue();

      first.next(price(1, 'CUTTING', 'A', 50));
      first.complete();

      expect(complete).toHaveBeenCalledOnceWith(false);
      expect(component.jobPrices.map(item => item.pricePerUnit)).toEqual([50, 20]);
      expect(component.filteredJobPrices.map(item => item.pricePerUnit)).toEqual([50, 20]);
    });

    it('keeps filters and unselected prices after a partial failure', () => {
      component.jobPrices = [
        price(1, 'CUTTING', 'A', 10),
        price(2, 'CUTTING', 'B', 20),
        price(3, 'EDGING', 'C', 30)
      ];
      component.onCategoryChange('CUTTING');
      component.onVariantChange('A');
      expect(component.filteredJobPrices.map(item => item.id)).toEqual([1]);

      component.saveBulk({ ids: [1, 2], price: 50, complete });
      first.next(price(1, 'CUTTING', 'A', 50));
      first.complete();
      second.error(new Error('500'));

      expect(component.categoryFilter).toBe('CUTTING');
      expect(component.variantFilter).toBe('A');
      expect(component.filteredJobPrices.map(item => [item.id, item.pricePerUnit])).toEqual([[1, 50]]);
      expect(component.jobPrices.map(item => item.pricePerUnit)).toEqual([50, 20, 30]);
    });

    it('completes once with failure and keeps prices when every request fails', () => {
      component.saveBulk({ ids: [1, 2], price: 50, complete });

      first.error(new Error('500'));
      second.error(new Error('500'));

      expect(complete).toHaveBeenCalledOnceWith(false);
      expect(component.jobPrices.map(item => item.pricePerUnit)).toEqual([10, 20]);
    });
  });

  describe('bulk save in the rendered table', () => {
    let fixture: ComponentFixture<JobPricesSectionComponent>;
    let first: Subject<JobPrice>;
    let second: Subject<JobPrice>;

    beforeEach(() => {
      service.list.and.returnValue(of([price(1, 'CUTTING', 'A', 10), price(2, 'CUTTING', 'B', 20)]));
      first = new Subject<JobPrice>();
      second = new Subject<JobPrice>();
      service.update.withArgs(1, { pricePerUnit: 50 }).and.returnValue(first);
      service.update.withArgs(2, { pricePerUnit: 50 }).and.returnValue(second);
      fixture = TestBed.createComponent(JobPricesSectionComponent);
      fixture.detectChanges();
      startBulkSave(fixture, 50);
    });

    it('shows the confirmed price and a partial-save notice, then unlocks the action', () => {
      first.next(price(1, 'CUTTING', 'A', 50));
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
      first.next(price(1, 'CUTTING', 'A', 50));
      first.complete();
      second.next(price(2, 'CUTTING', 'B', 50));
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
    expect(component.error).toBe('Nie udało się załadować cennika prac.');
  });
});

function price(id: number, category: string, variantCode: string, pricePerUnit = 10): JobPrice {
  return {
    id,
    jobId: id,
    jobCode: `JOB_${id}`,
    jobName: `Job ${id}`,
    jobCategory: category,
    variantCode,
    unit: 'mb',
    thicknessThresholdMm: null,
    pricePerUnit,
    jobActive: true,
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
