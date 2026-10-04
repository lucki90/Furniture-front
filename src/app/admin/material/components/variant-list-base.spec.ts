import { TestBed } from '@angular/core/testing';
import { PageEvent } from '@angular/material/paginator';
import { Observable, Subject } from 'rxjs';
import { Page } from '../model/material-variant.model';
import { VariantListBase, pluralizeVariants } from './variant-list-base';

class TestVariantList extends VariantListBase<string> {
  loadCallCount = 0;
  override loadVariants(): void {
    this.loadCallCount++;
  }
}

class FetchingVariantList extends VariantListBase<string> {
  source$!: Observable<Page<string>>;
  errors = 0;
  override loadVariants(): void {
    this.loadPage(this.source$, () => this.errors++);
  }
}

function pageOf(content: string[], totalElements: number): Page<string> {
  return { content, totalElements, totalPages: 1, size: 10, number: 0, first: true, last: true, empty: !content.length };
}

function createList(): TestVariantList {
  return TestBed.runInInjectionContext(() => new TestVariantList());
}

describe('VariantListBase', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('onPageChange', () => {
    it('aktualizuje pageIndex i pageSize, a następnie wywołuje loadVariants', () => {
      const list = createList();
      const event: PageEvent = { pageIndex: 2, pageSize: 20, length: 100 };

      list.onPageChange(event);

      expect(list.pageIndex()).toBe(2);
      expect(list.pageSize()).toBe(20);
      expect(list.loadCallCount).toBe(1);
    });

    it('nie resetuje pageIndex — zachowuje przekazany numer strony', () => {
      const list = createList();
      list.pageIndex.set(5);

      list.onPageChange({ pageIndex: 3, pageSize: 10, length: 50 });

      expect(list.pageIndex()).toBe(3);
    });
  });

  describe('onSearch', () => {
    it('resetuje pageIndex do 0 i wywołuje loadVariants', () => {
      const list = createList();
      list.pageIndex.set(4);

      list.onSearch();

      expect(list.pageIndex()).toBe(0);
      expect(list.loadCallCount).toBe(1);
    });
  });

  describe('onActiveFilterChange', () => {
    it('resetuje pageIndex do 0 i wywołuje loadVariants', () => {
      const list = createList();
      list.pageIndex.set(7);

      list.onActiveFilterChange();

      expect(list.pageIndex()).toBe(0);
      expect(list.loadCallCount).toBe(1);
    });
  });

  describe('totalVariantsLabel', () => {
    it('wyświetla label z aktualnego sygnału totalElements', () => {
      const list = createList();
      list.totalElements.set(5);

      expect(list.totalVariantsLabel).toBe('5 wariantów');
    });
  });
});

describe('VariantListBase.loadPage', () => {
  let list: FetchingVariantList;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    list = TestBed.runInInjectionContext(() => new FetchingVariantList());
  });

  function load(): Subject<Page<string>> {
    const subject = new Subject<Page<string>>();
    list.source$ = subject;
    list.loadVariants();
    return subject;
  }

  it('ustawia loading, a po odpowiedzi dane i licznik', () => {
    const request$ = load();
    expect(list.loading()).toBeTrue();

    request$.next(pageOf(['a'], 7));

    expect(list.variants()).toEqual(['a']);
    expect(list.totalElements()).toBe(7);
    expect(list.loading()).toBeFalse();
  });

  it('nowsze żądanie anuluje poprzednie i ignoruje jego odpowiedź oraz błąd', () => {
    const first$ = load();
    const second$ = load();

    expect(first$.observers.length).toBe(0);
    first$.next(pageOf(['stara'], 100));
    first$.error(new Error('stary'));

    expect(list.variants()).toEqual([]);
    expect(list.loading()).toBeTrue();
    expect(list.errors).toBe(0);

    second$.next(pageOf(['nowa'], 1));
    expect(list.variants()).toEqual(['nowa']);
    expect(list.loading()).toBeFalse();
  });

  it('błąd aktualnego żądania wywołuje callback raz i kończy loading', () => {
    load().error(new Error('błąd'));

    expect(list.errors).toBe(1);
    expect(list.loading()).toBeFalse();
  });

  it('zniszczenie kończy odbiór', () => {
    const request$ = load();

    TestBed.resetTestingModule();

    expect(request$.observers.length).toBe(0);
  });
});

describe('pluralizeVariants', () => {
  it('zwraca "1 wariant" dla count=1', () => {
    expect(pluralizeVariants(1)).toBe('1 wariant');
  });

  it('zwraca "2 warianty" dla count=2', () => {
    expect(pluralizeVariants(2)).toBe('2 warianty');
  });

  it('zwraca "5 wariantów" dla count=5', () => {
    expect(pluralizeVariants(5)).toBe('5 wariantów');
  });

  it('zwraca "12 wariantów" dla count=12 (wyjątek teen)', () => {
    expect(pluralizeVariants(12)).toBe('12 wariantów');
  });

  it('zwraca "22 warianty" dla count=22', () => {
    expect(pluralizeVariants(22)).toBe('22 warianty');
  });

  it('zwraca "0 wariantów" dla count=0', () => {
    expect(pluralizeVariants(0)).toBe('0 wariantów');
  });

  it('zwraca "14 wariantów" dla count=14 (wyjątek teen)', () => {
    expect(pluralizeVariants(14)).toBe('14 wariantów');
  });
});
