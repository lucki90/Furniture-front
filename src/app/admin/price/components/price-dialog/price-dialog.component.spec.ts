import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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
});
