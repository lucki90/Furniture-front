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
        [error]="error"
        [bulkSaveError]="bulkSaveError"
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
  error: string | null = null;
  bulkSaveError: string | null = null;
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

  // The select hands over what its options carry, so these go through the real DOM, not setPageSize().
  describe('page size chosen in the select', () => {
    const pageSizeSelect = () => fixture.nativeElement.querySelector('.pte-page-size-select') as HTMLSelectElement;
    const renderedRows = () => Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
    const renderedIds = () => renderedRows().map(tr => Number(tr.cells[1].textContent!.trim().replace('Item ', '')));
    const pageInfo = () =>
      (fixture.nativeElement.querySelector('.pte-page-info') as HTMLElement | null)?.textContent!.trim() ?? null;
    const range = (first: number, last: number) => Array.from({ length: last - first + 1 }, (_, i) => first + i);

    async function stabilize(): Promise<void> {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    async function showRows(count: number): Promise<void> {
      host.rows = makeRows(count);
      host.pageSize = 10;
      await stabilize();
    }

    async function choosePageSize(label: string): Promise<void> {
      const select = pageSizeSelect();
      const option = Array.from(select.options).find(o => o.text.trim() === label);
      if (!option) {
        throw new Error(`No page size option ${label}`);
      }
      select.value = option.value;
      select.dispatchEvent(new Event('change'));
      await stabilize();
    }

    async function clickPage(page: number): Promise<void> {
      const button = (Array.from(fixture.nativeElement.querySelectorAll('.pte-page-btn')) as HTMLButtonElement[])
        .find(b => b.textContent!.trim() === String(page));
      if (!button) {
        throw new Error(`No button for page ${page}`);
      }
      button.click();
      await stabilize();
    }

    it('renders exactly rows 26–50 on page 2 after choosing 25 of 100 rows', async () => {
      await showRows(100);

      await choosePageSize('25');
      await clickPage(2);

      expect(typeof table.internalPageSize).toBe('number');
      expect(table.internalPageSize).toBe(25);
      expect(renderedIds()).toEqual(range(26, 50));
      expect(renderedRows().length).toBe(25);
      expect(pageInfo()).toBe('26–50 z 100');
    });

    it('offers 10, 25, 50 and 100 rows per page', async () => {
      await showRows(100);

      expect(Array.from(pageSizeSelect().options).map(o => o.text.trim())).toEqual(['10', '25', '50', '100']);
      expect(pageSizeSelect().selectedOptions[0].text.trim()).toBe('10');
    });

    // 107 rows leave an incomplete last page for every offered size.
    [10, 25, 50, 100].forEach(size => {
      it(`pages 107 rows by ${size} chosen in the select, up to the incomplete last page`, async () => {
        await showRows(107);

        await choosePageSize(String(size));

        const lastPage = Math.ceil(107 / size);
        expect(table.internalPageSize).toBe(size);
        expect(pageSizeSelect().selectedOptions[0].text.trim()).toBe(String(size));
        expect(table.pageNumbers).toEqual(range(1, lastPage));
        for (let page = 1; page <= lastPage; page++) {
          await clickPage(page);
          const first = (page - 1) * size + 1;
          const last = Math.min(page * size, 107);
          expect(renderedIds()).withContext(`page ${page}`).toEqual(range(first, last));
          expect(pageInfo()).withContext(`page ${page}`).toBe(`${first}–${last} z 107`);
        }
      });
    });

    it('renders rows 51–75 on page 3 after choosing 25', async () => {
      await showRows(100);

      await choosePageSize('25');
      await clickPage(3);

      expect(renderedIds()).toEqual(range(51, 75));
      expect(pageInfo()).toBe('51–75 z 100');
    });

    it('returns to page 1 and clears the selection when another page size is chosen', async () => {
      await showRows(100);
      await clickPage(3);
      renderedRows()[0].cells[0].querySelector('input')!.click();
      renderedRows()[1].cells[0].querySelector('input')!.click();
      await stabilize();
      expect(Array.from(table.selectedIds)).toEqual([21, 22]);

      await choosePageSize('25');

      expect(table.currentPage).toBe(1);
      expect(table.selectedCount).toBe(0);
      expect(fixture.nativeElement.querySelector('.pte-action-bar')).toBeNull();
      expect(fixture.nativeElement.querySelector('.pte-page-btn.is-active').textContent.trim()).toBe('1');
      expect(renderedIds()).toEqual(range(1, 25));
    });

    it('selects exactly the rows of the current page with the header checkbox', async () => {
      await showRows(100);
      await choosePageSize('25');
      await clickPage(2);

      (fixture.nativeElement.querySelector('thead input[type="checkbox"]') as HTMLInputElement).click();
      await stabilize();

      expect(Array.from(table.selectedIds)).toEqual(range(26, 50));
      expect(fixture.nativeElement.querySelector('.pte-action-label').textContent.trim()).toBe('Zaznaczono 25:');
      expect(renderedRows().every(tr => tr.cells[0].querySelector('input')!.checked)).toBeTrue();
    });

    it('selects only the rows of the incomplete last page with the header checkbox', async () => {
      await showRows(107);
      await choosePageSize('25');
      await clickPage(5);

      (fixture.nativeElement.querySelector('thead input[type="checkbox"]') as HTMLInputElement).click();
      await stabilize();

      expect(Array.from(table.selectedIds)).toEqual(range(101, 107));
    });

    it('keeps the chosen page size when the host filters the rows', async () => {
      await showRows(100);
      await choosePageSize('25');
      await clickPage(2);

      host.rows = makeRows(100).filter(row => row.id % 2 === 0);
      await stabilize();

      expect(table.internalPageSize).toBe(25);
      expect(table.currentPage).toBe(1);
      expect(renderedIds()).toEqual(range(1, 25).map(i => i * 2));
      await clickPage(2);
      expect(renderedIds()).toEqual(range(26, 50).map(i => i * 2));
      expect(pageInfo()).toBe('26–50 z 50');
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

    it('shows the bulk save notice above the rows without hiding them', () => {
      host.bulkSaveError = 'Potwierdzono zapis 1 z 2 pozycji.';
      fixture.detectChanges();

      const notice = fixture.debugElement.query(By.css('.pte-bulk-error'));
      expect(notice.nativeElement.textContent.trim()).toBe('Potwierdzono zapis 1 z 2 pozycji.');
      expect(notice.attributes['role']).toBe('alert');
      expect(fixture.debugElement.queryAll(By.css('tbody tr')).length).toBe(5);
      expect(fixture.debugElement.query(By.css('.pte-error'))).toBeNull();
    });

    it('lets the load error replace the table and the bulk save notice', () => {
      host.bulkSaveError = 'Potwierdzono zapis 1 z 2 pozycji.';
      host.error = 'Nie udało się załadować cennika.';
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.pte-error'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('.pte-bulk-error'))).toBeNull();
      expect(fixture.debugElement.query(By.css('table'))).toBeNull();
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
