import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BulkCabinetChangeReportDialogComponent } from './bulk-cabinet-change-report-dialog.component';

describe('BulkCabinetChangeReportDialogComponent', () => {
  it('pokazuje liczbę zmian, pominięte zmiany i błędy z przyczyną', () => {
    TestBed.configureTestingModule({
      imports: [BulkCabinetChangeReportDialogComponent],
      providers: [{
        provide: MAT_DIALOG_DATA,
        useValue: {
          changed: 2, unchanged: 1,
          skipped: [{ cabinetId: 'c2', label: 'Dolna - otwarta 600', reasons: ['bez frontów'] }],
          failed: [{ cabinetId: 'c4', label: 'Pod oknem', reasons: ['Za wąska'] }]
        }
      }]
    });
    const fixture = TestBed.createComponent(BulkCabinetChangeReportDialogComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.report-summary')?.textContent).toContain('2');
    expect(element.querySelector('.report-list--skipped')?.textContent).toContain('Dolna - otwarta 600 — bez frontów');
    expect(element.querySelector('.report-list--failed')?.textContent).toContain('Pod oknem — Za wąska');
  });
});
