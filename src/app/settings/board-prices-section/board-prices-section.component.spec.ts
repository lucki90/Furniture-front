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

    let updates: Map<number, Subject<BoardPrice>>;
    let refresh: Subject<BoardPrice[]>;
    let emitted: BoardPrice[][];

    function loadRows(rows: BoardPrice[]): void {
      serviceSpy.list.and.returnValue(of(rows));
      component.loadBoardPrices();
      fixture.detectChanges();
    }

    function stubBulkRequests(ids: number[]): void {
      updates = new Map(ids.map(id => [id, new Subject<BoardPrice>()]));
      serviceSpy.update.and.callFake((id: number) => updates.get(id)!.asObservable());
      refresh = new Subject<BoardPrice[]>();
      serviceSpy.list.calls.reset();
      serviceSpy.list.and.returnValue(refresh.asObservable());
      emitted = [];
      component.boardPricesChanged.subscribe(prices => emitted.push(prices));
    }

    const colorText = (row: HTMLTableRowElement) =>
      row.cells[1].querySelector('.board-color-display > span:last-child')!.textContent!.trim();

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
    const bulkButton = () =>
      fixture.nativeElement.querySelector('button.board-action-btn.btn-primary') as HTMLButtonElement | null;
    const noticeText = () =>
      (fixture.nativeElement.querySelector('.board-bulk-notice[role="alert"]') as HTMLElement | null)
        ?.textContent!.trim() ?? null;

    function selectRows(...colorNames: string[]): void {
      colorNames.forEach(name => checkbox(rowFor(name)).click());
      fixture.detectChanges();
    }

    function clickBulkSave(price: number): void {
      component.bulkPrice = price;
      fixture.detectChanges();
      bulkButton()!.click();
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

    it('keeps GLOBAL 3 → OWN 99 when the other PUT fails afterwards (success before error)', () => {
      loadRows([OWN_1_10, GLOBAL_3_30]);
      stubBulkRequests([3, 1]);
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
      stubBulkRequests([1, 3]);
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
      stubBulkRequests([1, 2]);
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
      stubBulkRequests([3, 1]);
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
      stubBulkRequests([3, 1]);
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
      stubBulkRequests([3, 1]);
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
      stubBulkRequests([3, 1]);
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
      stubBulkRequests([11, 12]);
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
      expect(fixture.nativeElement.querySelector('.board-bulk-notice[role="alert"]')?.textContent)
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
