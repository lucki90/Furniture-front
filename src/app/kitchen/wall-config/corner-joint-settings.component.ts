import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CORNER_JOINT_TYPE_OPTIONS, CornerJointSettings, CornerJointType } from '../model/countertop.model';
import { KitchenProjectLayoutService } from '../service/kitchen-project-layout.service';
import { KitchenStateService } from '../service/kitchen-state.service';
import {
  buildCornerJointSettingsViews,
  CornerJointSettingsView,
  PassThroughChoice,
  toCornerPassThrough,
  withCornerJointSettings
} from './corner-joint-settings.view-model';

/**
 * Połączenie blatów w narożnikach aktualnej ściany: sposób łączenia i blat przechodzący przez narożnik. Sekcja jest
 * widoczna na obu ścianach narożnika, a ustawienie trafia do konfiguracji blatu ściany bocznej (B).
 */
@Component({
  selector: 'app-corner-joint-settings',
  templateUrl: './corner-joint-settings.component.html',
  styleUrls: ['./wall-config.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class CornerJointSettingsComponent {

  @Output() configChanged = new EventEmitter<void>();

  private readonly stateService = inject(KitchenStateService);
  private readonly layoutService = inject(KitchenProjectLayoutService);

  readonly jointTypeOptions = CORNER_JOINT_TYPE_OPTIONS;

  readonly views = computed((): CornerJointSettingsView[] => {
    const layout = this.layoutService.layout();
    return buildCornerJointSettingsViews(
      this.stateService.selectedWallId(),
      layout.topology,
      this.stateService.walls(),
      layout.countertopJoints,
      type => this.stateService.getWallLabel(type));
  });

  onTypeChange(view: CornerJointSettingsView, type: CornerJointType): void {
    this.update(view, { type });
  }

  onPassThroughChange(view: CornerJointSettingsView, choice: PassThroughChoice): void {
    this.update(view, { passThrough: toCornerPassThrough(choice, view) });
  }

  protected trackByCorner = (_: number, view: CornerJointSettingsView) => view.cornerId;
  protected trackByValue = (_: number, item: { value: string }) => item.value;

  private update(view: CornerJointSettingsView, patch: CornerJointSettings): void {
    const sideWall = this.stateService.walls().find(wall => wall.id === view.sideWallId);
    this.stateService.updateCountertopConfig(view.sideWallId, withCornerJointSettings(sideWall, patch));
    this.configChanged.emit();
  }
}
