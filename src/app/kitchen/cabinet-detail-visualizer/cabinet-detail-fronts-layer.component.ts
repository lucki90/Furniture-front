import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FrontElement, HandleConfig } from '../cabinet-form/model/cabinet-visual-elements.model';
import {
  buildHandlePath,
  CabinetDetailGeometry,
  getFrontRect,
  getHandleColor,
  getHingePositions,
  getKnobPosition,
  hasHinges,
  isKnobHandle
} from './cabinet-detail-visualizer.utils';

@Component({
  selector: 'app-cabinet-detail-fronts-layer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cabinet-detail-fronts-layer.component.html',
  styleUrls: ['./cabinet-detail-visualizer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CabinetDetailFrontsLayerComponent {
  @Input({ required: true }) fronts: FrontElement[] = [];
  @Input({ required: true }) geometry!: CabinetDetailGeometry;
  @Input() defaultHandle?: HandleConfig;
  @Input() frontStroke = '#9e9e9e';
  @Input() hingeColor = '#90a4ae';

  getFrontX(front: FrontElement): number {
    return getFrontRect(front, this.geometry).x;
  }

  getFrontY(front: FrontElement): number {
    return getFrontRect(front, this.geometry).y;
  }

  getFrontWidth(front: FrontElement): number {
    return getFrontRect(front, this.geometry).width;
  }

  getFrontHeight(front: FrontElement): number {
    return getFrontRect(front, this.geometry).height;
  }

  getHandlePath(front: FrontElement): string {
    return buildHandlePath(front, this.geometry, this.defaultHandle);
  }

  isKnobHandle(front: FrontElement): boolean {
    return isKnobHandle(front, this.defaultHandle);
  }

  getKnobX(front: FrontElement): number {
    return getKnobPosition(front, this.geometry, this.defaultHandle).x;
  }

  getKnobY(front: FrontElement): number {
    return getKnobPosition(front, this.geometry, this.defaultHandle).y;
  }

  hasHinges(front: FrontElement): boolean {
    return hasHinges(front);
  }

  getHingePositions(front: FrontElement): { x: number; y: number }[] {
    return getHingePositions(front, this.geometry);
  }

  getHandleColor(front: FrontElement): string {
    return getHandleColor(front, this.defaultHandle);
  }
}
