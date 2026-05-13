import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenGeometryService } from '../service/kitchen-geometry.service';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { WallType } from '../model/kitchen-project.model';
import { buildVisualCabinetPositions, VisualCabinetPosition } from './kitchen-layout-view-model.builder';

@Component({
  selector: 'app-mini-wall-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mini-wall-preview.component.html',
  styleUrls: ['./mini-wall-preview.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiniWallPreviewComponent implements OnChanges {
  private static readonly DISPLAY_WIDTH = 220;
  private static readonly DISPLAY_HEIGHT = 58;

  @Input() cabinets: KitchenCabinet[] = [];
  @Input() wallType: WallType = 'MAIN';
  @Input() wallWidthMm = 3600;
  @Input() wallHeightMm = 2600;
  @Input() plinthHeightMm = 100;
  @Input() countertopThicknessMm = 38;
  @Input() upperFillerHeightMm = 100;
  @Input() fillerWidthMm = 50;

  protected visualPositions: VisualCabinetPosition[] = [];
  protected countertopRuns: Array<{ x: number; width: number; y: number; height: number }> = [];
  protected plinthRuns: Array<{ x: number; width: number; y: number; height: number }> = [];

  protected readonly displayWidth = MiniWallPreviewComponent.DISPLAY_WIDTH;
  protected readonly displayHeight = MiniWallPreviewComponent.DISPLAY_HEIGHT;

  constructor(private readonly geometryService: KitchenGeometryService) {}

  ngOnChanges(): void {
    const scale = this.wallWidthMm > 0 ? this.displayWidth / this.wallWidthMm : 1;
    const scaleVert = this.wallHeightMm > 0 ? this.displayHeight / this.wallHeightMm : 1;

    const positions = this.geometryService.calculateCabinetPositions(this.cabinets, {
      wallType: this.wallType,
      wallHeightMm: this.wallHeightMm,
      plinthHeightMm: this.plinthHeightMm,
      countertopThicknessMm: this.countertopThicknessMm,
      upperFillerHeightMm: this.upperFillerHeightMm,
      fillerWidthMm: this.fillerWidthMm
    });

    this.visualPositions = buildVisualCabinetPositions({
      cabinetPositions: positions,
      cabinets: this.cabinets,
      scale,
      wallWidth: this.displayWidth,
      wallDisplayHeight: this.displayHeight,
      scaleVert,
      feetHeightMm: this.plinthHeightMm,
      fillerWidthMm: this.fillerWidthMm,
      standardBottomHeight: 720,
      standardTopHeight: 720,
      standardBottomDepth: 560,
      standardTopDepth: 320,
      frontGap: 1
    });

    this.countertopRuns = this.buildCountertopRuns(scale, scaleVert);
    this.plinthRuns = this.buildPlinthRuns(scaleVert);
  }

  protected trackByCabinetId = (_: number, pos: VisualCabinetPosition) => pos.cabinetId;
  protected trackByIndex = (index: number) => index;

  private buildCountertopRuns(scale: number, scaleVert: number): Array<{ x: number; width: number; y: number; height: number }> {
    if (this.countertopThicknessMm <= 0) {
      return [];
    }

    const bottomPositions = this.visualPositions
      .filter(position => position.zone === 'BOTTOM' || position.zone === 'FULL')
      .sort((a, b) => a.displayX - b.displayX);

    if (bottomPositions.length === 0) {
      return [];
    }

    const runs: Array<{ x: number; end: number }> = [];
    let current = {
      x: bottomPositions[0].displayX,
      end: bottomPositions[0].displayX + bottomPositions[0].displayWidth
    };

    for (let index = 1; index < bottomPositions.length; index += 1) {
      const pos = bottomPositions[index];
      const nextStart = pos.displayX;
      const nextEnd = pos.displayX + pos.displayWidth;
      if (nextStart > current.end + 1) {
        runs.push(current);
        current = { x: nextStart, end: nextEnd };
      } else {
        current.end = Math.max(current.end, nextEnd);
      }
    }
    runs.push(current);

    const topY = Math.min(...bottomPositions.map(position => position.displayY)) - Math.max(1, Math.round(this.countertopThicknessMm * scaleVert));
    const height = Math.max(2, Math.round(this.countertopThicknessMm * scaleVert));

    return runs.map(run => ({
      x: run.x,
      width: run.end - run.x,
      y: Math.max(0, topY),
      height
    }));
  }

  private buildPlinthRuns(scaleVert: number): Array<{ x: number; width: number; y: number; height: number }> {
    const plinthPositions = this.visualPositions
      .filter(position => (position.zone === 'BOTTOM' || position.zone === 'FULL') && position.feetHeight > 0)
      .sort((a, b) => a.displayX - b.displayX);

    if (plinthPositions.length === 0) {
      return [];
    }

    const runs: Array<{ x: number; end: number }> = [];
    let current = {
      x: plinthPositions[0].displayX,
      end: plinthPositions[0].displayX + plinthPositions[0].displayWidth
    };

    for (let index = 1; index < plinthPositions.length; index += 1) {
      const pos = plinthPositions[index];
      const nextStart = pos.displayX;
      const nextEnd = pos.displayX + pos.displayWidth;
      if (nextStart > current.end + 1) {
        runs.push(current);
        current = { x: nextStart, end: nextEnd };
      } else {
        current.end = Math.max(current.end, nextEnd);
      }
    }
    runs.push(current);

    const height = Math.max(2, Math.round(this.plinthHeightMm * scaleVert));

    return runs.map(run => ({
      x: run.x,
      width: run.end - run.x,
      y: this.displayHeight - height,
      height
    }));
  }

  protected cabinetZoneClass(cabinet: VisualCabinetPosition): string {
    if (cabinet.isCorner) {
      return 'mini-wall-cabinet mini-wall-cabinet--corner';
    }

    switch (cabinet.zone) {
      case 'TOP':
        return 'mini-wall-cabinet mini-wall-cabinet--top';
      case 'FULL':
        return 'mini-wall-cabinet mini-wall-cabinet--full';
      case 'BOTTOM':
      default:
        return 'mini-wall-cabinet mini-wall-cabinet--bottom';
    }
  }
}
