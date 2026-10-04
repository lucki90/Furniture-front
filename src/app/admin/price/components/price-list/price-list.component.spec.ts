import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, Subject, of, throwError } from 'rxjs';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatDialog } from '@angular/material/dialog';
import { PriceListComponent } from './price-list.component';
import { PriceAdminService } from '../../service/price-admin.service';
import { PriceDialogComponent } from '../price-dialog/price-dialog.component';
import { ApiErrorHandler } from '../../../../core/error/api-error-handler.service';
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

  it('przycisk importu reklamuje wyłącznie obsługiwany format CSV', () => {
    setup();
    const importButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button')
    ).find(button => button.textContent?.includes('Import'));

    expect(importButton?.textContent).toContain('Import CSV');
    expect(importButton?.textContent).not.toContain('Excel');
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

describe('PriceListComponent - kolejność odpowiedzi odczytu listy', () => {
  let fixture: ComponentFixture<PriceListComponent>;
  let component: PriceListComponent;
  let priceService: jasmine.SpyObj<PriceAdminService>;
  let toast: jasmine.SpyObj<ToastService>;
  let requests: Subject<Page<PriceEntryAdminResponse>>[];

  function priceEntry(id: number, name: string): PriceEntryAdminResponse {
    return { id, name, unit: 'szt', currentPrice: 10, currency: 'PLN', sourceUrl: null, isActive: true } as PriceEntryAdminResponse;
  }

  function pageOf(names: string[], totalElements: number): Page<PriceEntryAdminResponse> {
    return {
      ...EMPTY_PAGE,
      content: names.map((name, index) => priceEntry(index + 1, name)),
      totalElements,
      empty: names.length === 0
    };
  }

  function setup(): void {
    requests = [];
    priceService = jasmine.createSpyObj<PriceAdminService>('PriceAdminService', ['getAll']);
    priceService.getAll.and.callFake((): Observable<Page<PriceEntryAdminResponse>> => {
      const request = new Subject<Page<PriceEntryAdminResponse>>();
      requests.push(request);
      return request;
    });
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

  const host = () => fixture.nativeElement as HTMLElement;
  const spinner = () => host().querySelector('mat-spinner');
  const rowNames = () => Array.from(host().querySelectorAll('tr.mat-mdc-row')).map(row => row.textContent);
  const rangeLabel = () => host().querySelector('.mat-mdc-paginator-range-label')?.textContent?.trim();

  function searchFor(name: string): void {
    component.searchName = name;
    component.onSearch();
    fixture.detectChanges();
  }

  it('spóźniona odpowiedź poprzedniego wyszukiwania nie nadpisuje danych ani licznika', () => {
    setup();
    searchFor('Latest');
    expect(requests.length).toBe(2);

    requests[1].next(pageOf(['Latest price'], 2));
    requests[1].complete();
    requests[0].next(pageOf(['Old price'], 100));
    fixture.detectChanges();

    expect(component.prices().map(price => price.name)).toEqual(['Latest price']);
    expect(component.totalElements()).toBe(2);
    expect(rowNames().length).toBe(1);
    expect(rowNames()[0]).toContain('Latest price');
    expect(host().textContent).not.toContain('Old price');
    expect(rangeLabel()).toContain('2');
    expect(rangeLabel()).not.toContain('100');
    expect(component.loading()).toBeFalse();
    expect(spinner()).toBeNull();
  });

  it('spóźniony błąd poprzedniego odczytu nie kończy loading ani nie pokazuje toastu', () => {
    setup();
    searchFor('Latest');

    requests[0].error(new Error('stary błąd'));
    fixture.detectChanges();

    expect(toast.error).not.toHaveBeenCalled();
    expect(component.loading()).toBeTrue();
    expect(spinner()).not.toBeNull();

    requests[1].next(pageOf(['Latest price'], 2));
    requests[1].complete();
    fixture.detectChanges();

    expect(component.prices().map(price => price.name)).toEqual(['Latest price']);
    expect(component.totalElements()).toBe(2);
    expect(component.loading()).toBeFalse();
    expect(spinner()).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('błąd bieżącego odczytu daje jeden toast, kończy loading, a kolejne wyszukanie działa', () => {
    setup();
    searchFor('A');
    requests[1].error(new Error('500'));
    fixture.detectChanges();

    expect(toast.error).toHaveBeenCalledOnceWith('Błąd podczas ładowania cen');
    expect(component.loading()).toBeFalse();
    expect(spinner()).toBeNull();

    searchFor('B');
    expect(component.loading()).toBeTrue();
    requests[2].next(pageOf(['B price'], 1));
    fixture.detectChanges();

    expect(component.prices().map(price => price.name)).toEqual(['B price']);
    expect(component.totalElements()).toBe(1);
    expect(component.loading()).toBeFalse();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('zmiana strony, rozmiaru strony, activeOnly i czyszczenie wyszukiwania przekazują aktualne parametry', () => {
    setup();
    component.onPageChange({ pageIndex: 2, pageSize: 50, length: 200 });
    expect(priceService.getAll).toHaveBeenCalledWith(2, 50, undefined, false);

    component.activeOnly = true;
    component.searchName = 'HDF';
    component.onSearch();
    expect(priceService.getAll).toHaveBeenCalledWith(0, 50, 'HDF', true);

    component.onClearSearch();
    expect(priceService.getAll).toHaveBeenCalledWith(0, 50, undefined, true);

    requests[3].next(pageOf(['Last'], 1));
    requests[2].next(pageOf(['Stale'], 9));
    requests[1].next(pageOf(['Stale'], 9));
    requests[0].next(pageOf(['Stale'], 9));
    expect(component.prices().map(price => price.name)).toEqual(['Last']);
    expect(component.totalElements()).toBe(1);
  });

  it('po zniszczeniu komponentu odpowiedź w toku jest ignorowana', () => {
    setup();
    fixture.destroy();

    expect(requests[0].observed).toBeFalse();
    requests[0].next(pageOf(['Zombie'], 5));
    expect(component.prices()).toEqual([]);
    expect(component.totalElements()).toBe(0);
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

describe('PriceListComponent - zamknięcie dialogu importu przez Escape/tło', () => {
  let fixture: ComponentFixture<PriceListComponent>;
  let priceService: jasmine.SpyObj<PriceAdminService>;
  let pending: Subject<PriceImportResultResponse>;
  let overlay: HTMLElement;

  const dialogOpen = (): boolean => overlay.querySelector('mat-dialog-container') !== null;
  const button = (label: string): HTMLButtonElement =>
    Array.from(overlay.querySelectorAll('button')).find(b => b.textContent?.trim() === label) as HTMLButtonElement;

  async function settle(): Promise<void> {
    TestBed.inject(ApplicationRef).tick();
    await Promise.resolve();
    TestBed.inject(ApplicationRef).tick();
  }

  async function macrotask(): Promise<void> {
    await settle();
    await new Promise(resolve => setTimeout(resolve));
  }

  async function openAndStartImport(): Promise<void> {
    fixture.componentInstance.openImportDialog();
    await settle();
    const transfer = new DataTransfer();
    transfer.items.add(new File(['x'], 'ceny.csv', { type: 'text/csv' }));
    const input = overlay.querySelector('input[type="file"]') as HTMLInputElement;
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await settle();
    button('Importuj').click();
    await settle();
  }

  async function pressEscape(): Promise<void> {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true }));
    await macrotask();
  }

  async function clickBackdrop(): Promise<void> {
    (overlay.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
    await macrotask();
  }

  beforeEach(() => {
    priceService = jasmine.createSpyObj<PriceAdminService>('PriceAdminService', ['getAll', 'importPrices']);
    priceService.getAll.and.returnValue(of(EMPTY_PAGE));
    pending = new Subject<PriceImportResultResponse>();
    priceService.importPrices.and.returnValue(pending as Observable<PriceImportResultResponse>);

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
    priceService.getAll.calls.reset();
  });

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('Escape po potwierdzonym zapisie odświeża listę dokładnie raz', async () => {
    await openAndStartImport();
    pending.next({ added: 1, updated: 0, errors: [] });
    await settle();

    await pressEscape();

    expect(dialogOpen()).toBeFalse();
    expect(priceService.getAll).toHaveBeenCalledTimes(1);
  });

  it('kliknięcie tła po potwierdzonym zapisie odświeża listę dokładnie raz', async () => {
    await openAndStartImport();
    pending.next({ added: 0, updated: 3, errors: [] });
    await settle();

    await clickBackdrop();

    expect(dialogOpen()).toBeFalse();
    expect(priceService.getAll).toHaveBeenCalledTimes(1);
  });

  it('Escape po częściowym sukcesie odświeża listę dokładnie raz', async () => {
    await openAndStartImport();
    pending.next({ added: 1, updated: 2, errors: [{ lineNumber: 4, line: 'x', message: 'Zła cena' }] });
    await settle();

    await pressEscape();

    expect(priceService.getAll).toHaveBeenCalledTimes(1);
  });

  it('same błędy wierszy: Escape nie odświeża listy', async () => {
    await openAndStartImport();
    pending.next({ added: 0, updated: 0, errors: [{ lineNumber: 2, line: 'x', message: 'Zły wiersz' }] });
    await settle();

    await pressEscape();

    expect(dialogOpen()).toBeFalse();
    expect(priceService.getAll).not.toHaveBeenCalled();
  });

  it('błąd HTTP: Escape nie odświeża listy', async () => {
    spyOn(console, 'error');
    await openAndStartImport();
    pending.error({ status: 500 });
    await settle();

    await pressEscape();

    expect(dialogOpen()).toBeFalse();
    expect(priceService.getAll).not.toHaveBeenCalled();
  });

  it('bez importu Escape nie odświeża listy', async () => {
    fixture.componentInstance.openImportDialog();
    await settle();

    await pressEscape();

    expect(dialogOpen()).toBeFalse();
    expect(priceService.getAll).not.toHaveBeenCalled();
  });

  it('podczas POST Escape ani tło nie zamykają dialogu i nie odświeżają listy', async () => {
    await openAndStartImport();

    await pressEscape();
    await clickBackdrop();

    expect(dialogOpen()).toBeTrue();
    expect(priceService.getAll).not.toHaveBeenCalled();
  });

  it('po zniszczeniu listy zamknięcie dialogu nie odświeża listy', async () => {
    await openAndStartImport();
    pending.next({ added: 1, updated: 0, errors: [] });
    await settle();

    fixture.destroy();
    TestBed.inject(MatDialog).closeAll();
    await macrotask();

    expect(priceService.getAll).not.toHaveBeenCalled();
  });
});

describe('PriceListComponent - zapis w dialogu ceny przez prawdziwy MatDialog', () => {
  let fixture: ComponentFixture<PriceListComponent>;
  let priceService: jasmine.SpyObj<PriceAdminService>;
  let toast: jasmine.SpyObj<ToastService>;
  let pending: Subject<PriceEntryAdminResponse>;
  let overlay: HTMLElement;

  const dialogOpen = (): boolean => overlay.querySelector('mat-dialog-container') !== null;
  const saved: PriceEntryAdminResponse = {
    id: 1, name: 'Zawiasy', description: null, unit: 'piece', currency: 'PLN', currentPrice: 10,
    sourceUrl: null, urlSelector: null, isActive: true, createdAt: '', updatedAt: ''
  };

  async function settle(): Promise<void> {
    TestBed.inject(ApplicationRef).tick();
    await Promise.resolve();
    TestBed.inject(ApplicationRef).tick();
  }

  async function macrotask(): Promise<void> {
    await settle();
    await new Promise(resolve => setTimeout(resolve));
  }

  async function startCreateSave(): Promise<void> {
    fixture.componentInstance.openCreateDialog();
    await settle();
    expect(dialogOpen()).toBeTrue();
    const dialogComponent = TestBed.inject(MatDialog).openDialogs[0].componentInstance as PriceDialogComponent;
    dialogComponent.form.patchValue({ unit: 'piece', currentPrice: 10 });
    dialogComponent.onSubmit();
    await settle();
  }

  async function pressEscape(): Promise<void> {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true }));
    await macrotask();
  }

  beforeEach(() => {
    priceService = jasmine.createSpyObj<PriceAdminService>('PriceAdminService', ['getAll', 'create']);
    priceService.getAll.and.returnValue(of(EMPTY_PAGE));
    pending = new Subject<PriceEntryAdminResponse>();
    priceService.create.and.returnValue(pending);
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
        { provide: ApiErrorHandler, useValue: jasmine.createSpyObj<ApiErrorHandler>('ApiErrorHandler', ['handle']) }
      ]
    });

    fixture = TestBed.createComponent(PriceListComponent);
    fixture.detectChanges();
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    priceService.getAll.calls.reset();
  });

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('Escape podczas zapisu nie zamyka dialogu, a po sukcesie lista przeładowuje się dokładnie raz', async () => {
    await startCreateSave();

    await pressEscape();

    expect(dialogOpen()).toBeTrue();
    expect(priceService.getAll).not.toHaveBeenCalled();

    pending.next(saved);
    await macrotask();

    expect(dialogOpen()).toBeFalse();
    expect(priceService.create).toHaveBeenCalledTimes(1);
    expect(priceService.getAll).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledOnceWith('Cena została dodana');
  });

  it('błąd HTTP: dialog zostaje otwarty, lista nie jest przeładowywana', async () => {
    await startCreateSave();

    pending.error({ status: 500 });
    await macrotask();

    expect(dialogOpen()).toBeTrue();
    expect(priceService.getAll).not.toHaveBeenCalled();
  });
});
