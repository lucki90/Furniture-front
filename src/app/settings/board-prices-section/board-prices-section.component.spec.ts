import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { BoardPricesSectionComponent } from './board-prices-section.component';
import { BoardPriceService, BoardPrice } from '../board-price.service';
import { ToastService } from '../../core/error/toast.service';

function makeBoardPrice(
  id: number,
  source: 'OWN' | 'GLOBAL',
  overrides: Partial<BoardPrice> = {}
): BoardPrice {
  return {
    id,
    materialCode: 'CHIPBOARD',
    materialName: 'MATERIAL.CHIPBOARD',
    thicknessMm: 18,
    colorCode: `COLOR_${id}`,
    colorName: `Color ${id}`,
    colorHex: null,
    varnished: false,
    materialActive: true,
    pricePerM2: 45 + id,
    source,
    priceEntryId: 100 + id,
    updatedAt: null,
    ...overrides,
  };
}

const OWN_1   = makeBoardPrice(1, 'OWN');
const OWN_2   = makeBoardPrice(2, 'OWN');
const GLOBAL_3 = makeBoardPrice(3, 'GLOBAL');

describe('BoardPricesSectionComponent', () => {
  let component: BoardPricesSectionComponent;
  let fixture: ComponentFixture<BoardPricesSectionComponent>;
  let serviceSpy: jasmine.SpyObj<BoardPriceService>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('BoardPriceService', [
      'list', 'create', 'update', 'deactivate', 'deactivateBulk', 'downloadTemplate', 'importCsv'
    ]);
    toastSpy = jasmine.createSpyObj('ToastService', ['error', 'success', 'warning']);
    serviceSpy.list.and.returnValue(of([OWN_1, OWN_2, GLOBAL_3]));

    await TestBed.configureTestingModule({
      imports: [BoardPricesSectionComponent],
      providers: [
        { provide: BoardPriceService, useValue: serviceSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BoardPricesSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Confirmed saves: PUT/GET answered in a controlled order through Subjects, asserted on the real template.

  let updates: Map<number, Subject<BoardPrice>>;
  let refresh: Subject<BoardPrice[]>;
  let emitted: BoardPrice[][];

  function loadRows(rows: BoardPrice[]): void {
    serviceSpy.list.and.returnValue(of(rows));
    component.loadBoardPrices();
    fixture.detectChanges();
  }

  function stubSaveRequests(ids: number[]): void {
    updates = new Map(ids.map(id => [id, new Subject<BoardPrice>()]));
    serviceSpy.update.and.callFake((id: number) => updates.get(id)!.asObservable());
    refresh = new Subject<BoardPrice[]>();
    serviceSpy.list.calls.reset();
    serviceSpy.list.and.returnValue(refresh.asObservable());
    emitted = [];
    component.boardPricesChanged.subscribe(prices => emitted.push(prices));
  }

  const colorText = (row: HTMLTableRowElement) =>
    row.cells[1].querySelector('.board-color-display > span:last-child')?.textContent!.trim() ?? '';

  function rowFor(colorName: string): HTMLTableRowElement {
    const rows = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
    const row = rows.find(tr => colorText(tr) === colorName);
    if (!row) {
      throw new Error(`No visible row for ${colorName}`);
    }
    return row;
  }

  const checkbox = (row: HTMLTableRowElement) => row.cells[0].querySelector('input') as HTMLInputElement;
  const priceText = (row: HTMLTableRowElement) => row.cells[5].textContent!.trim();
  const sourceText = (row: HTMLTableRowElement) => row.cells[6].textContent!.trim();
  const visibleColors = () => (Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[])
    .map(colorText);
  const noticeText = () =>
    (fixture.nativeElement.querySelector('.board-save-notice[role="alert"]') as HTMLElement | null)
      ?.textContent!.trim() ?? null;

  function selectRows(...colorNames: string[]): void {
    colorNames.forEach(name => checkbox(rowFor(name)).click());
    fixture.detectChanges();
  }

  function confirm(id: number, saved: BoardPrice): void {
    updates.get(id)!.next(saved);
    updates.get(id)!.complete();
    fixture.detectChanges();
  }

  function fail(id: number): void {
    updates.get(id)!.error(new HttpErrorResponse({ status: 500, statusText: 'Server Error' }));
    fixture.detectChanges();
  }

  function answerRefresh(rows: BoardPrice[]): void {
    refresh.next(rows);
    refresh.complete();
    fixture.detectChanges();
  }

  function failRefresh(): void {
    refresh.error(new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' }));
    fixture.detectChanges();
  }

  describe('initial load', () => {
    it('loads board prices on init', () => {
      expect(component.boardPrices.length).toBe(3);
      expect(component.boardPricesLoading).toBeFalse();
    });

    it('emits boardPricesChanged after load', () => {
      let emitted: BoardPrice[] | null = null;
      component.boardPricesChanged.subscribe(prices => emitted = prices);
      component.loadBoardPrices();
      expect(emitted).not.toBeNull();
      expect(emitted!.length).toBe(3);
    });
  });

  describe('pagination', () => {
    it('paginates correctly', () => {
      const manyBoards = Array.from({ length: 30 }, (_, i) => makeBoardPrice(i + 1, 'OWN'));
      serviceSpy.list.and.returnValue(of(manyBoards));
      component.boardPageSize = 25;
      component.loadBoardPrices();

      expect(component.boardTotalPages).toBe(2);
      expect(component.boardPaginatedPrices.length).toBe(25);
    });

    it('boardCurrentPageEnd is correct on last page', () => {
      const manyBoards = Array.from({ length: 30 }, (_, i) => makeBoardPrice(i + 1, 'OWN'));
      serviceSpy.list.and.returnValue(of(manyBoards));
      component.boardPageSize = 25;
      component.loadBoardPrices();

      component.goToBoardPage(2);
      expect(component.boardCurrentPageEnd).toBe(30);
    });

    it('resets to page 1 after reload', () => {
      const manyBoards = Array.from({ length: 30 }, (_, i) => makeBoardPrice(i + 1, 'OWN'));
      serviceSpy.list.and.returnValue(of(manyBoards));
      component.boardPageSize = 25;
      component.loadBoardPrices();
      component.goToBoardPage(2);

      component.loadBoardPrices();
      expect(component.boardCurrentPage).toBe(1);
    });
  });

  describe('page size selector', () => {
    it('default page size is 10', () => {
      expect(component.boardPageSize).toBe(10);
    });

    it('setBoardPageSize changes pageSize and resets to page 1', () => {
      const manyBoards = Array.from({ length: 30 }, (_, i) => makeBoardPrice(i + 1, 'OWN'));
      serviceSpy.list.and.returnValue(of(manyBoards));
      component.boardPageSize = 25;
      component.loadBoardPrices();
      component.goToBoardPage(2);

      component.setBoardPageSize(10);
      expect(component.boardPageSize).toBe(10);
      expect(component.boardCurrentPage).toBe(1);
    });

    it('setBoardPageSize clears selection', () => {
      component.toggleBoardSelection(OWN_1.id);
      expect(component.selectedBoardCount).toBe(1);

      component.setBoardPageSize(25);
      expect(component.selectedBoardCount).toBe(0);
    });

    it('pageSizeOptions includes 10, 25, 50, 100', () => {
      expect(component.boardPageSizeOptions).toEqual([10, 25, 50, 100]);
    });
  });

  // The select hands over what its options carry, so these go through the real DOM, not setBoardPageSize().
  describe('page size chosen in the select', () => {
    const boards = (count: number, overrides: (id: number) => Partial<BoardPrice> = () => ({})) =>
      Array.from({ length: count }, (_, i) => makeBoardPrice(i + 1, 'OWN', overrides(i + 1)));
    const pageSizeSelect = () => fixture.nativeElement.querySelector('.board-page-size-select') as HTMLSelectElement;
    const renderedRows = () => Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
    const renderedIds = () => visibleColors().map(color => Number(color.replace('Color ', '')));
    const pageInfo = () =>
      (fixture.nativeElement.querySelector('.board-page-info') as HTMLElement | null)?.textContent!.trim() ?? null;
    const range = (first: number, last: number) => Array.from({ length: last - first + 1 }, (_, i) => first + i);

    async function stabilize(): Promise<void> {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    async function chooseOption(select: HTMLSelectElement, label: string): Promise<void> {
      const option = Array.from(select.options).find(o => o.text.trim() === label);
      if (!option) {
        throw new Error(`No option ${label}`);
      }
      select.value = option.value;
      select.dispatchEvent(new Event('change'));
      await stabilize();
    }

    async function clickPage(page: number): Promise<void> {
      const button = (Array.from(fixture.nativeElement.querySelectorAll('.board-page-btn')) as HTMLButtonElement[])
        .find(b => b.textContent!.trim() === String(page));
      if (!button) {
        throw new Error(`No button for page ${page}`);
      }
      button.click();
      await stabilize();
    }

    it('renders exactly boards 26–50 on page 2 after choosing 25 of 100 boards', async () => {
      loadRows(boards(100));
      await stabilize();

      await chooseOption(pageSizeSelect(), '25');
      await clickPage(2);

      expect(typeof component.boardPageSize).toBe('number');
      expect(component.boardPageSize).toBe(25);
      expect(renderedIds()).toEqual(range(26, 50));
      expect(renderedRows().length).toBe(25);
      expect(pageInfo()).toBe('26–50 z 100');
    });

    it('offers 10, 25, 50 and 100 boards per page', async () => {
      loadRows(boards(100));
      await stabilize();

      expect(Array.from(pageSizeSelect().options).map(o => o.text.trim())).toEqual(['10', '25', '50', '100']);
      expect(pageSizeSelect().selectedOptions[0].text.trim()).toBe('10');
    });

    // 107 boards leave an incomplete last page for every offered size.
    [10, 25, 50, 100].forEach(size => {
      it(`pages 107 boards by ${size} chosen in the select, up to the incomplete last page`, async () => {
        loadRows(boards(107));
        await stabilize();

        await chooseOption(pageSizeSelect(), String(size));

        const lastPage = Math.ceil(107 / size);
        expect(component.boardPageSize).toBe(size);
        expect(pageSizeSelect().selectedOptions[0].text.trim()).toBe(String(size));
        expect(component.boardPageNumbers).toEqual(range(1, lastPage));
        for (let page = 1; page <= lastPage; page++) {
          await clickPage(page);
          const first = (page - 1) * size + 1;
          const last = Math.min(page * size, 107);
          expect(renderedIds()).withContext(`page ${page}`).toEqual(range(first, last));
          expect(pageInfo()).withContext(`page ${page}`).toBe(`${first}–${last} z 107`);
        }
      });
    });

    it('renders boards 51–75 on page 3 after choosing 25', async () => {
      loadRows(boards(100));
      await stabilize();

      await chooseOption(pageSizeSelect(), '25');
      await clickPage(3);

      expect(renderedIds()).toEqual(range(51, 75));
      expect(pageInfo()).toBe('51–75 z 100');
    });

    it('returns to page 1 and clears the selection when another page size is chosen', async () => {
      loadRows(boards(100));
      await stabilize();
      await clickPage(3);
      checkbox(renderedRows()[0]).click();
      checkbox(renderedRows()[1]).click();
      await stabilize();
      expect(Array.from(component.selectedBoardIds)).toEqual([21, 22]);

      await chooseOption(pageSizeSelect(), '25');

      expect(component.boardCurrentPage).toBe(1);
      expect(component.selectedBoardCount).toBe(0);
      expect(fixture.nativeElement.querySelector('.board-action-bar')).toBeNull();
      expect(fixture.nativeElement.querySelector('.board-page-btn.is-active').textContent.trim()).toBe('1');
      expect(renderedIds()).toEqual(range(1, 25));
    });

    it('selects exactly the boards of the current page with the header checkbox', async () => {
      loadRows(boards(100));
      await stabilize();
      await chooseOption(pageSizeSelect(), '25');
      await clickPage(2);

      (fixture.nativeElement.querySelector('thead input[type="checkbox"]') as HTMLInputElement).click();
      await stabilize();

      expect(Array.from(component.selectedBoardIds)).toEqual(range(26, 50));
      expect(fixture.nativeElement.querySelector('.board-action-label').textContent.trim()).toBe('Zaznaczono 25:');
      expect(renderedRows().every(tr => checkbox(tr).checked)).toBeTrue();
    });

    it('selects only the boards of the incomplete last page with the header checkbox', async () => {
      loadRows(boards(107));
      await stabilize();
      await chooseOption(pageSizeSelect(), '25');
      await clickPage(5);

      (fixture.nativeElement.querySelector('thead input[type="checkbox"]') as HTMLInputElement).click();
      await stabilize();

      expect(Array.from(component.selectedBoardIds)).toEqual(range(101, 107));
    });

    it('keeps the chosen page size and restarts at page 1 when the material filter changes', async () => {
      loadRows(boards(100, id => id % 2 === 0 ? { materialCode: 'MDF', materialName: 'MATERIAL.MDF' } : {}));
      await stabilize();
      await chooseOption(pageSizeSelect(), '25');
      await clickPage(2);

      await chooseOption(fixture.nativeElement.querySelectorAll('.board-filter-bar select')[0], 'MDF');

      expect(component.materialFilter).toBe('MDF');
      expect(component.boardPageSize).toBe(25);
      expect(component.boardCurrentPage).toBe(1);
      expect(renderedIds()).toEqual(range(1, 25).map(i => i * 2));
      await clickPage(2);
      expect(renderedIds()).toEqual(range(26, 50).map(i => i * 2));
      expect(pageInfo()).toBe('26–50 z 50');
    });

    it('pages the numeric thickness filter by the chosen page size', async () => {
      loadRows(boards(100, id => id > 40 ? { thicknessMm: 22 } : {}));
      await stabilize();
      await chooseOption(pageSizeSelect(), '25');

      await chooseOption(fixture.nativeElement.querySelectorAll('.board-filter-bar select')[1], '22 mm');

      expect(component.thicknessFilter).toBe(22);
      expect(component.boardPageSize).toBe(25);
      await clickPage(3);
      expect(renderedIds()).toEqual(range(91, 100));
      expect(pageInfo()).toBe('51–60 z 60');
    });
  });

  describe('deleteBoard', () => {
    it('reloads list after successful delete', () => {
      serviceSpy.deactivate.and.returnValue(of(undefined));
      const callCountBefore = serviceSpy.list.calls.count();

      component.deleteBoard(OWN_1.id);

      expect(serviceSpy.list.calls.count()).toBeGreaterThan(callCountBefore);
    });

    it('clears deletingBoardId on error', () => {
      serviceSpy.deactivate.and.returnValue(throwError(() => new Error('Server error')));

      component.deleteBoard(OWN_1.id);

      expect(component.deletingBoardId).toBeNull();
    });

    it('works for GLOBAL boards (backend handles shadow creation)', () => {
      serviceSpy.deactivate.and.returnValue(of(undefined));

      component.deleteBoard(GLOBAL_3.id);

      expect(serviceSpy.deactivate).toHaveBeenCalledWith(GLOBAL_3.id);
    });
  });

  describe('checkbox selection', () => {
    it('toggleBoardSelection adds and removes ids', () => {
      component.toggleBoardSelection(OWN_1.id);
      expect(component.selectedBoardIds.has(OWN_1.id)).toBeTrue();

      component.toggleBoardSelection(OWN_1.id);
      expect(component.selectedBoardIds.has(OWN_1.id)).toBeFalse();
    });

    it('clearBoardSelection empties selectedBoardIds', () => {
      component.toggleBoardSelection(OWN_1.id);
      component.toggleBoardSelection(OWN_2.id);
      component.clearBoardSelection();
      expect(component.selectedBoardCount).toBe(0);
    });

    it('allCurrentPageBoardsSelected reflects current page selection', () => {
      component.boardPaginatedPrices.forEach(bp => component.toggleBoardSelection(bp.id));
      expect(component.allCurrentPageBoardsSelected).toBeTrue();
    });

    it('toggleAllCurrentPageBoards selects all visible boards', () => {
      component.toggleAllCurrentPageBoards();
      expect(component.selectedBoardCount).toBe(component.boardPaginatedPrices.length);
    });

    it('toggleAllCurrentPageBoards deselects all when all are selected', () => {
      component.toggleAllCurrentPageBoards();
      component.toggleAllCurrentPageBoards();
      expect(component.selectedBoardCount).toBe(0);
    });
  });

  describe('deactivateSelected', () => {
    it('calls deactivateBulk with selected board ids', () => {
      serviceSpy.deactivateBulk.and.returnValue(of({ deactivated: 2 }));
      component.toggleBoardSelection(OWN_1.id);
      component.toggleBoardSelection(OWN_2.id);

      component.deactivateSelected();

      expect(serviceSpy.deactivateBulk).toHaveBeenCalledWith([OWN_1.id, OWN_2.id]);
    });

    it('clears selection after successful deactivate', () => {
      serviceSpy.deactivateBulk.and.returnValue(of({ deactivated: 1 }));
      component.toggleBoardSelection(OWN_1.id);

      component.deactivateSelected();

      expect(component.selectedBoardCount).toBe(0);
    });

    it('clears deactivatingSelected on error', () => {
      serviceSpy.deactivateBulk.and.returnValue(throwError(() => new Error('err')));
      component.toggleBoardSelection(OWN_1.id);

      component.deactivateSelected();

      expect(component.deactivatingSelected).toBeFalse();
    });

    it('does nothing when no boards are selected', () => {
      component.deactivateSelected();
      expect(serviceSpy.deactivateBulk).not.toHaveBeenCalled();
    });

    it('can deactivate GLOBAL boards (backend handles shadow)', () => {
      serviceSpy.deactivateBulk.and.returnValue(of({ deactivated: 1 }));
      component.toggleBoardSelection(GLOBAL_3.id);

      component.deactivateSelected();

      expect(serviceSpy.deactivateBulk).toHaveBeenCalledWith([GLOBAL_3.id]);
    });
  });

  describe('submitBulkForSelected', () => {
    it('calls update for each selected board', () => {
      const updatedOwn1 = { ...OWN_1, pricePerM2: 99 };
      const updatedOwn2 = { ...OWN_2, pricePerM2: 99 };
      serviceSpy.update.and.returnValues(of(updatedOwn1), of(updatedOwn2));

      component.toggleBoardSelection(OWN_1.id);
      component.toggleBoardSelection(OWN_2.id);
      component.bulkPrice = 99;
      component.submitBulkForSelected();

      expect(serviceSpy.update).toHaveBeenCalledTimes(2);
      expect(serviceSpy.update).toHaveBeenCalledWith(OWN_1.id, { pricePerM2: 99 });
      expect(serviceSpy.update).toHaveBeenCalledWith(OWN_2.id, { pricePerM2: 99 });
    });

    it('reloads list after successful bulk set', () => {
      serviceSpy.update.and.returnValue(of(OWN_1));
      const listCallsBefore = serviceSpy.list.calls.count();
      component.toggleBoardSelection(OWN_1.id);
      component.bulkPrice = 99;
      component.submitBulkForSelected();

      expect(serviceSpy.list.calls.count()).toBeGreaterThan(listCallsBefore);
    });

    it('clears selection after successful bulk set', () => {
      serviceSpy.update.and.returnValue(of(OWN_1));
      component.toggleBoardSelection(OWN_1.id);
      component.bulkPrice = 99;
      component.submitBulkForSelected();

      expect(component.selectedBoardCount).toBe(0);
      expect(component.bulkPrice).toBe(0);
    });

    it('does nothing when no boards selected', () => {
      component.submitBulkForSelected();
      expect(serviceSpy.update).not.toHaveBeenCalled();
    });

    it('can set price for GLOBAL boards (backend creates OWN override)', () => {
      const updatedGlobal = { ...GLOBAL_3, pricePerM2: 99, source: 'OWN' as const };
      serviceSpy.update.and.returnValue(of(updatedGlobal));

      component.toggleBoardSelection(GLOBAL_3.id);
      component.bulkPrice = 99;
      component.submitBulkForSelected();

      expect(serviceSpy.update).toHaveBeenCalledWith(GLOBAL_3.id, { pricePerM2: 99 });
    });
  });

  describe('submitBulkForSelected — independent PUTs and GLOBAL → OWN', () => {
    const OWN_1_10 = makeBoardPrice(1, 'OWN', { pricePerM2: 10 });
    const OWN_1_50 = makeBoardPrice(1, 'OWN', { pricePerM2: 50 });
    const OWN_2_20 = makeBoardPrice(2, 'OWN', { pricePerM2: 20 });
    const OWN_2_50 = makeBoardPrice(2, 'OWN', { pricePerM2: 50 });
    const GLOBAL_3_30 = makeBoardPrice(3, 'GLOBAL', { pricePerM2: 30 });
    // Clone-on-write: the override keeps GLOBAL 3's signature but gets its own id.
    const OWN_99_50 = makeBoardPrice(99, 'OWN', {
      colorCode: 'COLOR_3', colorName: 'Color 3', pricePerM2: 50, priceEntryId: 199,
    });

    const bulkButton = () =>
      fixture.nativeElement.querySelector('button.board-action-btn.btn-primary') as HTMLButtonElement | null;

    function clickBulkSave(price: number): void {
      component.bulkPrice = price;
      fixture.detectChanges();
      bulkButton()!.click();
      fixture.detectChanges();
    }

    it('keeps GLOBAL 3 → OWN 99 when the other PUT fails afterwards (success before error)', () => {
      loadRows([OWN_1_10, GLOBAL_3_30]);
      stubSaveRequests([3, 1]);
      selectRows('Color 3', 'Color 1');
      clickBulkSave(50);
      expect(serviceSpy.update.calls.allArgs()).toEqual([[3, { pricePerM2: 50 }], [1, { pricePerM2: 50 }]]);

      confirm(3, OWN_99_50);
      expect(serviceSpy.list).not.toHaveBeenCalled();
      expect(component.bulkSaving).toBeTrue();

      fail(1);
      // Every PUT settled: one refresh, the action stays locked until it answers.
      expect(serviceSpy.list).toHaveBeenCalledTimes(1);
      expect(component.bulkSaving).toBeTrue();
      expect(bulkButton()!.disabled).toBeTrue();
      expect(visibleColors()).toEqual(['Color 1', 'Color 3']);
      expect(priceText(rowFor('Color 3'))).toBe('50.00 zł');
      expect(sourceText(rowFor('Color 3'))).toBe('Własna');

      answerRefresh([OWN_1_10, OWN_99_50]);

      expect(component.bulkSaving).toBeFalse();
      expect(component.boardPrices.map(bp => bp.id)).toEqual([1, 99]);
      expect(emitted.map(list => list.map(bp => bp.id))).toEqual([[1, 99]]);
      expect(Array.from(component.selectedBoardIds)).toEqual(jasmine.arrayWithExactContents([1, 99]));
      expect(component.bulkPrice).toBe(50);
      expect(noticeText()).toContain('Potwierdzono zapis 1 z 2 pozycji.');
      expect(noticeText()).not.toContain('przywr');
      expect(toastSpy.success).not.toHaveBeenCalled();
      expect(toastSpy.error).not.toHaveBeenCalled();
      expect(serviceSpy.update).toHaveBeenCalledTimes(2);

      const row99 = rowFor('Color 3');
      expect(priceText(row99)).toBe('50.00 zł');
      expect(sourceText(row99)).toBe('Własna');
      expect(checkbox(row99).checked).toBeTrue();
      expect(priceText(rowFor('Color 1'))).toBe('10.00 zł');
      expect(checkbox(rowFor('Color 1')).checked).toBeTrue();
      expect(bulkButton()!.disabled).toBeFalse();
      expect(bulkButton()!.textContent).toContain('Ustal cene zaznaczonym');
      expect(fixture.nativeElement.textContent).toContain('Zaznaczono 2:');
    });

    it('does not let an early error cancel a later GLOBAL → OWN success (error before success)', () => {
      loadRows([OWN_1_10, GLOBAL_3_30]);
      stubSaveRequests([1, 3]);
      selectRows('Color 1', 'Color 3');
      clickBulkSave(50);

      fail(1);
      // GLOBAL 3 is still pending — no refresh yet and the action stays locked.
      expect(serviceSpy.list).not.toHaveBeenCalled();
      expect(component.bulkSaving).toBeTrue();
      expect(bulkButton()!.disabled).toBeTrue();

      confirm(3, OWN_99_50);
      expect(serviceSpy.list).toHaveBeenCalledTimes(1);

      answerRefresh([OWN_1_10, OWN_99_50]);

      expect(component.bulkSaving).toBeFalse();
      expect(component.boardPrices.map(bp => bp.id)).toEqual([1, 99]);
      expect(emitted.map(list => list.map(bp => bp.id))).toEqual([[1, 99]]);
      expect(Array.from(component.selectedBoardIds)).toEqual(jasmine.arrayWithExactContents([1, 99]));
      expect(noticeText()).toContain('Potwierdzono zapis 1 z 2 pozycji.');
      expect(priceText(rowFor('Color 3'))).toBe('50.00 zł');
      expect(sourceText(rowFor('Color 3'))).toBe('Własna');
      expect(checkbox(rowFor('Color 3')).checked).toBeTrue();
    });

    it('keeps confirmed OWN prices and leaves unselected rows alone (OWN + OWN, partial)', () => {
      loadRows([OWN_1_10, OWN_2_20, GLOBAL_3_30]);
      stubSaveRequests([1, 2]);
      selectRows('Color 1', 'Color 2');
      clickBulkSave(50);

      confirm(2, OWN_2_50);
      fail(1);
      expect(priceText(rowFor('Color 2'))).toBe('50.00 zł');

      answerRefresh([OWN_1_10, OWN_2_50, GLOBAL_3_30]);

      expect(component.bulkSaving).toBeFalse();
      expect(priceText(rowFor('Color 1'))).toBe('10.00 zł');
      expect(priceText(rowFor('Color 2'))).toBe('50.00 zł');
      expect(priceText(rowFor('Color 3'))).toBe('30.00 zł');
      expect(sourceText(rowFor('Color 3'))).toBe('Systemowa');
      expect(checkbox(rowFor('Color 3')).checked).toBeFalse();
      expect(Array.from(component.selectedBoardIds)).toEqual(jasmine.arrayWithExactContents([1, 2]));
      expect(emitted.map(list => list.map(bp => bp.pricePerM2))).toEqual([[10, 50, 30]]);
      expect(noticeText()).toContain('Potwierdzono zapis 1 z 2 pozycji.');
    });

    it('refreshes after a full success, then clears the selection and the bulk price', () => {
      loadRows([OWN_1_10, GLOBAL_3_30]);
      stubSaveRequests([3, 1]);
      selectRows('Color 3', 'Color 1');
      clickBulkSave(50);

      confirm(1, OWN_1_50);
      confirm(3, OWN_99_50);
      expect(serviceSpy.list).toHaveBeenCalledTimes(1);
      expect(component.bulkSaving).toBeTrue();
      expect(bulkButton()!.disabled).toBeTrue();

      answerRefresh([OWN_1_50, OWN_99_50]);

      expect(component.bulkSaving).toBeFalse();
      expect(component.selectedBoardCount).toBe(0);
      expect(component.bulkPrice).toBe(0);
      expect(noticeText()).toBeNull();
      expect(bulkButton()).toBeNull();
      expect(toastSpy.success).toHaveBeenCalledOnceWith('Zapisano nową cenę dla zaznaczonych płyt (2).');
      expect(emitted.map(list => list.map(bp => bp.id))).toEqual([[1, 99]]);
      expect(priceText(rowFor('Color 3'))).toBe('50.00 zł');
      expect(sourceText(rowFor('Color 3'))).toBe('Własna');
    });

    it('refreshes and keeps the selection when no PUT was confirmed', () => {
      loadRows([OWN_1_10, GLOBAL_3_30]);
      stubSaveRequests([3, 1]);
      selectRows('Color 3', 'Color 1');
      clickBulkSave(50);

      fail(3);
      expect(serviceSpy.list).not.toHaveBeenCalled();
      fail(1);
      expect(serviceSpy.list).toHaveBeenCalledTimes(1);
      expect(component.bulkSaving).toBeTrue();

      answerRefresh([OWN_1_10, GLOBAL_3_30]);

      expect(component.bulkSaving).toBeFalse();
      expect(Array.from(component.selectedBoardIds)).toEqual(jasmine.arrayWithExactContents([1, 3]));
      expect(component.bulkPrice).toBe(50);
      expect(noticeText()).toContain('Nie udało się potwierdzić zapisu zaznaczonych pozycji (2).');
      expect(toastSpy.success).not.toHaveBeenCalled();
      expect(priceText(rowFor('Color 1'))).toBe('10.00 zł');
      expect(priceText(rowFor('Color 3'))).toBe('30.00 zł');
      expect(sourceText(rowFor('Color 3'))).toBe('Systemowa');
      expect(bulkButton()!.disabled).toBeFalse();
      expect(serviceSpy.update).toHaveBeenCalledTimes(2);
    });

    it('keeps confirmed OWN rows and the loaded table when the refresh GET fails', () => {
      loadRows([OWN_1_10, GLOBAL_3_30]);
      stubSaveRequests([3, 1]);
      selectRows('Color 3', 'Color 1');
      clickBulkSave(50);

      confirm(3, OWN_99_50);
      fail(1);
      failRefresh();

      expect(component.bulkSaving).toBeFalse();
      expect(component.boardPrices.map(bp => [bp.id, bp.source, bp.pricePerM2]))
        .toEqual([[1, 'OWN', 10], [99, 'OWN', 50]]);
      expect(emitted.map(list => list.map(bp => bp.id))).toEqual([[1, 99]]);
      expect(Array.from(component.selectedBoardIds)).toEqual(jasmine.arrayWithExactContents([1, 99]));
      expect(noticeText()).toContain('Potwierdzono zapis 1 z 2 pozycji.');
      expect(noticeText()).toContain('Nie udało się odświeżyć cennika płyt z serwera');
      expect(fixture.nativeElement.textContent).not.toContain('Nie udało się załadować cennika płyt.');
      expect(visibleColors()).toEqual(['Color 1', 'Color 3']);
      expect(priceText(rowFor('Color 3'))).toBe('50.00 zł');
      expect(sourceText(rowFor('Color 3'))).toBe('Własna');
      expect(checkbox(rowFor('Color 3')).checked).toBeTrue();
      expect(bulkButton()!.disabled).toBeFalse();
    });

    it('reports a failed refresh after a full success without hiding the confirmed prices', () => {
      loadRows([OWN_1_10, GLOBAL_3_30]);
      stubSaveRequests([3, 1]);
      selectRows('Color 3', 'Color 1');
      clickBulkSave(50);

      confirm(3, OWN_99_50);
      confirm(1, OWN_1_50);
      failRefresh();

      expect(component.bulkSaving).toBeFalse();
      expect(component.selectedBoardCount).toBe(0);
      expect(component.bulkPrice).toBe(0);
      expect(toastSpy.success).not.toHaveBeenCalled();
      expect(noticeText()).toContain('Zapisano nową cenę dla zaznaczonych płyt (2).');
      expect(noticeText()).toContain('Nie udało się odświeżyć cennika płyt z serwera');
      expect(emitted.map(list => list.map(bp => [bp.id, bp.pricePerM2]))).toEqual([[[1, 50], [99, 50]]]);
      expect(priceText(rowFor('Color 1'))).toBe('50.00 zł');
      expect(priceText(rowFor('Color 3'))).toBe('50.00 zł');
    });

    it('keeps filters, the current page and unselected prices across a partial save', () => {
      const chipboard = Array.from({ length: 10 }, (_, i) => makeBoardPrice(i + 1, 'OWN', { pricePerM2: 20 }));
      const global11 = makeBoardPrice(11, 'GLOBAL', { pricePerM2: 30 });
      const own12 = makeBoardPrice(12, 'OWN', { pricePerM2: 20 });
      const mdf13 = makeBoardPrice(13, 'OWN', { materialCode: 'MDF', materialName: 'MATERIAL.MDF', pricePerM2: 20 });
      const own111 = makeBoardPrice(111, 'OWN', { colorCode: 'COLOR_11', colorName: 'Color 11', pricePerM2: 50 });
      loadRows([...chipboard, global11, own12, mdf13]);
      component.materialFilter = 'CHIPBOARD';
      component.onFilterChange();
      fixture.detectChanges();
      component.goToBoardPage(2);
      fixture.detectChanges();
      stubSaveRequests([11, 12]);
      selectRows('Color 11', 'Color 12');
      clickBulkSave(50);

      confirm(11, own111);
      fail(12);
      answerRefresh([...chipboard, own111, own12, mdf13]);

      expect(component.materialFilter).toBe('CHIPBOARD');
      expect(component.boardCurrentPage).toBe(2);
      expect(component.boardPaginatedPrices.map(bp => bp.id)).toEqual([111, 12]);
      expect(component.boardPrices.map(bp => bp.id)).not.toContain(11);
      expect(component.boardPrices.filter(bp => bp.id !== 111).every(bp => bp.pricePerM2 === 20)).toBeTrue();
      expect(Array.from(component.selectedBoardIds)).toEqual(jasmine.arrayWithExactContents([111, 12]));
      expect(priceText(rowFor('Color 11'))).toBe('50.00 zł');
      expect(sourceText(rowFor('Color 11'))).toBe('Własna');
      expect(checkbox(rowFor('Color 11')).checked).toBeTrue();
      expect(priceText(rowFor('Color 12'))).toBe('20.00 zł');
    });
  });

  describe('submitEditBoard', () => {
    it('reloads list after successful edit — ensures GLOBAL board id change is reflected', () => {
      // Arrange: backend returns an OWN copy with a NEW id (clone-on-write for GLOBAL boards)
      const newOwnRecord = { ...GLOBAL_3, id: 99, source: 'OWN' as const, pricePerM2: 100 };
      serviceSpy.update.and.returnValue(of(newOwnRecord));
      const listCallsBefore = serviceSpy.list.calls.count();

      // Act
      component.startEditBoard(GLOBAL_3);
      component.editBoardPrice = 100;
      component.submitEditBoard(GLOBAL_3);

      // Assert: list was reloaded, not just locally updated
      expect(serviceSpy.list.calls.count()).toBeGreaterThan(listCallsBefore);
    });

    it('clears editingBoardId after successful edit', () => {
      serviceSpy.update.and.returnValue(of(OWN_1));
      component.startEditBoard(OWN_1);
      expect(component.editingBoardId).toBe(OWN_1.id);

      component.submitEditBoard(OWN_1);

      expect(component.editingBoardId).toBeNull();
    });

    it('clears editBoardSaving on error', () => {
      serviceSpy.update.and.returnValue(throwError(() => new Error('err')));
      component.startEditBoard(OWN_1);
      component.submitEditBoard(OWN_1);

      expect(component.editBoardSaving).toBeFalse();
    });

    it('does not close edit mode on error', () => {
      serviceSpy.update.and.returnValue(throwError(() => new Error('err')));
      component.startEditBoard(OWN_1);
      component.submitEditBoard(OWN_1);

      // editingBoardId remains set on error — row stays in edit mode
      expect(component.editingBoardId).toBe(OWN_1.id);
    });
  });

  describe('submitEditBoard — confirmed PUT kept when the refresh fails', () => {
    const OWN_1_10 = makeBoardPrice(1, 'OWN', { pricePerM2: 10 });
    const CZARNY_2_20 = makeBoardPrice(2, 'OWN', { colorName: 'Czarny', colorHex: '#000000', pricePerM2: 20 });
    // OWN keeps its id and priceEntryId; the response carries the edited fields and a new updatedAt.
    const GRAFIT_2_75 = makeBoardPrice(2, 'OWN', {
      colorName: 'Grafit', colorHex: '#333333', pricePerM2: 75, updatedAt: '2026-10-03T12:00:00Z',
    });
    const BIALY_3_30 = makeBoardPrice(3, 'GLOBAL', { colorName: 'Biały', pricePerM2: 30 });
    // Clone-on-write: GLOBAL 3 is not modified, the confirmed override is OWN 99 with the same signature.
    const NOWY_BIALY_99_70 = makeBoardPrice(99, 'OWN', {
      colorCode: 'COLOR_3', colorName: 'Nowy biały', pricePerM2: 70, priceEntryId: 199,
      updatedAt: '2026-10-03T12:00:00Z',
    });

    const editedRow = () =>
      (fixture.nativeElement.querySelector('input.board-edit-input--price') as HTMLInputElement | null)
        ?.closest('tr') ?? null;
    const saveButton = (row: HTMLTableRowElement) =>
      row.cells[7].querySelector('button.btn-primary') as HTMLButtonElement;

    function typeInto(row: HTMLTableRowElement, selector: string, value: string): void {
      const input = row.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }

    async function openEditor(colorName: string): Promise<HTMLTableRowElement> {
      const editButton = Array.from(rowFor(colorName).cells[7].querySelectorAll('button'))
        .find(button => button.textContent!.trim() === 'Edytuj')!;
      editButton.click();
      fixture.detectChanges();
      // ngModel writes the row's current values into the editor asynchronously.
      await fixture.whenStable();
      fixture.detectChanges();
      return editedRow()!;
    }

    async function editAndSave(colorName: string, changes: { price: string; name?: string; hex?: string }): Promise<void> {
      const row = await openEditor(colorName);
      typeInto(row, '.board-edit-input--price', changes.price);
      if (changes.name !== undefined) {
        typeInto(row, '.board-edit-input--name', changes.name);
      }
      if (changes.hex !== undefined) {
        typeInto(row, '.board-edit-input--hex', changes.hex);
      }
      fixture.detectChanges();
      saveButton(row).click();
      fixture.detectChanges();
    }

    it('keeps a confirmed OWN edit (price and metadata) when the refresh GET fails', async () => {
      loadRows([OWN_1_10, CZARNY_2_20, BIALY_3_30]);
      stubSaveRequests([2]);
      selectRows('Color 1', 'Czarny');
      await editAndSave('Czarny', { price: '75', name: 'Grafit', hex: '#333333' });
      expect(serviceSpy.update).toHaveBeenCalledOnceWith(2, { pricePerM2: 75, colorName: 'Grafit', colorHex: '#333333' });

      confirm(2, GRAFIT_2_75);
      failRefresh();

      expect(component.boardPrices).toEqual([OWN_1_10, GRAFIT_2_75, BIALY_3_30]);
      expect(emitted).toEqual([[OWN_1_10, GRAFIT_2_75, BIALY_3_30]]);
      expect(component.editBoardSaving).toBeFalse();
      expect(editedRow()).toBeNull();
      expect(visibleColors()).toEqual(['Color 1', 'Grafit', 'Biały']);
      const row = rowFor('Grafit');
      expect(priceText(row)).toBe('75.00 zł');
      expect(sourceText(row)).toBe('Własna');
      expect((row.querySelector('.settings-color-swatch') as HTMLElement).title).toBe('#333333');
      expect(checkbox(row).checked).toBeTrue();
      expect(priceText(rowFor('Color 1'))).toBe('10.00 zł');
      expect(checkbox(rowFor('Color 1')).checked).toBeTrue();
      expect(priceText(rowFor('Biały'))).toBe('30.00 zł');
      expect(sourceText(rowFor('Biały'))).toBe('Systemowa');
      expect(Array.from(component.selectedBoardIds)).toEqual(jasmine.arrayWithExactContents([1, 2]));
      expect(noticeText()).toContain('Zapisano zmiany płyty.');
      expect(noticeText()).toContain('Nie udało się odświeżyć cennika płyt z serwera');
      expect(fixture.nativeElement.textContent).not.toContain('Nie udało się załadować cennika płyt.');
      expect(toastSpy.error).not.toHaveBeenCalled();
      expect(serviceSpy.update).toHaveBeenCalledTimes(1);
      expect(serviceSpy.list).toHaveBeenCalledTimes(1);
    });

    it('replaces GLOBAL 3 with the confirmed OWN 99 and moves the selection when the refresh GET fails', async () => {
      loadRows([OWN_1_10, BIALY_3_30]);
      stubSaveRequests([3]);
      selectRows('Biały');
      await editAndSave('Biały', { price: '70', name: 'Nowy biały' });
      expect(serviceSpy.update).toHaveBeenCalledOnceWith(3, { pricePerM2: 70, colorName: 'Nowy biały', colorHex: undefined });

      confirm(3, NOWY_BIALY_99_70);
      failRefresh();

      expect(component.boardPrices).toEqual([OWN_1_10, NOWY_BIALY_99_70]);
      expect(emitted).toEqual([[OWN_1_10, NOWY_BIALY_99_70]]);
      expect(Array.from(component.selectedBoardIds)).toEqual([99]);
      expect(component.editingBoardId).toBeNull();
      expect(component.editBoardSaving).toBeFalse();
      expect(visibleColors()).toEqual(['Color 1', 'Nowy biały']);
      const row = rowFor('Nowy biały');
      expect(priceText(row)).toBe('70.00 zł');
      expect(sourceText(row)).toBe('Własna');
      expect(checkbox(row).checked).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('Zaznaczono 1:');
      expect(fixture.nativeElement.textContent).not.toContain('30.00 zł');
      expect(fixture.nativeElement.textContent).not.toContain('Systemowa');
      expect(noticeText()).toContain('Zapisano zmiany płyty.');
      expect(noticeText()).toContain('Nie udało się odświeżyć cennika płyt z serwera');
      expect(toastSpy.error).not.toHaveBeenCalled();
    });

    it('uses the canonical list when the refresh after a confirmed edit succeeds', async () => {
      loadRows([OWN_1_10, BIALY_3_30]);
      stubSaveRequests([3]);
      selectRows('Biały');
      await editAndSave('Biały', { price: '70', name: 'Nowy biały' });
      confirm(3, NOWY_BIALY_99_70);

      // The effective list from the server wins over the locally applied response.
      const canonical1 = { ...OWN_1_10, pricePerM2: 12 };
      const canonical99 = { ...NOWY_BIALY_99_70, updatedAt: '2026-10-03T12:00:01Z' };
      answerRefresh([canonical1, canonical99]);

      expect(component.boardPrices).toEqual([canonical1, canonical99]);
      expect(emitted).toEqual([[canonical1, canonical99]]);
      expect(component.boardPricesError).toBeNull();
      expect(component.editBoardSaving).toBeFalse();
      expect(Array.from(component.selectedBoardIds)).toEqual([99]);
      expect(noticeText()).toBeNull();
      expect(priceText(rowFor('Color 1'))).toBe('12.00 zł');
      expect(priceText(rowFor('Nowy biały'))).toBe('70.00 zł');
      expect(sourceText(rowFor('Nowy biały'))).toBe('Własna');
      expect(checkbox(rowFor('Nowy biały')).checked).toBeTrue();
      expect(toastSpy.error).not.toHaveBeenCalled();
    });

    it('keeps the editor and its values and applies nothing when the PUT fails', async () => {
      loadRows([OWN_1_10, BIALY_3_30]);
      stubSaveRequests([3]);
      selectRows('Biały');
      await editAndSave('Biały', { price: '70', name: 'Nowy biały' });

      fail(3);

      expect(serviceSpy.list).not.toHaveBeenCalled();
      expect(toastSpy.error).toHaveBeenCalledOnceWith('Błąd podczas zapisywania ceny płyty.');
      expect(component.boardPrices).toEqual([OWN_1_10, BIALY_3_30]);
      expect(emitted).toEqual([]);
      expect(noticeText()).toBeNull();
      expect(component.editingBoardId).toBe(3);
      expect(component.editBoardPrice).toBe(70);
      expect(component.editBoardColorName).toBe('Nowy biały');
      const row = editedRow()!;
      expect((row.querySelector('.board-edit-input--price') as HTMLInputElement).value).toBe('70');
      expect((row.querySelector('.board-edit-input--name') as HTMLInputElement).value).toBe('Nowy biały');
      expect(sourceText(row)).toBe('Systemowa');
      expect(saveButton(row).disabled).toBeFalse();
      expect(saveButton(row).textContent!.trim()).toBe('Zapisz');
      expect(Array.from(component.selectedBoardIds)).toEqual([3]);
    });

    it('refreshes only after the PUT is confirmed and keeps saving locked until the refresh settles', async () => {
      loadRows([OWN_1_10, BIALY_3_30]);
      stubSaveRequests([3]);
      await editAndSave('Biały', { price: '70', name: 'Nowy biały' });

      expect(serviceSpy.list).not.toHaveBeenCalled();
      expect(saveButton(editedRow()!).disabled).toBeTrue();

      confirm(3, NOWY_BIALY_99_70);

      expect(serviceSpy.list).toHaveBeenCalledTimes(1);
      expect(editedRow()).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Ładowanie cennika...');
      expect(priceText(rowFor('Nowy biały'))).toBe('70.00 zł');
      expect(emitted).toEqual([]);
      // Another row can be opened for editing, but not saved until the refresh settles.
      const other = await openEditor('Color 1');
      expect(saveButton(other).disabled).toBeTrue();

      failRefresh();

      expect(component.editingBoardId).toBe(1);
      expect(saveButton(editedRow()!).disabled).toBeFalse();
      expect(saveButton(editedRow()!).textContent!.trim()).toBe('Zapisz');
      expect(emitted).toEqual([[OWN_1_10, NOWY_BIALY_99_70]]);
      expect(serviceSpy.update).toHaveBeenCalledTimes(1);
      expect(serviceSpy.list).toHaveBeenCalledTimes(1);
    });

    it('keeps filters, the page, unedited rows and the selection across a confirmed edit with a failed refresh', async () => {
      const chipboard = Array.from({ length: 10 }, (_, i) => makeBoardPrice(i + 1, 'OWN', { pricePerM2: 20 }));
      const global11 = makeBoardPrice(11, 'GLOBAL', { pricePerM2: 30 });
      const own12 = makeBoardPrice(12, 'OWN', { pricePerM2: 20 });
      const mdf13 = makeBoardPrice(13, 'OWN', { materialCode: 'MDF', materialName: 'MATERIAL.MDF', pricePerM2: 20 });
      const own111 = makeBoardPrice(111, 'OWN', {
        colorCode: 'COLOR_11', colorName: 'Color 11 nowy', pricePerM2: 70, priceEntryId: 211,
      });
      loadRows([...chipboard, global11, own12, mdf13]);
      component.materialFilter = 'CHIPBOARD';
      component.onFilterChange();
      fixture.detectChanges();
      component.goToBoardPage(2);
      fixture.detectChanges();
      stubSaveRequests([11]);
      selectRows('Color 11', 'Color 12');
      await editAndSave('Color 11', { price: '70', name: 'Color 11 nowy' });

      confirm(11, own111);
      failRefresh();

      expect(component.materialFilter).toBe('CHIPBOARD');
      expect(component.boardCurrentPage).toBe(2);
      expect(visibleColors()).toEqual(['Color 11 nowy', 'Color 12']);
      expect(component.boardPrices).toEqual([...chipboard, own111, own12, mdf13]);
      expect(emitted).toEqual([[...chipboard, own111, own12, mdf13]]);
      expect(Array.from(component.selectedBoardIds)).toEqual(jasmine.arrayWithExactContents([111, 12]));
      expect(priceText(rowFor('Color 11 nowy'))).toBe('70.00 zł');
      expect(sourceText(rowFor('Color 11 nowy'))).toBe('Własna');
      expect(checkbox(rowFor('Color 11 nowy')).checked).toBeTrue();
      expect(priceText(rowFor('Color 12'))).toBe('20.00 zł');
      expect(checkbox(rowFor('Color 12')).checked).toBeTrue();
    });
  });

  describe('filtering', () => {
    it('filteredBoardPrices returns all boards when no filters active', () => {
      expect(component.filteredBoardPrices.length).toBe(3);
    });

    it('colorFilter filters by colorName (case-insensitive)', () => {
      component.colorFilter = 'color 1';
      expect(component.filteredBoardPrices.length).toBe(1);
      expect(component.filteredBoardPrices[0].id).toBe(1);
    });

    it('colorFilter filters by colorCode', () => {
      component.colorFilter = 'COLOR_2';
      expect(component.filteredBoardPrices.length).toBe(1);
      expect(component.filteredBoardPrices[0].id).toBe(2);
    });

    it('materialFilter filters by materialCode', () => {
      // All 3 boards have CHIPBOARD — filter should return all
      component.materialFilter = 'CHIPBOARD';
      expect(component.filteredBoardPrices.length).toBe(3);
    });

    it('varnishedFilter filters by varnished flag', () => {
      // Load boards where one is varnished
      const boards = [
        makeBoardPrice(1, 'OWN', { varnished: true }),
        makeBoardPrice(2, 'OWN', { varnished: false }),
      ];
      serviceSpy.list.and.returnValue(of(boards));
      component.loadBoardPrices();

      component.varnishedFilter = 'true';
      expect(component.filteredBoardPrices.length).toBe(1);
      expect(component.filteredBoardPrices[0].varnished).toBeTrue();
    });

    it('thicknessFilter filters by thicknessMm', () => {
      const boards = [
        makeBoardPrice(1, 'OWN', { thicknessMm: 18 }),
        makeBoardPrice(2, 'OWN', { thicknessMm: 22 }),
      ];
      serviceSpy.list.and.returnValue(of(boards));
      component.loadBoardPrices();

      component.thicknessFilter = 22;
      expect(component.filteredBoardPrices.length).toBe(1);
      expect(component.filteredBoardPrices[0].thicknessMm).toBe(22);
    });

    it('multiple filters combined narrow results', () => {
      component.colorFilter = 'color';  // matches all 3
      component.materialFilter = 'CHIPBOARD'; // matches all 3
      component.varnishedFilter = 'false'; // matches all 3 (varnished=false)
      expect(component.filteredBoardPrices.length).toBe(3);

      component.colorFilter = 'color 1'; // now narrows to 1
      expect(component.filteredBoardPrices.length).toBe(1);
    });

    it('hasActiveFilters is false when no filters set', () => {
      expect(component.hasActiveFilters).toBeFalse();
    });

    it('hasActiveFilters is true when colorFilter is set', () => {
      component.colorFilter = 'test';
      expect(component.hasActiveFilters).toBeTrue();
    });

    it('hasActiveFilters is true when materialFilter is set', () => {
      component.materialFilter = 'CHIPBOARD';
      expect(component.hasActiveFilters).toBeTrue();
    });

    it('hasActiveFilters is true when thicknessFilter is set', () => {
      component.thicknessFilter = 18;
      expect(component.hasActiveFilters).toBeTrue();
    });

    it('clearFilters resets all filter fields and page', () => {
      component.colorFilter = 'test';
      component.materialFilter = 'CHIPBOARD';
      component.thicknessFilter = 18;
      component.varnishedFilter = 'true';
      component.boardCurrentPage = 3;

      component.clearFilters();

      expect(component.colorFilter).toBe('');
      expect(component.materialFilter).toBe('');
      expect(component.thicknessFilter).toBeNull();
      expect(component.varnishedFilter).toBe('');
      expect(component.boardCurrentPage).toBe(1);
      expect(component.hasActiveFilters).toBeFalse();
    });

    it('onFilterChange resets page to 1', () => {
      component.boardCurrentPage = 5;
      component.onFilterChange();
      expect(component.boardCurrentPage).toBe(1);
    });

    it('onFilterChange prunes selection to rows still visible after filtering', () => {
      component.toggleBoardSelection(OWN_1.id);
      component.toggleBoardSelection(OWN_2.id);
      component.colorFilter = 'color 1';

      component.onFilterChange();

      expect(component.selectedBoardCount).toBe(1);
      expect(component.selectedBoardIds.has(OWN_1.id)).toBeTrue();
      expect(component.selectedBoardIds.has(OWN_2.id)).toBeFalse();
    });

    it('loadBoardPrices prunes selection to rows visible in refreshed data', () => {
      component.toggleBoardSelection(OWN_1.id);
      component.toggleBoardSelection(OWN_2.id);
      component.colorFilter = 'color 1';
      serviceSpy.list.and.returnValue(of([OWN_1, OWN_2, GLOBAL_3]));

      component.loadBoardPrices();

      expect(component.selectedBoardCount).toBe(1);
      expect(component.selectedBoardIds.has(OWN_1.id)).toBeTrue();
      expect(component.selectedBoardIds.has(OWN_2.id)).toBeFalse();
    });

    it('pagination respects filtered results — totalPages', () => {
      component.colorFilter = 'color 1'; // only 1 result
      expect(component.boardTotalPages).toBe(1);
    });

    it('distinctMaterials returns unique sorted material codes', () => {
      const boards = [
        makeBoardPrice(1, 'OWN', { materialCode: 'MDF' }),
        makeBoardPrice(2, 'OWN', { materialCode: 'CHIPBOARD' }),
        makeBoardPrice(3, 'OWN', { materialCode: 'MDF' }),
      ];
      serviceSpy.list.and.returnValue(of(boards));
      component.loadBoardPrices();

      expect(component.distinctMaterials).toEqual(['CHIPBOARD', 'MDF']);
    });

    it('distinctThicknesses returns unique sorted thicknesses', () => {
      const boards = [
        makeBoardPrice(1, 'OWN', { thicknessMm: 22 }),
        makeBoardPrice(2, 'OWN', { thicknessMm: 18 }),
        makeBoardPrice(3, 'OWN', { thicknessMm: 18 }),
      ];
      serviceSpy.list.and.returnValue(of(boards));
      component.loadBoardPrices();

      expect(component.distinctThicknesses).toEqual([18, 22]);
    });
  });

  describe('error feedback (toast)', () => {
    it('shows toast on deleteBoard error', () => {
      serviceSpy.deactivate.and.returnValue(throwError(() => new Error('err')));
      component.deleteBoard(OWN_1.id);
      expect(toastSpy.error).toHaveBeenCalledWith('Błąd podczas usuwania płyty.');
    });

    it('shows toast on deactivateSelected error', () => {
      serviceSpy.deactivateBulk.and.returnValue(throwError(() => new Error('err')));
      component.toggleBoardSelection(OWN_1.id);
      component.deactivateSelected();
      expect(toastSpy.error).toHaveBeenCalledWith('Błąd podczas dezaktywacji płyt.');
    });

    it('shows toast on submitEditBoard error', () => {
      serviceSpy.update.and.returnValue(throwError(() => new Error('err')));
      component.startEditBoard(OWN_1);
      component.submitEditBoard(OWN_1);
      expect(toastSpy.error).toHaveBeenCalledWith('Błąd podczas zapisywania ceny płyty.');
    });

    it('reports an unconfirmed submitBulkForSelected inline instead of a generic error toast', () => {
      serviceSpy.update.and.returnValue(throwError(() => new Error('err')));
      component.toggleBoardSelection(OWN_1.id);
      component.bulkPrice = 50;
      component.submitBulkForSelected();
      fixture.detectChanges();
      expect(toastSpy.error).not.toHaveBeenCalledWith('Błąd podczas aktualizacji cen.');
      expect(fixture.nativeElement.querySelector('.board-save-notice[role="alert"]')?.textContent)
        .toContain('Nie udało się potwierdzić zapisu zaznaczonych pozycji (1).');
    });

    it('shows toast on downloadCsvTemplate error', () => {
      serviceSpy.downloadTemplate.and.returnValue(throwError(() => new Error('err')));
      component.downloadCsvTemplate();
      expect(toastSpy.error).toHaveBeenCalledWith('Błąd podczas pobierania szablonu CSV.');
    });

    it('shows toast on onCsvFileSelected error', () => {
      serviceSpy.importCsv.and.returnValue(throwError(() => new Error('err')));
      const mockFile = new File(['col1,col2\nval1,val2'], 'prices.csv', { type: 'text/csv' });
      const mockInput = { files: [mockFile], value: '' } as unknown as HTMLInputElement;
      const mockEvent = { target: mockInput } as unknown as Event;

      component.onCsvFileSelected(mockEvent);

      expect(component.csvImporting).toBeFalse();
      expect(toastSpy.error).toHaveBeenCalledWith('Błąd podczas importu CSV.');
    });
  });
});
