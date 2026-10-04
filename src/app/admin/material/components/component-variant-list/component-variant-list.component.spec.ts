import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatPaginator } from '@angular/material/paginator';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
import { ToastService } from '../../../../core/error/toast.service';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { ComponentVariantAdminResponse, Page } from '../../model/material-variant.model';
import { MaterialAdminService } from '../../service/material-admin.service';
import { ComponentVariantListComponent } from './component-variant-list.component';

function makeComponentPage(content: ComponentVariantAdminResponse[]): Page<ComponentVariantAdminResponse> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: content.length || 10,
    number: 0,
    first: true,
    last: true,
    empty: content.length === 0
  };
}

describe('ComponentVariantListComponent', () => {
  let fixture: ComponentFixture<ComponentVariantListComponent>;
  let component: ComponentVariantListComponent;
  let materialAdminService: jasmine.SpyObj<MaterialAdminService>;

  const variants: ComponentVariantAdminResponse[] = [{
    id: 1,
    componentId: 11,
    componentCode: 'HINGE',
    componentCategory: 'HINGES',
    modelCode: 'BLUM-71B3550',
    additionalInfo: 'Soft close',
    priceEntryId: 101,
    currentPrice: 12.5,
    translationKey: null,
    active: true,
    createdAt: '2026-05-14T10:00:00Z',
    updatedAt: '2026-05-14T10:00:00Z'
  }];

  beforeEach(async () => {
    materialAdminService = jasmine.createSpyObj<MaterialAdminService>('MaterialAdminService', [
      'getComponentVariants',
      'deleteComponentVariant'
    ]);
    materialAdminService.getComponentVariants.and.returnValue(of(makeComponentPage(variants)));

    await TestBed.configureTestingModule({
      imports: [ComponentVariantListComponent, NoopAnimationsModule],
      providers: [
        { provide: MaterialAdminService, useValue: materialAdminService },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']) },
        { provide: ConfirmDialogService, useValue: jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentVariantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads component variants on init', () => {
    const count = fixture.nativeElement.querySelector('.settings-toolbar-count') as HTMLElement;
    const firstRow = fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement;

    expect(materialAdminService.getComponentVariants).toHaveBeenCalled();
    expect(count.textContent).toContain('1 wariant');
    expect(firstRow.textContent).toContain('HINGE');
    expect(firstRow.textContent).toContain('BLUM-71B3550');
  });

  it('renders create action button', () => {
    const createButton = fixture.nativeElement.querySelector('.admin-section-actions .btn-primary') as HTMLElement;

    expect(createButton.textContent).toContain('Dodaj wariant');
  });

  describe('kolejność odpowiedzi listy', () => {
    let first$: Subject<Page<ComponentVariantAdminResponse>>;
    let second$: Subject<Page<ComponentVariantAdminResponse>>;
    let third$: Subject<Page<ComponentVariantAdminResponse>>;
    let listFixture: ComponentFixture<ComponentVariantListComponent>;
    let list: ComponentVariantListComponent;
    let toastSpy: jasmine.SpyObj<ToastService>;

    const variantB: ComponentVariantAdminResponse = { ...variants[0], id: 2, componentCode: 'DRAWER', modelCode: 'BLUM-TANDEM' };

    function pageOf(content: ComponentVariantAdminResponse[], totalElements: number): Page<ComponentVariantAdminResponse> {
      return { ...makeComponentPage(content), totalElements };
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
      first$ = new Subject<Page<ComponentVariantAdminResponse>>();
      second$ = new Subject<Page<ComponentVariantAdminResponse>>();
      third$ = new Subject<Page<ComponentVariantAdminResponse>>();
      toastSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
      materialAdminService.getComponentVariants.calls.reset();
      materialAdminService.getComponentVariants.and.returnValues(first$, second$, third$);

      listFixture = TestBed.createComponent(ComponentVariantListComponent);
      listFixture.detectChanges();
      list = listFixture.componentInstance;
    });

    it('starsza odpowiedź nie nadpisuje listy ani paginatora po nowszym wyszukiwaniu', () => {
      list.searchQuery = 'B';
      list.onSearch();
      expect(materialAdminService.getComponentVariants).toHaveBeenCalledTimes(2);

      second$.next(pageOf([variantB], 2));
      second$.complete();
      first$.next(pageOf([variants[0]], 100));
      first$.complete();
      listFixture.detectChanges();

      expect(list.variants().map(v => v.id)).toEqual([2]);
      expect(list.totalElements()).toBe(2);
      expect(list.loading()).toBeFalse();
      expect(paginatorLength()).toBe(2);
      expect(renderedText()).toContain('DRAWER');
      expect(renderedText()).not.toContain('BLUM-71B3550');
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

      const calls = materialAdminService.getComponentVariants.calls.allArgs();
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
      expect(toastSpy.error).toHaveBeenCalledWith('Błąd podczas ładowania wariantów komponentów');
      expect(list.loading()).toBeFalse();
    });

    it('kolejne wyszukanie po błędzie działa', () => {
      first$.error(new Error('błąd'));
      list.searchQuery = 'B';
      list.onSearch();
      expect(list.loading()).toBeTrue();

      second$.next(pageOf([variantB], 1));
      second$.complete();

      expect(materialAdminService.getComponentVariants).toHaveBeenCalledTimes(2);
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
      materialAdminService.deleteComponentVariant.and.returnValue(of(undefined as void));
      first$.next(pageOf([variants[0]], 1));
      first$.complete();
      list.searchQuery = 'abc';
      list.activeOnly = true;
      list.pageIndex.set(3);

      list.onDelete(variants[0]);

      expect(materialAdminService.deleteComponentVariant).toHaveBeenCalledWith(variants[0].id);
      expect(materialAdminService.getComponentVariants).toHaveBeenCalledTimes(2);
      expect(materialAdminService.getComponentVariants.calls.mostRecent().args).toEqual([3, list.pageSize(), 'abc', true]);
    });
  });
});
