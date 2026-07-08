import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { KitchenCabinet, hasKitchenCabinetTechnicalDrawing } from '../model/kitchen-state.model';
import { KitchenCabinetListComponent } from '../cabinet-list/kitchen-cabinet-list.component';
import { WallType } from '../model/kitchen-project.model';
import { CabinetTechnicalDrawingComponent } from '../technical-drawing/cabinet-technical-drawing.component';
import { TECHNICAL_DRAWING_ENABLED } from '../technical-drawing/technical-drawing.feature';

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
  protected readonly technicalDrawingEnabled = TECHNICAL_DRAWING_ENABLED;

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
  readonly selectedCabinetId = input<string | null | undefined>(undefined);

  readonly clearSelectedWallCabinets = output<void>();
  readonly editCabinet = output<string>();
  readonly removeCabinet = output<string>();
  readonly cloneCabinet = output<string>();
  readonly selectCabinet = output<string | null>();

  protected readonly drawingCabinets = computed(() =>
    this.technicalDrawingEnabled ? this.cabinets().filter(hasKitchenCabinetTechnicalDrawing) : []
  );
  protected readonly selectedCabinet = computed(() => this.resolveSelectedCabinet());
  protected readonly selectedDrawingCabinetId = computed(() => {
    return this.selectedCabinet()?.id ?? null;
  });
  protected readonly drawingCabinetTabs = computed(() => this.buildDrawingCabinetTabs());
  protected readonly selectedDrawingResult = computed(() => {
    const cabinet = this.selectedCabinet();
    return cabinet && hasKitchenCabinetTechnicalDrawing(cabinet) ? cabinet.calculationResponse ?? null : null;
  });
  protected readonly selectedCabinetHasNoDrawing = computed(() => {
    const cabinet = this.selectedCabinet();
    return !!cabinet && !hasKitchenCabinetTechnicalDrawing(cabinet);
  });

  protected selectTechnicalDrawing(cabinetId: string): void {
    if (!this.technicalDrawingEnabled) {
      return;
    }

    this.selectCabinet.emit(cabinetId);
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

  private resolveSelectedCabinet(): KitchenCabinet | null {
    const selectedId = this.selectedCabinetId();
    const allCabinets = this.cabinets();
    if (selectedId === null) {
      return null;
    }

    if (selectedId) {
      const selected = allCabinets.find(cabinet => cabinet.id === selectedId);
      if (selected) {
        return selected;
      }
    }

    const drawableCabinets = this.drawingCabinets();
    return drawableCabinets[drawableCabinets.length - 1] ?? null;
  }
}
