import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BulkChangeReport } from '../model/bulk-cabinet-change.model';

/** Raport masowej zmiany: ile szafek zmieniono, które pominięto i które nie przeszły kalkulacji (z przyczyną). */
@Component({
  selector: 'app-bulk-cabinet-change-report-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Wynik zmiany szafek</h2>
    <mat-dialog-content>
      <p class="report-summary">
        Zmieniono: <strong>{{ report.changed }}</strong>
        @if (report.unchanged > 0) { · bez zmian (już mają te wartości): {{ report.unchanged }} }
      </p>
      @if (report.skipped.length > 0) {
        <h3 class="report-title">Pominięte zmiany ({{ report.skipped.length }})</h3>
        <ul class="report-list report-list--skipped">
          @for (item of report.skipped; track item.cabinetId) {
            <li><strong>{{ item.label }}</strong> — {{ item.reasons.join('; ') }}</li>
          }
        </ul>
      }
      @if (report.failed.length > 0) {
        <h3 class="report-title">Bez zmian — błąd kalkulacji ({{ report.failed.length }})</h3>
        <ul class="report-list report-list--failed">
          @for (item of report.failed; track item.cabinetId) {
            <li><strong>{{ item.label }}</strong> — {{ item.reasons.join('; ') }}</li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button color="primary" mat-raised-button mat-dialog-close type="button">OK</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .report-summary { margin: 0 0 8px; font-size: 15px; }
    .report-title { margin: 12px 0 4px; font-size: 14px; }
    .report-list { margin: 0; padding-left: 18px; font-size: 13px; }
    .report-list--failed { color: var(--error-color); }
  `]
})
export class BulkCabinetChangeReportDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public report: BulkChangeReport) {}
}
