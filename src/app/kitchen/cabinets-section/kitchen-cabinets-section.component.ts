import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { KitchenCabinet, hasKitchenCabinetTechnicalDrawing } from '../model/kitchen-state.model';
import { KitchenCabinetListComponent } from '../cabinet-list/kitchen-cabinet-list.component';
import { WallType } from '../model/kitchen-project.model';
import { CabinetTechnicalDrawingComponent } from '../technical-drawing/cabinet-technical-drawing.component';

interface DrawingCabinetTab {
  id: string;
  label: string;
}

@Component({
  selector: 'app-kitchen-cabinets-section',
  standalone: true,
  imports: [CommonModule, MatIconModule, KitchenCabinetListComponent, CabinetTechnicalDrawingComponent],
  templateUrl: './kitchen-cabinets-section.component.html',
  styleUrls: ['./kitchen-cabinets-section.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenCabinetsSectionComponent {
  readonly result = input<CabinetResponse | null>(null);
  readonly hasEditingCabinet = input(false);
  readonly cabinets = input<KitchenCabinet[]>([]);
  readonly selectedWallType = input<WallType>('MAIN');
  readonly selectedWallLabel = input('');
  readonly selectedWallTotalCost = input(0);
  readonly totalCabinetCount = input(0);
  readonly totalCost = input(0);
  readonly fitsOnWall = input(true);
  readonly editingCabinetId = input<string | null>(null);

  readonly clearSelectedWallCabinets = output<void>();
  readonly editCabinet = output<string>();
  readonly removeCabinet = output<string>();
  readonly cloneCabinet = output<string>();

  private readonly requestedDrawingCabinetId = signal<string | null>(null);

  protected readonly drawingCabinets = computed(() => this.cabinets().filter(hasKitchenCabinetTechnicalDrawing));
  protected readonly selectedDrawingCabinetId = computed(() => {
    const requestedId = this.requestedDrawingCabinetId();
    const cabinets = this.drawingCabinets();
    return cabinets.some(cabinet => cabinet.id === requestedId)
      ? requestedId
      : cabinets[cabinets.length - 1]?.id ?? null;
  });
  protected readonly drawingCabinetTabs = computed(() => this.buildDrawingCabinetTabs());
  protected readonly selectedDrawingResult = computed(() => {
    const selectedId = this.selectedDrawingCabinetId();
    return this.drawingCabinets().find(cabinet => cabinet.id === selectedId)?.calculationResponse ?? null;
  });

  protected selectTechnicalDrawing(cabinetId: string): void {
    this.requestedDrawingCabinetId.set(cabinetId);
  }

  protected trackByDrawingCabinetTabId = (_: number, tab: DrawingCabinetTab) => tab.id;

  private buildDrawingCabinetTabs(): DrawingCabinetTab[] {
    const allCabinets = this.cabinets();
    const cabinetPositionById = new Map(allCabinets.map((cabinet, index) => [cabinet.id, index + 1]));
    return this.drawingCabinets().map((cabinet, index) => ({
      id: cabinet.id,
      label: cabinet.name || `Szafka ${cabinetPositionById.get(cabinet.id) ?? index + 1}`
    }));
  }
}
