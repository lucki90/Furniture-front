import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { PriceEditTableComponent, BulkSaveEvent, PriceSaveEvent } from './price-edit-table.component';

/** Helper stub to provide required ContentChild templates via transclusion. */
@Component({
  template: `
    <app-price-edit-table
        [rows]="rows"
        [pageSize]="pageSize"
        priceField="pricePerUnit"
        (save)="onSave($event)"
        (bulkSave)="onBulkSave($event)">
      <ng-template #headers><th>Name</th></ng-template>
      <ng-template #rowCells let-r><td>{{ r.name }}</td></ng-template>
    </app-price-edit-table>
  `,
  standalone: true,
  imports: [PriceEditTableComponent],
})
class TestHostComponent {
  rows: any[] = [];
  pageSize = 3;
  lastSave: PriceSaveEvent | null = null;
  lastBulkSave: BulkSaveEvent | null = null;

  onSave(e: PriceSaveEvent) { this.lastSave = e; }
  onBulkSave(e: BulkSaveEvent) { this.lastBulkSave = e; }
}

function makeRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, pricePerUnit: 10 + i }));
}

describe('PriceEditTableComponent', () => {
  let host: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let table: PriceEditTableComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();

    const tableEl = fixture.debugElement.query(By.directive(PriceEditTableComponent));
    table = tableEl.componentInstance;
  });

  describe('pagination', () => {
    it('renders only first page when rows exceed pageSize', () => {
      host.rows = makeRows(7);
      host.pageSize = 3;
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
      expect(rows.length).toBe(3);
    });

    it('shows all rows when count is within pageSize', () => {
      host.rows = makeRows(3);
      host.pageSize = 3;
      fixture.detectChanges();

      expect(fixture.debugElement.queryAll(By.css('tbody tr')).length).toBe(3);
    });

    it('shows pagination footer only when rows.length > internalPageSize', () => {
      host.rows = makeRows(5);
      host.pageSize = 5;
      fixture.detectChanges();
      // At exactly pageSize there should be no prev/next page buttons
      expect(fixture.debugElement.query(By.css('.pte-pagination'))).toBeNull();

      host.rows = makeRows(6);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.pte-pagination'))).not.toBeNull();
    });

    it('resets to page 1 when rows input changes to a different row set', () => {
      host.rows = makeRows(9);
      host.pageSize = 3;
      fixture.detectChanges();

      // Navigate to page 2
      table.goToPage(2);
      fixture.detectChanges();
      expect(table.currentPage).toBe(2);

      // Change rows — page should reset
      host.rows = makeRows(12);
      fixture.detectChanges();
      expect(table.currentPage).toBe(1);
    });

    it('keeps the current page when rows change but the row ids stay the same', () => {
      host.rows = makeRows(9);
      host.pageSize = 3;
      fixture.detectChanges();

      table.goToPage(2);
      fixture.detectChanges();
      expect(table.currentPage).toBe(2);

      host.rows = makeRows(9).map(row =>
        row.id === 4 ? { ...row, pricePerUnit: 999 } : row
      );
      fixture.detectChanges();

      expect(table.currentPage).toBe(2);
    });

    it('goToPage does not go out of bounds', () => {
      host.rows = makeRows(6);
      host.pageSize = 3;
      fixture.detectChanges();

      table.goToPage(0);
      expect(table.currentPage).toBe(1);

      table.goToPage(99);
      expect(table.currentPage).toBe(1); // stays at 1, 2 is max
    });

    it('currentPageEnd equals rows.length on the last page', () => {
      host.rows = makeRows(7);
      host.pageSize = 3;
      fixture.detectChanges();

      table.goToPage(3); // last page: items 7
      fixture.detectChanges();
      expect(table.currentPageEnd).toBe(7);
    });
  });

  describe('page size selector', () => {
    it('@Input pageSize syncs to internalPageSize on ngOnChanges', () => {
      host.pageSize = 25;
      fixture.detectChanges();
      expect(table.internalPageSize).toBe(25);
    });

    it('setPageSize changes internalPageSize and resets page', () => {
      host.rows = makeRows(30);
      host.pageSize = 10;
      fixture.detectChanges();

      table.goToPage(2);
      expect(table.currentPage).toBe(2);

      table.setPageSize(25);
      expect(table.internalPageSize).toBe(25);
      expect(table.currentPage).toBe(1);
    });

    it('setPageSize clears selection', () => {
      host.rows = makeRows(5);
      host.pageSize = 10;
      fixture.detectChanges();

      table.toggleSelection(1);
      table.toggleSelection(2);
      expect(table.selectedCount).toBe(2);

      table.setPageSize(25);
      expect(table.selectedCount).toBe(0);
    });
  });

  describe('checkbox selection', () => {
    beforeEach(() => {
      host.rows = makeRows(5);
      host.pageSize = 5;
      fixture.detectChanges();
    });

    it('toggleSelection adds and removes ids', () => {
      table.toggleSelection(1);
      expect(table.selectedIds.has(1)).toBeTrue();

      table.toggleSelection(1);
      expect(table.selectedIds.has(1)).toBeFalse();
    });

    it('clearSelection empties selectedIds', () => {
      table.toggleSelection(1);
      table.toggleSelection(2);
      table.clearSelection();
      expect(table.selectedCount).toBe(0);
    });

    it('allCurrentPageSelected is true when all page rows are selected', () => {
      fixture.detectChanges();
      host.rows.forEach(r => table.toggleSelection(r.id));
      expect(table.allCurrentPageSelected).toBeTrue();
    });

    it('toggleAllCurrentPage selects all when none selected', () => {
      table.toggleAllCurrentPage();
      expect(table.selectedCount).toBe(5);
    });

    it('toggleAllCurrentPage deselects all when all selected', () => {
      table.toggleAllCurrentPage(); // select all
      table.toggleAllCurrentPage(); // deselect all
      expect(table.selectedCount).toBe(0);
    });

    it('rows change clears selection', () => {
      table.toggleSelection(1);
      expect(table.selectedCount).toBe(1);

      host.rows = makeRows(3);
      fixture.detectChanges();
      expect(table.selectedCount).toBe(0);
    });

    it('action bar appears when selectedCount > 0', () => {
      expect(fixture.debugElement.query(By.css('.pte-action-bar'))).toBeNull();

      table.toggleSelection(1);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.pte-action-bar'))).not.toBeNull();
    });

    it('action bar hidden when no rows selected', () => {
      expect(fixture.debugElement.query(By.css('.pte-action-bar'))).toBeNull();
    });
  });

  describe('bulk set for selected', () => {
    beforeEach(() => {
      host.rows = makeRows(5);
      host.pageSize = 5;
      fixture.detectChanges();
    });

    it('submitBulkForSelected emits bulkSave with selected ids', () => {
      table.toggleSelection(2);
      table.toggleSelection(4);
      table.bulkPrice = 99;

      let receivedEvent: BulkSaveEvent | null = null;
      fixture.componentInstance.onBulkSave = (e) => { receivedEvent = e; };

      table.submitBulkForSelected();

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.price).toBe(99);
      expect(receivedEvent!.ids).toEqual(jasmine.arrayContaining([2, 4]));
      expect(receivedEvent!.ids.length).toBe(2);
    });

    it('submitBulkForSelected does nothing when no rows selected', () => {
      let emitted = false;
      fixture.componentInstance.onBulkSave = () => { emitted = true; };

      table.submitBulkForSelected();
      expect(emitted).toBeFalse();
    });

    it('complete(true) clears selection and resets bulkPrice', () => {
      table.toggleSelection(1);
      table.bulkPrice = 50;

      let capturedEvent: BulkSaveEvent | null = null;
      host.onBulkSave = (e) => { capturedEvent = e; };
      fixture.detectChanges();

      table.submitBulkForSelected();

      capturedEvent!.complete(true);
      expect(table.selectedCount).toBe(0);
      expect(table.bulkPrice).toBe(0);
      expect(table.bulkSaving).toBeFalse();
    });

    it('complete(false) leaves selection intact', () => {
      table.toggleSelection(1);
      table.bulkPrice = 50;

      let capturedEvent: BulkSaveEvent | null = null;
      host.onBulkSave = (e) => { capturedEvent = e; };

      table.submitBulkForSelected();
      capturedEvent!.complete(false);

      expect(table.selectedCount).toBe(1);
      expect(table.bulkSaving).toBeFalse();
    });
  });
});
