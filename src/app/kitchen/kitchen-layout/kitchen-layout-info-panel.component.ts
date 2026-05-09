import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface KitchenLayoutCooktopGapWarning {
  message: string;
  minMm: number;
  actualMm: number;
}

@Component({
  selector: 'app-kitchen-layout-info-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen-layout-info-panel.component.html',
  styleUrls: ['./kitchen-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenLayoutInfoPanelComponent {
  @Input() isWorkspaceGapViolation = false;
  @Input() gapMm = 0;
  @Input() fitsOnWall = true;
  @Input() wallLength = 0;
  @Input() cooktopGapWarning: KitchenLayoutCooktopGapWarning | null = null;
}
