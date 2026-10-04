import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { PriceDialogComponent, PriceDialogData } from './price-dialog.component';
import { PriceAdminService } from '../../service/price-admin.service';
import { ApiErrorHandler } from '../../../../core/error/api-error-handler.service';
import { PriceEntryAdminResponse } from '../../model/price-entry.model';

const CREATE_DATA: PriceDialogData = { mode: 'create' };

const EDIT_PRICE: PriceEntryAdminResponse = {
  id: 7, name: 'Zawiasy', description: null, unit: 'piece', currency: 'PLN',
  currentPrice: 12.50, sourceUrl: null, urlSelector: null, isActive: true,
  createdAt: '', updatedAt: ''
};
const EDIT_DATA: PriceDialogData = { mode: 'edit', price: EDIT_PRICE };

describe('PriceDialogComponent', () => {
  let fixture: ComponentFixture<PriceDialogComponent>;
  let component: PriceDialogComponent;
  let priceService: jasmine.SpyObj<PriceAdminService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PriceDialogComponent>>;
  let errorHandler: jasmine.SpyObj<ApiErrorHandler>;

  function setup(data: PriceDialogData): void {
    priceService = jasmine.createSpyObj<PriceAdminService>('PriceAdminService', ['create', 'update']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<PriceDialogComponent>>('MatDialogRef', ['close']);
    errorHandler = jasmine.createSpyObj<ApiErrorHandler>('ApiErrorHandler', ['handle']);

    TestBed.configureTestingModule({
      imports: [PriceDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: PriceAdminService, useValue: priceService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: ApiErrorHandler, useValue: errorHandler }
      ]
    });

    fixture = TestBed.createComponent(PriceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('tryb tworzenia (create)', () => {
    beforeEach(() => setup(CREATE_DATA));

    it('isEditMode = false, domyślna waluta PLN, saving = false', () => {
      expect(component.isEditMode).toBeFalse();
      expect(component.form.get('currency')?.value).toBe('PLN');
      expect(component.saving()).toBeFalse();
    });

    it('title zwraca "Dodaj nową cenę"', () => {
      expect(component.title).toBe('Dodaj nową cenę');
    });

    it('onSubmit z invalid formularzem nie wywołuje serwisu', () => {
      component.onSubmit();
      expect(priceService.create).not.toHaveBeenCalled();
      expect(component.form.touched).toBeTrue();
    });

    it('onSubmit z valid formularzem wywołuje priceService.create i zamyka dialog', () => {
      priceService.create.and.returnValue(of(EDIT_PRICE));
      component.form.patchValue({ unit: 'm2', currentPrice: 5 });
      component.onSubmit();
      expect(priceService.create).toHaveBeenCalledTimes(1);
      expect(dialogRef.close).toHaveBeenCalledWith(true);
      expect(component.saving()).toBeFalse();
    });

    it('przy błędzie serwera wywołuje errorHandler i resetuje saving', () => {
      priceService.create.and.returnValue(throwError(() => new Error('500')));
      component.form.patchValue({ unit: 'piece', currentPrice: 3 });
      component.onSubmit();
      expect(errorHandler.handle).toHaveBeenCalledTimes(1);
      expect(component.saving()).toBeFalse();
    });

    it('onCancel zamyka dialog z false', () => {
      component.onCancel();
      expect(dialogRef.close).toHaveBeenCalledWith(false);
    });
  });

  describe('tryb edycji (edit)', () => {
    beforeEach(() => setup(EDIT_DATA));

    it('isEditMode = true, title = "Edytuj cenę"', () => {
      expect(component.isEditMode).toBeTrue();
      expect(component.title).toBe('Edytuj cenę');
    });

    it('formularz wypełniony danymi z price', () => {
      expect(component.form.get('unit')?.value).toBe('piece');
      expect(component.form.get('currentPrice')?.value).toBe(12.50);
      expect(component.form.get('currency')?.value).toBe('PLN');
    });

    it('onSubmit wywołuje priceService.update z id pozycji i zamyka dialog', () => {
      priceService.update.and.returnValue(of(EDIT_PRICE));
      component.onSubmit();
      expect(priceService.update).toHaveBeenCalledWith(7, jasmine.any(Object));
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('przy błędzie update wywołuje errorHandler i resetuje saving', () => {
      priceService.update.and.returnValue(throwError(() => new Error('500')));
      component.onSubmit();
      expect(errorHandler.handle).toHaveBeenCalledTimes(1);
      expect(component.saving()).toBeFalse();
    });
  });

  describe('edycja przez prawdziwy HTTP (czyszczenie pól opcjonalnych)', () => {
    const FULL_PRICE: PriceEntryAdminResponse = {
      id: 7, name: 'Zawiasy', description: 'Opis', unit: 'piece', currency: 'PLN',
      currentPrice: 12.50, sourceUrl: 'https://example.com/product', urlSelector: '.price',
      isActive: true, createdAt: '', updatedAt: ''
    };
    let http: HttpTestingController;
    let realDialogRef: jasmine.SpyObj<MatDialogRef<PriceDialogComponent>>;
    let realErrorHandler: jasmine.SpyObj<ApiErrorHandler>;

    beforeEach(() => {
      realDialogRef = jasmine.createSpyObj<MatDialogRef<PriceDialogComponent>>('MatDialogRef', ['close']);
      realErrorHandler = jasmine.createSpyObj<ApiErrorHandler>('ApiErrorHandler', ['handle']);
      TestBed.configureTestingModule({
        imports: [PriceDialogComponent, NoopAnimationsModule],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: MatDialogRef, useValue: realDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: { mode: 'edit', price: FULL_PRICE } as PriceDialogData },
          { provide: ApiErrorHandler, useValue: realErrorHandler }
        ]
      });
      http = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(PriceDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    afterEach(() => http.verify());

    function type(selector: string, value: string): void {
      const el = fixture.nativeElement.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
      el.value = value;
      el.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    function save(): void {
      const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
      buttons.find(b => b.textContent?.includes('Zapisz zmiany'))!.click();
    }

    function expectPut() {
      return http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/admin/prices/7'));
    }

    const SELECTORS = {
      description: '[formControlName="description"]',
      sourceUrl: '[formControlName="sourceUrl"]',
      urlSelector: '[formControlName="urlSelector"]'
    } as const;

    (Object.keys(SELECTORS) as Array<keyof typeof SELECTORS>).forEach(field => {
      it(`wyczyszczenie pola ${field} wysyła jawny pusty string`, () => {
        type(SELECTORS[field], '');
        save();
        const req = expectPut();
        const body = JSON.parse(req.request.serializeBody() as string);
        expect(body[field]).toBe('');
        req.flush({ ...FULL_PRICE, [field]: null });
      });
    });

    it('wyczyszczenie wszystkich trzech pól naraz, reszta danych i isActive zachowane', () => {
      type(SELECTORS.description, '');
      type(SELECTORS.sourceUrl, '');
      type(SELECTORS.urlSelector, '');
      save();
      const req = expectPut();
      const body = JSON.parse(req.request.serializeBody() as string);
      expect(body).toEqual({
        name: 'Zawiasy', description: '', unit: 'piece', currency: 'PLN',
        currentPrice: 12.5, sourceUrl: '', urlSelector: '', isActive: true
      });
      req.flush({ ...FULL_PRICE, description: null, sourceUrl: null, urlSelector: null });
      expect(realDialogRef.close).toHaveBeenCalledWith(true);
      expect(component.saving()).toBeFalse();
      // formularz nie odtwarza starego tekstu po odpowiedzi z pustymi polami
      expect(component.form.value.description).toBe('');
    });

    it('zmiana na nowy niepusty tekst jest wysyłana dokładnie', () => {
      type(SELECTORS.description, ' Nowy opis ');
      save();
      const req = expectPut();
      const body = JSON.parse(req.request.serializeBody() as string);
      expect(body.description).toBe(' Nowy opis ');
      req.flush(FULL_PRICE);
    });

    it('niezmienione teksty są wysyłane bez utraty', () => {
      save();
      const req = expectPut();
      const body = JSON.parse(req.request.serializeBody() as string);
      expect(body.description).toBe('Opis');
      expect(body.sourceUrl).toBe('https://example.com/product');
      expect(body.urlSelector).toBe('.price');
      req.flush(FULL_PRICE);
    });

    it('invalid form nie wysyła żądania', () => {
      component.form.patchValue({ unit: '' });
      component.onSubmit();
      http.expectNone(r => r.method === 'PUT');
      expect(component.saving()).toBeFalse();
    });

    it('błąd PUT nie zamyka dialogu i resetuje saving', () => {
      save();
      expectPut().flush('err', { status: 500, statusText: 'Server Error' });
      expect(realDialogRef.close).not.toHaveBeenCalled();
      expect(realErrorHandler.handle).toHaveBeenCalledTimes(1);
      expect(component.saving()).toBeFalse();
    });
  });

  describe('tworzenie przez prawdziwy HTTP', () => {
    it('puste pola opcjonalne nadal są pomijane w payloadzie', () => {
      TestBed.configureTestingModule({
        imports: [PriceDialogComponent, NoopAnimationsModule],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
          { provide: MAT_DIALOG_DATA, useValue: CREATE_DATA },
          { provide: ApiErrorHandler, useValue: jasmine.createSpyObj('ApiErrorHandler', ['handle']) }
        ]
      });
      const http = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(PriceDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      component.form.patchValue({ unit: 'm2', currentPrice: 5 });
      component.onSubmit();
      const req = http.expectOne(r => r.method === 'POST');
      const body = JSON.parse(req.request.serializeBody() as string);
      expect(body).toEqual({ unit: 'm2', currency: 'PLN', currentPrice: 5 });
      req.flush(EDIT_PRICE);
      http.verify();
    });
  });
});
