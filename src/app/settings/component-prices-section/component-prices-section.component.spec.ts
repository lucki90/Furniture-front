import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ComponentPrice, ComponentPriceService } from '../component-price.service';
import { ComponentPricesSectionComponent } from './component-prices-section.component';

describe('ComponentPricesSectionComponent', () => {
  let service: jasmine.SpyObj<ComponentPriceService>;
  let component: ComponentPricesSectionComponent;

  beforeEach(() => {
    service = jasmine.createSpyObj<ComponentPriceService>('ComponentPriceService', ['list', 'update']);
    TestBed.configureTestingModule({
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
