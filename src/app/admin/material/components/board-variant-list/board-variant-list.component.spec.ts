import { ApplicationRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, config, of, Subject } from 'rxjs';
import { ToastService } from '../../../../core/error/toast.service';
import { LanguageService } from '../../../../service/language.service';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { TranslationService } from '../../../../translation/translation.service';
import { BoardVariantAdminResponse, CsvImportResultResponse, Page } from '../../model/material-variant.model';
import { MaterialAdminService } from '../../service/material-admin.service';
import { BoardVariantListComponent } from './board-variant-list.component';

function makeBoardPage(content: BoardVariantAdminResponse[]): Page<BoardVariantAdminResponse> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: content.length || 20,
    number: 0,
    first: true,
    last: true,
    empty: content.length === 0
  };
}

describe('BoardVariantListComponent', () => {
  let fixture: ComponentFixture<BoardVariantListComponent>;
  let component: BoardVariantListComponent;
  let materialAdminService: jasmine.SpyObj<MaterialAdminService>;
  let toast: jasmine.SpyObj<ToastService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const variants: BoardVariantAdminResponse[] = [{
    id: 1,
    materialId: 10,
    materialCode: 'CHIPBOARD',
    materialName: 'MATERIAL.CHIPBOARD',
    thicknessMm: 18,
    colorCode: 'WHITE',
    colorName: null,
    colorHex: '#ffffff',
    varnished: false,
    densityKgDm3: null,
    materialActive: true,
    priceEntryId: 100,
    currentPrice: 45,
    translationKey: 'BOARD_VARIANT.WHITE',
    active: true,
    createdById: null,
    createdByName: null,
    createdAt: '2026-05-14T10:00:00Z',
    updatedAt: '2026-05-14T10:00:00Z'
  }];

  beforeEach(async () => {
    materialAdminService = jasmine.createSpyObj<MaterialAdminService>('MaterialAdminService', [
      'getBoardVariants',
      'deleteBoardVariant'
    ]);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getByCategories']);

    materialAdminService.getBoardVariants.and.returnValue(of(makeBoardPage(variants)));
    translationService.getByCategories.and.returnValue(of({
      'MATERIAL.CHIPBOARD': 'Płyta wiórowa',
      'BOARD_VARIANT.WHITE': 'Biały'
    }));

    await TestBed.configureTestingModule({
      imports: [BoardVariantListComponent, NoopAnimationsModule],
      providers: [
        { provide: MaterialAdminService, useValue: materialAdminService },
        { provide: ToastService, useValue: toast },
        { provide: TranslationService, useValue: translationService },
        { provide: LanguageService, useValue: { lang: signal<'pl' | 'en'>('pl') } },
        { provide: ConfirmDialogService, useValue: jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BoardVariantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads variants on init and renders translated values', () => {
    const firstRow = fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement;
    const count = fixture.nativeElement.querySelector('.settings-toolbar-count') as HTMLElement;

    expect(materialAdminService.getBoardVariants).toHaveBeenCalled();
    expect(translationService.getByCategories).toHaveBeenCalledWith(['MATERIAL', 'BOARD_VARIANT'], 'pl');
    expect(firstRow.textContent).toContain('Płyta wiórowa');
    expect(firstRow.textContent).toContain('Biały');
    expect(count.textContent).toContain('1 wariant');
  });

  it('używa domyślnego rozmiaru strony 20 elementów', () => {
    expect(component.pageSize()).toBe(20);
    expect(materialAdminService.getBoardVariants).toHaveBeenCalledWith(0, 20, undefined, false);
  });

  it('renders section action buttons', () => {
    const actionButtons = Array.from<Element>(
      fixture.nativeElement.querySelectorAll('.admin-section-actions .btn')
    ).map(element => element.textContent?.trim().replace(/\s+/g, ' '));

    expect(actionButtons.some(label => label?.includes('Import CSV'))).toBeTrue();
    expect(actionButtons.some(label => label?.includes('Dodaj wariant'))).toBeTrue();
  });

  it('renders empty state when there are no variants', async () => {
    materialAdminService.getBoardVariants.and.returnValue(of(makeBoardPage([])));

    fixture = TestBed.createComponent(BoardVariantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyState = fixture.nativeElement.querySelector('.empty-state p') as HTMLElement;

    expect(emptyState.textContent).toContain('Brak wariantów płyt');
  });

  describe('kolejność odpowiedzi listy', () => {
    let first$: Subject<Page<BoardVariantAdminResponse>>;
    let second$: Subject<Page<BoardVariantAdminResponse>>;
    let third$: Subject<Page<BoardVariantAdminResponse>>;
    let listFixture: ComponentFixture<BoardVariantListComponent>;
    let list: BoardVariantListComponent;
    let toastSpy: jasmine.SpyObj<ToastService>;

    const variantB: BoardVariantAdminResponse = { ...variants[0], materialCode: 'MDF', materialName: 'MATERIAL.MDF', id: 2, colorCode: 'OAK', colorName: null, translationKey: null };

    function pageOf(content: BoardVariantAdminResponse[], totalElements: number): Page<BoardVariantAdminResponse> {
      return { ...makeBoardPage(content), totalElements };
    }

    function renderedText(): string {
      return (listFixture.nativeElement as HTMLElement).textContent ?? '';
    }

    function paginatorLength(): number {
      return listFixture.debugElement.query(By.directive(MatPaginator)).componentInstance.length;
    }

    function spinner(): Element | null {
      return (listFixture.nativeElement as HTMLElement).querySelector('mat-spinner');
    }

    beforeEach(() => {
      first$ = new Subject<Page<BoardVariantAdminResponse>>();
      second$ = new Subject<Page<BoardVariantAdminResponse>>();
      third$ = new Subject<Page<BoardVariantAdminResponse>>();
      toastSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
      materialAdminService.getBoardVariants.calls.reset();
      materialAdminService.getBoardVariants.and.returnValues(first$, second$, third$);

      listFixture = TestBed.createComponent(BoardVariantListComponent);
      listFixture.detectChanges();
      list = listFixture.componentInstance;
    });

    it('starsza odpowiedź nie nadpisuje listy ani paginatora po nowszym wyszukiwaniu', () => {
      list.searchQuery = 'B';
      list.onSearch();
      expect(materialAdminService.getBoardVariants).toHaveBeenCalledTimes(2);

      second$.next(pageOf([variantB], 2));
      second$.complete();
      first$.next(pageOf([variants[0]], 100));
      first$.complete();
      listFixture.detectChanges();

      expect(list.variants().map(v => v.id)).toEqual([2]);
      expect(list.totalElements()).toBe(2);
      expect(list.loading()).toBeFalse();
      expect(paginatorLength()).toBe(2);
      expect(renderedText()).toContain('MDF');
      expect(renderedText()).not.toContain('CHIPBOARD');
      expect(renderedText()).toContain('2 warianty');
    });

    it('stary błąd nie kończy loadingu ani nie pokazuje toastu, gdy trwa nowsze żądanie', () => {
      list.searchQuery = 'B';
      list.onSearch();

      first$.error(new Error('stary błąd'));
      listFixture.detectChanges();

      expect(list.loading()).toBeTrue();
      expect(spinner()).not.toBeNull();
      expect(toastSpy.error).not.toHaveBeenCalled();

      second$.next(pageOf([variantB], 1));
      second$.complete();
      listFixture.detectChanges();

      expect(list.variants().map(v => v.id)).toEqual([2]);
      expect(list.loading()).toBeFalse();
      expect(spinner()).toBeNull();
      expect(toastSpy.error).not.toHaveBeenCalled();
    });

    it('zachowuje kolejność zmiany strony i filtra activeOnly — dane ustawia tylko ostatnie żądanie', () => {
      const initialPageSize = list.pageSize();
      list.onPageChange({ pageIndex: 2, pageSize: 50, length: 100 });
      list.activeOnly = true;
      list.onActiveFilterChange();

      const calls = materialAdminService.getBoardVariants.calls.allArgs();
      expect(calls).toEqual([
        [0, initialPageSize, undefined, false],
        [2, 50, undefined, false],
        [0, 50, undefined, true],
      ]);

      third$.next(pageOf([variantB], 1));
      third$.complete();
      second$.next(pageOf([variants[0]], 100));
      second$.complete();
      first$.next(pageOf([variants[0]], 200));
      first$.complete();

      expect(list.pageIndex()).toBe(0);
      expect(list.variants().map(v => v.id)).toEqual([2]);
      expect(list.totalElements()).toBe(1);
      expect(list.loading()).toBeFalse();
    });

    it('błąd aktualnego żądania pokazuje jeden toast i kończy loading', () => {
      first$.error(new Error('błąd'));

      expect(toastSpy.error).toHaveBeenCalledTimes(1);
      expect(toastSpy.error).toHaveBeenCalledWith('Błąd podczas ładowania wariantów płyt');
      expect(list.loading()).toBeFalse();
    });

    it('kolejne wyszukanie po błędzie działa', () => {
      first$.error(new Error('błąd'));
      list.searchQuery = 'B';
      list.onSearch();
      expect(list.loading()).toBeTrue();

      second$.next(pageOf([variantB], 1));
      second$.complete();

      expect(materialAdminService.getBoardVariants).toHaveBeenCalledTimes(2);
      expect(list.variants().map(v => v.id)).toEqual([2]);
      expect(list.loading()).toBeFalse();
      expect(toastSpy.error).toHaveBeenCalledTimes(1);
    });

    it('zniszczenie komponentu kończy odbiór wszystkich żądań', () => {
      list.onSearch();
      expect(first$.observers.length).toBe(0);
      expect(second$.observers.length).toBe(1);

      listFixture.destroy();

      expect(second$.observers.length).toBe(0);
    });

    it('po usunięciu przeładowuje listę z bieżącymi filtrami', () => {
      const confirm = TestBed.inject(ConfirmDialogService) as jasmine.SpyObj<ConfirmDialogService>;
      confirm.confirm.and.returnValue(of(true));
      materialAdminService.deleteBoardVariant.and.returnValue(of(undefined as void));
      first$.next(pageOf([variants[0]], 1));
      first$.complete();
      list.searchQuery = 'abc';
      list.activeOnly = true;
      list.pageIndex.set(3);

      list.onDelete(variants[0]);

      expect(materialAdminService.deleteBoardVariant).toHaveBeenCalledWith(variants[0].id);
      expect(materialAdminService.getBoardVariants).toHaveBeenCalledTimes(2);
      expect(materialAdminService.getBoardVariants.calls.mostRecent().args).toEqual([3, list.pageSize(), 'abc', true]);
    });
  });
});

describe('BoardVariantListComponent — odzyskiwanie tłumaczeń po błędzie', () => {
  const PL = { 'MATERIAL.CHIPBOARD': 'Płyta wiórowa', 'BOARD_VARIANT.WHITE': 'Biały' };
  const EN = { 'MATERIAL.CHIPBOARD': 'Chipboard', 'BOARD_VARIANT.WHITE': 'White' };

  const variant: BoardVariantAdminResponse = {
    id: 1,
    materialId: 10,
    materialCode: 'CHIPBOARD',
    materialName: 'MATERIAL.CHIPBOARD',
    thicknessMm: 18,
    colorCode: 'WHITE',
    colorName: null,
    colorHex: '#ffffff',
    varnished: false,
    densityKgDm3: null,
    materialActive: true,
    priceEntryId: 100,
    currentPrice: 45,
    translationKey: 'BOARD_VARIANT.WHITE',
    active: true,
    createdById: null,
    createdByName: null,
    createdAt: '2026-05-14T10:00:00Z',
    updatedAt: '2026-05-14T10:00:00Z'
  };

  let fixture: ComponentFixture<BoardVariantListComponent>;
  let component: BoardVariantListComponent;
  let lang: ReturnType<typeof signal<'pl' | 'en'>>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let materialAdminService: jasmine.SpyObj<MaterialAdminService>;
  let responses: Subject<Record<string, string>>[];
  let unhandledErrors: unknown[];

  function rowText(): string {
    return (fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement).textContent ?? '';
  }

  function respond(index: number, value: Record<string, string>): void {
    responses[index].next(value);
    responses[index].complete();
    fixture.detectChanges();
  }

  function fail(index: number): void {
    responses[index].error(new Error('błąd tłumaczeń'));
    fixture.detectChanges();
  }

  function switchTo(next: 'pl' | 'en'): void {
    lang.set(next);
    fixture.detectChanges();
  }

  // RxJS zgłasza unhandled error w setTimeout(0) — poczekaj na ten callback przed oceną.
  async function flushReportedErrors(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }

  beforeEach(async () => {
    unhandledErrors = [];
    config.onUnhandledError = err => unhandledErrors.push(err);
    lang = signal<'pl' | 'en'>('pl');
    responses = [];

    materialAdminService = jasmine.createSpyObj<MaterialAdminService>('MaterialAdminService', [
      'getBoardVariants',
      'deleteBoardVariant'
    ]);
    materialAdminService.getBoardVariants.and.returnValue(of(makeBoardPage([variant])));
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getByCategories']);
    translationService.getByCategories.and.callFake(() => {
      const subject = new Subject<Record<string, string>>();
      responses.push(subject);
      return subject;
    });

    await TestBed.configureTestingModule({
      imports: [BoardVariantListComponent, NoopAnimationsModule],
      providers: [
        { provide: MaterialAdminService, useValue: materialAdminService },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']) },
        { provide: TranslationService, useValue: translationService },
        { provide: LanguageService, useValue: { lang } },
        { provide: ConfirmDialogService, useValue: jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BoardVariantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(async () => {
    await flushReportedErrors();
    config.onUnhandledError = null;
  });

  it('błąd PL nie kończy obserwacji języka — przełączenie na EN pobiera i pokazuje EN', async () => {
    fail(0);
    expect(rowText()).toContain('CHIPBOARD');

    switchTo('en');
    expect(translationService.getByCategories).toHaveBeenCalledTimes(2);
    expect(translationService.getByCategories.calls.mostRecent().args).toEqual([['MATERIAL', 'BOARD_VARIANT'], 'en']);
    respond(1, EN);

    expect(rowText()).toContain('Chipboard');
    expect(rowText()).toContain('White');
    await flushReportedErrors();
    expect(unhandledErrors).toEqual([]);
  });

  it('błąd EN po sukcesie PL czyści słownik i pokazuje fallbacki zamiast starych etykiet PL', async () => {
    respond(0, PL);
    expect(rowText()).toContain('Płyta wiórowa');

    switchTo('en');
    fail(1);

    expect(component.translations()).toEqual({});
    expect(rowText()).toContain('CHIPBOARD');
    expect(rowText()).toContain('WHITE');
    expect(rowText()).not.toContain('Płyta wiórowa');
    expect(rowText()).not.toContain('Biały');
    await flushReportedErrors();
    expect(unhandledErrors).toEqual([]);
  });

  it('kolejne przełączenie języka po błędzie nadal działa', () => {
    respond(0, PL);
    switchTo('en');
    fail(1);

    switchTo('pl');
    expect(translationService.getByCategories).toHaveBeenCalledTimes(3);
    respond(2, PL);
    expect(rowText()).toContain('Płyta wiórowa');

    switchTo('en');
    respond(3, EN);
    expect(rowText()).toContain('Chipboard');
  });

  it('starsza odpowiedź PL nie nadpisuje potwierdzonej EN', () => {
    switchTo('en');
    respond(1, EN);
    respond(0, PL);

    expect(rowText()).toContain('Chipboard');
    expect(rowText()).not.toContain('Płyta wiórowa');
    expect(responses[0].observed).toBeFalse();
  });

  it('stary błąd PL nie czyści potwierdzonej EN', () => {
    switchTo('en');
    respond(1, EN);
    responses[0].error(new Error('stary błąd'));
    fixture.detectChanges();

    expect(rowText()).toContain('Chipboard');
  });

  it('brak klucza w odpowiedzi używa dotychczasowego fallbacku', () => {
    respond(0, { 'MATERIAL.CHIPBOARD': 'Płyta wiórowa' });

    expect(rowText()).toContain('Płyta wiórowa');
    expect(rowText()).toContain('WHITE');
  });

  it('po zniszczeniu komponentu odpowiedź nie zmienia słownika', () => {
    fixture.destroy();
    expect(responses[0].observed).toBeFalse();

    responses[0].next(PL);
    expect(component.translations()).toEqual({});
  });

  it('błąd tłumaczeń nie usuwa wariantów ani nie zmienia paginatora i loadingu', () => {
    fail(0);

    expect(component.variants().map(v => v.id)).toEqual([1]);
    expect(component.totalElements()).toBe(1);
    expect(component.loading()).toBeFalse();
    expect(component.pageIndex()).toBe(0);
    expect(fixture.debugElement.query(By.directive(MatPaginator)).componentInstance.length).toBe(1);
    expect(materialAdminService.getBoardVariants).toHaveBeenCalledTimes(1);
  });
});

describe('BoardVariantListComponent - import CSV przez prawdziwy dialog', () => {
  let fixture: ComponentFixture<BoardVariantListComponent>;
  let service: jasmine.SpyObj<MaterialAdminService>;
  let toast: jasmine.SpyObj<ToastService>;
  let pending: Subject<CsvImportResultResponse>;
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
    transfer.items.add(new File(['materialCode;thicknessMm'], 'warianty.csv', { type: 'text/csv' }));
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

  beforeEach(async () => {
    service = jasmine.createSpyObj<MaterialAdminService>('MaterialAdminService',
      ['getBoardVariants', 'importBoardVariantsCsv']);
    service.getBoardVariants.and.returnValue(of(makeBoardPage([])));
    pending = new Subject<CsvImportResultResponse>();
    service.importBoardVariantsCsv.and.returnValue(pending as Observable<CsvImportResultResponse>);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getByCategories']);
    translationService.getByCategories.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [BoardVariantListComponent, NoopAnimationsModule],
      providers: [
        { provide: MaterialAdminService, useValue: service },
        { provide: ToastService, useValue: toast },
        { provide: TranslationService, useValue: translationService },
        { provide: LanguageService, useValue: { lang: signal<'pl' | 'en'>('pl') } },
        { provide: ConfirmDialogService, useValue: jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BoardVariantListComponent);
    fixture.detectChanges();
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    service.getBoardVariants.calls.reset();
  });

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('Escape po potwierdzonym zapisie odświeża listę dokładnie raz i pokazuje jeden komunikat', async () => {
    await openAndStartImport();
    pending.next({ added: 2, updated: 0, errors: [] });
    await settle();

    await pressEscape();

    expect(dialogOpen()).toBeFalse();
    expect(service.getBoardVariants).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledOnceWith('Import zakończony pomyślnie');
  });

  it('kliknięcie tła po potwierdzonym zapisie odświeża listę dokładnie raz', async () => {
    await openAndStartImport();
    pending.next({ added: 0, updated: 1, errors: [] });
    await settle();

    await clickBackdrop();

    expect(dialogOpen()).toBeFalse();
    expect(service.getBoardVariants).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('Escape po częściowym sukcesie odświeża listę dokładnie raz', async () => {
    await openAndStartImport();
    pending.next({ added: 1, updated: 1, errors: [{ lineNumber: 4, line: 'x', message: 'Zła cena' }] });
    await settle();

    await pressEscape();

    expect(service.getBoardVariants).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('przycisk Zamknij po zapisie nadal odświeża listę dokładnie raz', async () => {
    await openAndStartImport();
    pending.next({ added: 1, updated: 0, errors: [] });
    await settle();

    button('Zamknij').click();
    await macrotask();

    expect(service.getBoardVariants).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('same błędy wierszy: Escape nie odświeża listy', async () => {
    await openAndStartImport();
    pending.next({ added: 0, updated: 0, errors: [{ lineNumber: 2, line: 'x', message: 'Zły wiersz' }] });
    await settle();

    await pressEscape();

    expect(dialogOpen()).toBeFalse();
    expect(service.getBoardVariants).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('błąd HTTP: Escape nie odświeża listy', async () => {
    spyOn(console, 'error');
    await openAndStartImport();
    pending.error({ status: 500 });
    await settle();

    await pressEscape();

    expect(dialogOpen()).toBeFalse();
    expect(service.getBoardVariants).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('bez importu Escape nie odświeża listy', async () => {
    fixture.componentInstance.openImportDialog();
    await settle();

    await pressEscape();

    expect(dialogOpen()).toBeFalse();
    expect(service.getBoardVariants).not.toHaveBeenCalled();
  });

  it('podczas POST Escape ani tło nie zamykają dialogu i nie odświeżają listy', async () => {
    await openAndStartImport();

    await pressEscape();
    await clickBackdrop();

    expect(dialogOpen()).toBeTrue();
    expect(service.getBoardVariants).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('po zniszczeniu listy zamknięcie dialogu nie odświeża listy', async () => {
    await openAndStartImport();
    pending.next({ added: 1, updated: 0, errors: [] });
    await settle();

    fixture.destroy();
    TestBed.inject(MatDialog).closeAll();
    await macrotask();

    expect(service.getBoardVariants).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
