import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { Observable, Subject, of, throwError } from 'rxjs';

import { PriceImportDialogComponent } from './price-import-dialog.component';
import { PriceAdminService } from '../../service/price-admin.service';
import { PriceImportResultResponse } from '../../model/price-entry.model';

describe('PriceImportDialogComponent', () => {
  let fixture: ComponentFixture<PriceImportDialogComponent>;
  let component: PriceImportDialogComponent;
  let priceService: jasmine.SpyObj<PriceAdminService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PriceImportDialogComponent>>;

  const csvFile = (name = 'ceny.csv') => new File(['materialCode;thicknessMm'], name, { type: 'text/csv' });

  function setup(): void {
    priceService = jasmine.createSpyObj<PriceAdminService>('PriceAdminService', ['importPrices']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<PriceImportDialogComponent>>('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [PriceImportDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: PriceAdminService, useValue: priceService },
        { provide: MatDialogRef, useValue: dialogRef }
      ]
    });

    fixture = TestBed.createComponent(PriceImportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const root = (): HTMLElement => fixture.nativeElement;
  const text = (): string => root().textContent ?? '';
  const fileInput = (): HTMLInputElement => root().querySelector('input[type="file"]') as HTMLInputElement;
  const button = (label: string): HTMLButtonElement =>
    Array.from(root().querySelectorAll('button')).find(b => b.textContent?.trim() === label) as HTMLButtonElement;

  function pickFile(file: File): void {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const input = fileInput();
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function dropFile(file: File): void {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const event = new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true });
    root().querySelector('.drop-zone')!.dispatchEvent(event);
    fixture.detectChanges();
  }

  function importWith(result: PriceImportResultResponse): void {
    priceService.importPrices.and.returnValue(of(result));
    pickFile(csvFile());
    button('Importuj').click();
    fixture.detectChanges();
  }

  describe('wybór pliku i pomoc', () => {
    beforeEach(setup);

    it('atrybut accept wskazuje wyłącznie CSV', () => {
      expect(fileInput().accept).toBe('.csv');
    });

    it('pomoc opisuje CSV UTF-8, średnik i 7-kolumnowy nagłówek endpointu', () => {
      expect(text()).toContain('średnik');
      expect(text()).toContain('UTF-8');
      expect(text()).toContain('materialCode;thicknessMm;colorCode;colorName;colorHex;varnished;pricePerM2');
      expect(text()).toContain('namePL;nameEN');
      expect(text()).toContain('CHIPBOARD;18;WHITE;Biały;#FFFFFF;false;45.00');
    });

    it('pomoc nie reklamuje XLS/XLSX ani starego formatu przecinkowego', () => {
      expect(text()).not.toMatch(/xls/i);
      expect(text()).not.toContain('name,unit,currency');
      expect(text()).not.toContain('currentPrice');
    });

    it('picker akceptuje CSV bez rozróżniania wielkości liter', () => {
      pickFile(csvFile('CENY.CSV'));
      expect(component.selectedFile?.name).toBe('CENY.CSV');
      expect(component.error).toBeNull();
    });

    for (const name of ['ceny.xls', 'ceny.xlsx', 'CENY.XLSX', 'ceny', 'ceny.csv.txt']) {
      it(`picker odrzuca ${name}`, () => {
        pickFile(csvFile(name));
        expect(component.selectedFile).toBeNull();
        expect(text()).toContain('Nieobsługiwany format pliku. Dozwolony: CSV');
      });

      it(`drop odrzuca ${name}`, () => {
        dropFile(csvFile(name));
        expect(component.selectedFile).toBeNull();
        expect(text()).toContain('Nieobsługiwany format pliku. Dozwolony: CSV');
      });
    }

    it('drop akceptuje plik .CSV', () => {
      dropFile(csvFile('ceny.CSV'));
      expect(component.selectedFile?.name).toBe('ceny.CSV');
    });

    it('odrzucony plik czyści wcześniej wybrany poprawny plik', () => {
      pickFile(csvFile());
      pickFile(csvFile('ceny.xlsx'));
      expect(component.selectedFile).toBeNull();
    });
  });

  describe('wynik importu', () => {
    beforeEach(setup);

    it('wysyła wybrany plik do serwisu', () => {
      const file = csvFile();
      priceService.importPrices.and.returnValue(of({ added: 0, updated: 0, errors: [] }));
      pickFile(file);
      button('Importuj').click();
      expect(priceService.importPrices).toHaveBeenCalledOnceWith(file);
    });

    it('częściowy sukces: pokazuje added, updated i numer błędnego wiersza; zamknięcie zwraca true', () => {
      importWith({
        added: 1,
        updated: 2,
        errors: [{ lineNumber: 4, line: 'invalid row', message: 'Nieprawidłowa cena' }]
      });

      expect(text()).toContain('Dodano: 1');
      expect(text()).toContain('zaktualizowano: 2');
      expect(text()).toContain('błędów: 1');
      expect(text()).toContain('Wiersz 4');
      expect(text()).toContain('Nieprawidłowa cena');
      expect(text()).toContain('invalid row');
      expect(text()).not.toMatch(/undefined|NaN/);
      expect(root().querySelector('mat-progress-bar')).toBeNull();
      expect(root().querySelector('.result-summary')!.classList).toContain('partial');

      button('Zamknij').click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(true);
    });

    it('same dodane: sukces bez błędów, close(true)', () => {
      importWith({ added: 3, updated: 0, errors: [] });
      expect(text()).toContain('Dodano: 3');
      expect(text()).toContain('zaktualizowano: 0');
      expect(text()).not.toContain('błędów');
      expect(root().querySelector('.result-summary')!.classList).toContain('success');
      button('Zamknij').click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(true);
    });

    it('same zaktualizowane (errors=null): close(true)', () => {
      importWith({ added: 0, updated: 5, errors: null });
      expect(text()).toContain('zaktualizowano: 5');
      expect(text()).not.toMatch(/undefined|NaN/);
      button('Zamknij').click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(true);
    });

    it('same błędy: close(false), stan failed', () => {
      importWith({ added: 0, updated: 0, errors: [{ lineNumber: 2, line: 'x', message: 'Zły wiersz' }] });
      expect(root().querySelector('.result-summary')!.classList).toContain('failed');
      expect(text()).toContain('Wiersz 2');
      button('Zamknij').click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(false);
    });

    it('pusty wynik: close(false)', () => {
      importWith({ added: 0, updated: 0, errors: [] });
      expect(text()).not.toMatch(/undefined|NaN/);
      button('Zamknij').click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(false);
    });

    it('lineNumber=0 oznacza błąd całego pliku', () => {
      importWith({ added: 0, updated: 0, errors: [{ lineNumber: 0, line: '', message: 'Plik jest pusty' }] });
      expect(text()).toContain('Błąd pliku');
      expect(text()).not.toContain('Wiersz 0');
      expect(text()).toContain('Plik jest pusty');
    });

    it('lineNumber=4 jest pokazany jako wiersz 4', () => {
      importWith({ added: 1, updated: 0, errors: [{ lineNumber: 4, line: 'a;b', message: 'Zła cena' }] });
      expect(text()).toContain('Wiersz 4');
    });

    it('zamknięcie bez importu zwraca false', () => {
      button('Anuluj').click();
      expect(dialogRef.close).toHaveBeenCalledOnceWith(false);
    });
  });

  describe('błąd HTTP', () => {
    beforeEach(setup);

    it('kończy importing, pokazuje komunikat i pozwala ponowić import', () => {
      pickFile(csvFile());
      priceService.importPrices.and.returnValue(throwError(() => ({ error: { message: 'Brak uprawnień' } })));
      spyOn(console, 'error');
      button('Importuj').click();
      fixture.detectChanges();

      expect(component.importing).toBeFalse();
      expect(text()).toContain('Brak uprawnień');
      expect(button('Importuj').disabled).toBeFalse();

      priceService.importPrices.and.returnValue(of({ added: 1, updated: 0, errors: [] }));
      button('Importuj').click();
      fixture.detectChanges();

      expect(priceService.importPrices).toHaveBeenCalledTimes(2);
      expect(text()).toContain('Dodano: 1');
      expect(component.error).toBeNull();
    });

    it('używa domyślnego komunikatu gdy odpowiedź nie ma message', () => {
      pickFile(csvFile());
      priceService.importPrices.and.returnValue(throwError(() => ({ status: 500 })));
      spyOn(console, 'error');
      button('Importuj').click();
      fixture.detectChanges();
      expect(text()).toContain('Błąd podczas importu pliku');
    });

    it('w trakcie importu blokuje przyciski i pokazuje spinner', () => {
      const pending = new Subject<PriceImportResultResponse>();
      priceService.importPrices.and.returnValue(pending as Observable<PriceImportResultResponse>);
      pickFile(csvFile());
      button('Importuj').click();
      fixture.detectChanges();
      expect(component.importing).toBeTrue();
      expect(root().querySelector('mat-spinner')).not.toBeNull();
      expect(button('Anuluj').disabled).toBeTrue();
    });
  });
});
