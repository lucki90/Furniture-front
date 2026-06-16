import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ToastService } from '../core/error/toast.service';
import { PrintDocComponent } from './print-doc.component';
import { PrintDocService } from './service/print-doc.service';
import { PrintDocRequest } from '../alone-cabinet/model/cabinet-form.model';

describe('PrintDocComponent', () => {
  let component: PrintDocComponent;
  let fixture: ComponentFixture<PrintDocComponent>;
  let printDocService: jasmine.SpyObj<PrintDocService>;
  let toast: jasmine.SpyObj<ToastService>;

  const rows: PrintDocRequest[] = [{
    quantity: 2,
    symbol: 'PLYTA',
    thickness: 18,
    length: 720,
    lengthVeneer: 1,
    width: 300,
    widthVeneer: 0,
    veneerColor: 'biały',
    sticker: 'Bok',
    remarks: 'test'
  }];

  beforeEach(async () => {
    printDocService = jasmine.createSpyObj<PrintDocService>('PrintDocService', ['downloadExcel']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    printDocService.downloadExcel.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      declarations: [PrintDocComponent],
      providers: [
        { provide: PrintDocService, useValue: printDocService },
        { provide: ToastService, useValue: toast }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PrintDocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('tworzy komponent', () => {
    expect(component).toBeTruthy();
  });

  it('wysyła do eksportu dane z Input response', () => {
    component.response = rows;

    component.downloadExcel();

    expect(printDocService.downloadExcel).toHaveBeenCalledOnceWith(rows);
    expect(toast.success).toHaveBeenCalledWith('Plik Excel został pobrany.');
  });

  it('pomija eksport, gdy nie ma danych', () => {
    component.response = null;
    component.downloadExcel();

    component.response = [];
    component.downloadExcel();

    expect(printDocService.downloadExcel).not.toHaveBeenCalled();
  });

  it('pokazuje toast błędu, gdy eksport się nie powiedzie', () => {
    component.response = rows;
    printDocService.downloadExcel.and.returnValue(throwError(() => new Error('boom')));

    component.downloadExcel();

    expect(toast.error).toHaveBeenCalledWith('Błąd podczas pobierania pliku Excel.');
  });
});
