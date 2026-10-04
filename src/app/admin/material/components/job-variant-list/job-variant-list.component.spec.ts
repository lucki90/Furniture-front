import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatPaginator } from '@angular/material/paginator';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
import { ToastService } from '../../../../core/error/toast.service';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { JobVariantAdminResponse, Page } from '../../model/material-variant.model';
import { MaterialAdminService } from '../../service/material-admin.service';
import { JobVariantListComponent } from './job-variant-list.component';

function makeJobPage(content: JobVariantAdminResponse[]): Page<JobVariantAdminResponse> {
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

describe('JobVariantListComponent', () => {
  let fixture: ComponentFixture<JobVariantListComponent>;
  let component: JobVariantListComponent;
  let materialAdminService: jasmine.SpyObj<MaterialAdminService>;

  const variants: JobVariantAdminResponse[] = [{
    id: 1,
    jobId: 12,
    jobCode: 'CUTTING',
    jobCategory: 'MACHINING',
    variantCode: 'STRAIGHT',
    unit: 'mb',
    materialId: null,
    thicknessThresholdMm: null,
    priceEntryId: 102,
    currentPrice: 5.5,
    translationKey: null,
    active: true,
    createdAt: '2026-05-14T10:00:00Z',
    updatedAt: '2026-05-14T10:00:00Z'
  }];

  beforeEach(async () => {
    materialAdminService = jasmine.createSpyObj<MaterialAdminService>('MaterialAdminService', [
      'getJobVariants',
      'deleteJobVariant'
    ]);
    materialAdminService.getJobVariants.and.returnValue(of(makeJobPage(variants)));

    await TestBed.configureTestingModule({
      imports: [JobVariantListComponent, NoopAnimationsModule],
      providers: [
        { provide: MaterialAdminService, useValue: materialAdminService },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']) },
        { provide: ConfirmDialogService, useValue: jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JobVariantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads job variants on init', () => {
    const count = fixture.nativeElement.querySelector('.settings-toolbar-count') as HTMLElement;
    const firstRow = fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement;

    expect(materialAdminService.getJobVariants).toHaveBeenCalled();
    expect(count.textContent).toContain('1 wariant');
    expect(firstRow.textContent).toContain('CUTTING');
    expect(firstRow.textContent).toContain('STRAIGHT');
  });

  it('renders row action button', () => {
    const actionButton = fixture.nativeElement.querySelector('.actions-cell button') as HTMLElement;

    expect(actionButton).not.toBeNull();
  });

  it('anuluje aktywny request po zniszczeniu komponentu', () => {
    const result$ = new Subject<Page<JobVariantAdminResponse>>();
    materialAdminService.getJobVariants.and.returnValue(result$);
    const localFixture = TestBed.createComponent(JobVariantListComponent);

    localFixture.detectChanges();
    expect(result$.observers.length).toBe(1);

    localFixture.destroy();

    expect(result$.observers.length).toBe(0);
  });

  describe('kolejność odpowiedzi listy', () => {
    let first$: Subject<Page<JobVariantAdminResponse>>;
    let second$: Subject<Page<JobVariantAdminResponse>>;
    let third$: Subject<Page<JobVariantAdminResponse>>;
    let listFixture: ComponentFixture<JobVariantListComponent>;
    let list: JobVariantListComponent;
    let toastSpy: jasmine.SpyObj<ToastService>;

    const variantB: JobVariantAdminResponse = { ...variants[0], id: 2, jobCode: 'EDGING', variantCode: 'LASER' };

    function pageOf(content: JobVariantAdminResponse[], totalElements: number): Page<JobVariantAdminResponse> {
      return { ...makeJobPage(content), totalElements };
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
      first$ = new Subject<Page<JobVariantAdminResponse>>();
      second$ = new Subject<Page<JobVariantAdminResponse>>();
      third$ = new Subject<Page<JobVariantAdminResponse>>();
      toastSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
      materialAdminService.getJobVariants.calls.reset();
      materialAdminService.getJobVariants.and.returnValues(first$, second$, third$);

      listFixture = TestBed.createComponent(JobVariantListComponent);
      listFixture.detectChanges();
      list = listFixture.componentInstance;
    });

    it('starsza odpowiedź nie nadpisuje listy ani paginatora po nowszym wyszukiwaniu', () => {
      list.searchQuery = 'B';
      list.onSearch();
      expect(materialAdminService.getJobVariants).toHaveBeenCalledTimes(2);

      second$.next(pageOf([variantB], 2));
      second$.complete();
      first$.next(pageOf([variants[0]], 100));
      first$.complete();
      listFixture.detectChanges();

      expect(list.variants().map(v => v.id)).toEqual([2]);
      expect(list.totalElements()).toBe(2);
      expect(list.loading()).toBeFalse();
      expect(paginatorLength()).toBe(2);
      expect(renderedText()).toContain('EDGING');
      expect(renderedText()).not.toContain('CUTTING');
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

      const calls = materialAdminService.getJobVariants.calls.allArgs();
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
      expect(toastSpy.error).toHaveBeenCalledWith('Błąd podczas ładowania wariantów prac');
      expect(list.loading()).toBeFalse();
    });

    it('kolejne wyszukanie po błędzie działa', () => {
      first$.error(new Error('błąd'));
      list.searchQuery = 'B';
      list.onSearch();
      expect(list.loading()).toBeTrue();

      second$.next(pageOf([variantB], 1));
      second$.complete();

      expect(materialAdminService.getJobVariants).toHaveBeenCalledTimes(2);
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
      materialAdminService.deleteJobVariant.and.returnValue(of(undefined as void));
      first$.next(pageOf([variants[0]], 1));
      first$.complete();
      list.searchQuery = 'abc';
      list.activeOnly = true;
      list.pageIndex.set(3);

      list.onDelete(variants[0]);

      expect(materialAdminService.deleteJobVariant).toHaveBeenCalledWith(variants[0].id);
      expect(materialAdminService.getJobVariants).toHaveBeenCalledTimes(2);
      expect(materialAdminService.getJobVariants.calls.mostRecent().args).toEqual([3, list.pageSize(), 'abc', true]);
    });
  });
});
