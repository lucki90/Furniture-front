import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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

    it('shows toast on submitBulkForSelected error', () => {
      serviceSpy.update.and.returnValue(throwError(() => new Error('err')));
      component.toggleBoardSelection(OWN_1.id);
      component.bulkPrice = 50;
      component.submitBulkForSelected();
      expect(toastSpy.error).toHaveBeenCalledWith('Błąd podczas aktualizacji cen.');
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
