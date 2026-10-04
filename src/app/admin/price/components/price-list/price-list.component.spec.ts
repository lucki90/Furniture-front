import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatDialog } from '@angular/material/dialog';
import { PriceListComponent } from './price-list.component';
import { PriceAdminService } from '../../service/price-admin.service';
import { ToastService } from '../../../../core/error/toast.service';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { Page, PriceEntryAdminResponse, PriceImportResultResponse } from '../../model/price-entry.model';

const EMPTY_PAGE: Page<PriceEntryAdminResponse> = {
  content: [], totalElements: 0, totalPages: 0, size: 20, number: 0, first: true, last: true, empty: true
};

describe('PriceListComponent', () => {
  let fixture: ComponentFixture<PriceListComponent>;
  let component: PriceListComponent;
  let priceService: jasmine.SpyObj<PriceAdminService>;
  let toast: jasmine.SpyObj<ToastService>;

  function setup(): void {
    priceService = jasmine.createSpyObj<PriceAdminService>('PriceAdminService', [
      'getAll', 'delete', 'scrapeSingle', 'scrapeAll', 'create', 'update'
    ]);
    priceService.getAll.and.returnValue(of(EMPTY_PAGE));
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);

    TestBed.configureTestingModule({
      imports: [PriceListComponent, NoopAnimationsModule],
      providers: [
        { provide: PriceAdminService, useValue: priceService },
        { provide: ToastService, useValue: toast },
        {
          provide: ConfirmDialogService,
          useValue: jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm'])
        },
        { provide: MatDialog, useValue: jasmine.createSpyObj<MatDialog>('MatDialog', ['open']) }
      ]
    });

    fixture = TestBed.createComponent(PriceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('ładuje ceny przy inicjalizacji i ustawia loading na false', () => {
    setup();
    expect(priceService.getAll).toHaveBeenCalledTimes(1);
    expect(component.loading()).toBeFalse();
    expect(component.prices()).toEqual([]);
    expect(component.totalElements()).toBe(0);
  });

  it('wyświetla błąd z polskim komunikatem gdy ładowanie nie powiedzie się', () => {
    setup();
    priceService.getAll.and.returnValue(throwError(() => new Error('500')));
    component.loadPrices();
    expect(toast.error).toHaveBeenCalledWith('Błąd podczas ładowania cen');
    expect(component.loading()).toBeFalse();
  });

  it('onPageChange zmienia indeks strony i przeładowuje ceny', () => {
    setup();
    priceService.getAll.calls.reset();
    component.onPageChange({ pageIndex: 2, pageSize: 20, length: 100 });
    expect(component.pageIndex()).toBe(2);
    expect(priceService.getAll).toHaveBeenCalledTimes(1);
  });

  it('onSearch resetuje stronę do 0 i przeładowuje ceny', () => {
    setup();
    component.pageIndex.set(3);
    priceService.getAll.calls.reset();
    component.onSearch();
    expect(component.pageIndex()).toBe(0);
    expect(priceService.getAll).toHaveBeenCalledTimes(1);
  });

  it('onClearSearch czyści searchName i przeładowuje ceny', () => {
    setup();
    component.searchName = 'HDF';
    priceService.getAll.calls.reset();
    component.onClearSearch();
    expect(component.searchName).toBe('');
    expect(priceService.getAll).toHaveBeenCalledTimes(1);
  });

  it('activeVisibleCount i inactiveVisibleCount zliczają poprawnie', () => {
    setup();
    const active = { isActive: true } as PriceEntryAdminResponse;
    const inactive = { isActive: false } as PriceEntryAdminResponse;
    component.prices.set([active, active, inactive]);
    expect(component.activeVisibleCount()).toBe(2);
    expect(component.inactiveVisibleCount()).toBe(1);
  });
});

describe('PriceListComponent - import cen przez prawdziwy dialog', () => {
  let fixture: ComponentFixture<PriceListComponent>;
  let priceService: jasmine.SpyObj<PriceAdminService>;
  let overlay: HTMLElement;

  function setup(result: PriceImportResultResponse): void {
    priceService = jasmine.createSpyObj<PriceAdminService>('PriceAdminService', ['getAll', 'importPrices']);
    priceService.getAll.and.returnValue(of(EMPTY_PAGE));
    priceService.importPrices.and.returnValue(of(result));

    TestBed.configureTestingModule({
      imports: [PriceListComponent, NoopAnimationsModule],
      providers: [
        { provide: PriceAdminService, useValue: priceService },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']) },
        {
          provide: ConfirmDialogService,
          useValue: jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm'])
        }
      ]
    });

    fixture = TestBed.createComponent(PriceListComponent);
    fixture.detectChanges();
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
  }

  async function importAndClose(): Promise<void> {
    fixture.componentInstance.openImportDialog();
    fixture.detectChanges();
    await fixture.whenStable();

    const input = overlay.querySelector('input[type="file"]') as HTMLInputElement;
    const transfer = new DataTransfer();
    transfer.items.add(new File(['x'], 'ceny.csv', { type: 'text/csv' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const clickButton = (label: string) =>
      (Array.from(overlay.querySelectorAll('button')).find(b => b.textContent?.trim() === label) as HTMLButtonElement).click();

    clickButton('Importuj');
    fixture.detectChanges();
    clickButton('Zamknij');
    fixture.detectChanges();
    await fixture.whenStable();
  }

  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

  it('przeładowuje listę raz po potwierdzonym zapisie', async () => {
    setup({ added: 1, updated: 0, errors: [] });
    priceService.getAll.calls.reset();
    await importAndClose();
    expect(priceService.getAll).toHaveBeenCalledTimes(1);
  });

  it('przeładowuje listę raz przy częściowym sukcesie', async () => {
    setup({ added: 1, updated: 2, errors: [{ lineNumber: 4, line: 'invalid row', message: 'Nieprawidłowa cena' }] });
    priceService.getAll.calls.reset();
    await importAndClose();
    expect(priceService.getAll).toHaveBeenCalledTimes(1);
  });

  it('nie przeładowuje listy gdy nic nie zapisano', async () => {
    setup({ added: 0, updated: 0, errors: [{ lineNumber: 2, line: 'x', message: 'Zły wiersz' }] });
    priceService.getAll.calls.reset();
    await importAndClose();
    expect(priceService.getAll).not.toHaveBeenCalled();
  });
});
