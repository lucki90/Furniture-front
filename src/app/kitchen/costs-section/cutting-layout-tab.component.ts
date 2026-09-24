import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CuttingLayoutResponse,
  CuttingSegment,
  CuttingSheetLayout
} from '../model/cutting-layout.model';

@Component({
  selector: 'app-cutting-layout-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cutting-layout-tab.component.html',
  styleUrls: ['./cutting-layout-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CuttingLayoutTabComponent {
  readonly layout = input<CuttingLayoutResponse | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly retry = output<void>();

  readonly sheets = computed(() => this.layout()?.sheets ?? []);

  readonly trackBySheet = (_: number, sheet: CuttingSheetLayout) => sheet.index;
  readonly trackByPlacement = (index: number) => index;
  readonly trackByOffcut = (index: number) => index;
  readonly trackByCut = (index: number) => index;

  sheetViewBox(sheet: CuttingSheetLayout): string {
    return `0 0 ${sheet.width} ${sheet.height}`;
  }

  utilizationPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  lengthMeters(valueMm: number): string {
    return `${(valueMm / 1000).toFixed(2)} m`;
  }

  areaMeters(valueMm2: number): string {
    return `${(valueMm2 / 1_000_000).toFixed(2)} m²`;
  }

  labelFontSize(sheet: CuttingSheetLayout): number {
    return Math.max(28, Math.min(sheet.width, sheet.height) * 0.022);
  }

  cutX1(cut: CuttingSegment, kerfMm: number): number {
    return cut.axis === 'SPLIT_X' ? cut.coord + kerfMm / 2 : cut.from;
  }

  cutY1(cut: CuttingSegment, kerfMm: number): number {
    return cut.axis === 'SPLIT_X' ? cut.from : cut.coord + kerfMm / 2;
  }

  cutX2(cut: CuttingSegment, kerfMm: number): number {
    return cut.axis === 'SPLIT_X' ? cut.coord + kerfMm / 2 : cut.to;
  }

  cutY2(cut: CuttingSegment, kerfMm: number): number {
    return cut.axis === 'SPLIT_X' ? cut.to : cut.coord + kerfMm / 2;
  }
}
