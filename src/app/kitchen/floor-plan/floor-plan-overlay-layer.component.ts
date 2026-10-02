import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CornerJointType } from '../model/countertop.model';
import { LinePx } from './floor-plan-corner-joints';
import { FloorPlanArc } from './floor-plan-door-arcs';

export interface CornerCountertopOverlay {
  x: number;
  y: number;
  widthPx: number;
  depthPx: number;
  /** Linia złącza: przekątna przy cięciu 45°, front blatu przechodzącego przy łyżwie i listwie. */
  jointLine: LinePx;
  jointType: CornerJointType;
  /** Krótka nazwa złącza na rysunku („45°”, „łyżwa”, „listwa”). */
  jointLabel: string;
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
  protected trackByArcId = (_: number, arc: FloorPlanArc) => arc.id;
}
