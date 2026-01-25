import { Component, inject, computed } from '@angular/core';
import { CommonModule } from "@angular/common";
import { KitchenStateService } from '../service/kitchen-state.service';

@Component({
  selector: 'app-kitchen-layout',
  templateUrl: './kitchen-layout.component.html',
  styleUrls: ['./kitchen-layout.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class KitchenLayoutComponent {

  private stateService = inject(KitchenStateService);

  readonly wall = this.stateService.wall;
  readonly cabinetPositions = this.stateService.cabinetPositions;
  readonly fitsOnWall = this.stateService.fitsOnWall;
  readonly totalWidth = this.stateService.totalWidth;
  readonly remainingWidth = this.stateService.remainingWidth;

  private readonly BASE_WALL_DISPLAY_WIDTH = 720;

  readonly scaleFactor = computed(() => {
    const wallLength = this.wall().length;
    if (wallLength <= 0) return 1;
    return this.BASE_WALL_DISPLAY_WIDTH / wallLength;
  });

  readonly wallDisplayWidth = computed(() => {
    return this.wall().length * this.scaleFactor();
  });

  getScaledWidth(width: number): number {
    return width * this.scaleFactor();
  }

  getScaledX(x: number): number {
    return x * this.scaleFactor();
  }

  getRemainingSpaceWidth(): number {
    if (this.remainingWidth() <= 0) return 0;
    return this.remainingWidth() * this.scaleFactor();
  }

  getRemainingSpaceX(): number {
    return this.totalWidth() * this.scaleFactor();
  }
}
