import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
export class KitchenCabinetsSectionComponent implements OnChanges {
  @Input() result: CabinetResponse | null = null;
  @Input() hasEditingCabinet = false;
  @Input() cabinets: KitchenCabinet[] = [];
  @Input() selectedWallType: WallType = 'MAIN';
  @Input() selectedWallLabel = '';
  @Input() selectedWallTotalCost = 0;
  @Input() totalCabinetCount = 0;
  @Input() totalCost = 0;
  @Input() fitsOnWall = true;
  @Input() editingCabinetId: string | null = null;

  @Output() clearSelectedWallCabinets = new EventEmitter<void>();
  @Output() editCabinet = new EventEmitter<string>();
  @Output() removeCabinet = new EventEmitter<string>();
  @Output() cloneCabinet = new EventEmitter<string>();

  protected selectedDrawingCabinetId: string | null = null;
  protected drawingCabinets: KitchenCabinet[] = [];
  protected drawingCabinetTabs: DrawingCabinetTab[] = [];
  protected selectedDrawingResult: CabinetResponse | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cabinets']) {
      this.refreshDrawingSelection();
    }
  }

  protected selectTechnicalDrawing(cabinetId: string): void {
    this.selectedDrawingCabinetId = cabinetId;
    this.refreshDrawingSelection();
  }

  protected trackByDrawingCabinetTabId = (_: number, tab: DrawingCabinetTab) => tab.id;

  private refreshDrawingSelection(): void {
    this.drawingCabinets = this.cabinets.filter(hasKitchenCabinetTechnicalDrawing);
    this.drawingCabinetTabs = this.buildDrawingCabinetTabs();
    const selected = this.drawingCabinets.find(cabinet => cabinet.id === this.selectedDrawingCabinetId)
      ?? this.drawingCabinets[this.drawingCabinets.length - 1]
      ?? null;

    this.selectedDrawingCabinetId = selected?.id ?? null;
    this.selectedDrawingResult = selected?.calculationResponse ?? null;
  }

  private buildDrawingCabinetTabs(): DrawingCabinetTab[] {
    const cabinetPositionById = new Map(this.cabinets.map((cabinet, index) => [cabinet.id, index + 1]));
    return this.drawingCabinets.map(cabinet => ({
      id: cabinet.id,
      label: cabinet.name || `Szafka ${cabinetPositionById.get(cabinet.id) ?? ''}`.trim()
    }));
  }
}
