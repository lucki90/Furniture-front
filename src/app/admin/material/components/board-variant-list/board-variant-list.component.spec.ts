import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatPaginator } from '@angular/material/paginator';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
import { ToastService } from '../../../../core/error/toast.service';
import { LanguageService } from '../../../../service/language.service';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { TranslationService } from '../../../../translation/translation.service';
import { BoardVariantAdminResponse, Page } from '../../model/material-variant.model';
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
