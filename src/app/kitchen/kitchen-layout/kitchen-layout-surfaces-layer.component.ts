import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CountertopSegmentLabel {
  x: number;
  lengthMm: number;
  depthMm: number;
}

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Component({
  selector: 'g[appKitchenLayoutSurfacesLayer]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen-layout-surfaces-layer.component.html',
  styleUrls: ['./kitchen-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenLayoutSurfacesLayerComponent {
  @Input() showCountertop = true;
  @Input() showUpperCabinets = true;
  @Input() counterZoneY = 0;
  @Input() counterZoneHeight = 0;
  @Input() countertopZoneRects: Array<{ x: number; width: number }> = [];
  @Input() countertopDimensions: { lengthMm: number; depthMm: number } | null = null;
  @Input() countertopSegmentLabels: CountertopSegmentLabel[] = [];
  @Input() fillerPosition: LayoutRect | null = null;
  @Input() fillerJoinXPositions: number[] = [];
  @Input() plinthSegments: LayoutRect[] = [];
  @Input() plinthJoinXPositions: number[] = [];
  @Input() plinthPosition: LayoutRect | null = null;

  protected trackByIndex = (index: number) => index;
  protected trackByRectX = (_: number, rect: LayoutRect) => rect.x;
}
