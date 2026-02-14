import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { KitchenStateService } from '../service/kitchen-state.service';
import { WallType } from '../model/kitchen-project.model';

@Component({
  selector: 'app-wall-tabs',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule
  ],
  templateUrl: './wall-tabs.component.html',
  styleUrl: './wall-tabs.component.css'
})
export class WallTabsComponent {
  private stateService = inject(KitchenStateService);

  readonly walls = this.stateService.walls;
  readonly selectedWallId = this.stateService.selectedWallId;

  addWallRequested = output<void>();
  wallRemoved = output<string>();

  get selectedIndex(): number {
    const walls = this.walls();
    const selectedId = this.selectedWallId();
    return walls.findIndex(w => w.id === selectedId);
  }

  onTabChange(index: number): void {
    const walls = this.walls();
    if (index >= 0 && index < walls.length) {
      this.stateService.selectWall(walls[index].id);
    }
  }

  onAddWall(): void {
    this.addWallRequested.emit();
  }

  onRemoveWall(wallId: string, event: Event): void {
    event.stopPropagation();
    this.wallRemoved.emit(wallId);
  }

  getWallLabel(type: WallType): string {
    return this.stateService.getWallLabel(type);
  }

  canRemoveWall(): boolean {
    return this.walls().length > 1;
  }
}
