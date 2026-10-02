import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { JobPrice, JobPriceService } from '../job-price.service';
import { JobPricesSectionComponent } from './job-prices-section.component';

describe('JobPricesSectionComponent', () => {
  let service: jasmine.SpyObj<JobPriceService>;
  let component: JobPricesSectionComponent;

  beforeEach(() => {
    service = jasmine.createSpyObj<JobPriceService>('JobPriceService', ['list', 'update']);
    TestBed.configureTestingModule({
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
