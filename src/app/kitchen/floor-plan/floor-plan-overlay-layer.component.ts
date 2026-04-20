import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FloorPlanArc } from './floor-plan-door-arcs';

export interface CornerCountertopOverlay {
  x: number;
  y: number;
  sizePx: number;
  miterX1: number;
  miterY1: number;
  miterX2: number;
  miterY2: number;
  label: string;
}

@Component({
  selector: 'g[appFloorPlanOverlayLayer]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floor-plan-overlay-layer.component.html',
  styleUrls: ['./kitchen-floor-plan.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloorPlanOverlayLayerComponent {
  @Input() showCountertop = true;
  @Input() showDoorArcs = false;
  @Input() cornerCountertops: CornerCountertopOverlay[] = [];
  @Input() doorArcs: FloorPlanArc[] = [];

  protected trackByCornerX = (_: number, corner: CornerCountertopOverlay) => `${corner.x}-${corner.y}`;
  protected trackByArcId = (_: number, arc: FloorPlanArc) => arc.cabinetId;
}
