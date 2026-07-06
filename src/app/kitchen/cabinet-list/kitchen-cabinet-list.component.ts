import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  KitchenCabinet,
  getCabinetZone,
  hasKitchenCabinetTechnicalDrawing,
  isFreestandingAppliance
} from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CabinetTypeNamePipe } from '../cabinet-form/pipes/cabinet-type-name.pipe';
import { CabinetSide, WallType } from '../model/kitchen-project.model';

interface CabinetVisualMeta {
  color: string;
  bg: string;
  abbr: string;
}

@Component({
  selector: 'app-kitchen-cabinet-list',
  templateUrl: './kitchen-cabinet-list.component.html',
  styleUrls: ['./kitchen-cabinet-list.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, CabinetTypeNamePipe]
})
export class KitchenCabinetListComponent implements OnChanges {
  private static readonly DEFAULT_VISUAL_META: CabinetVisualMeta = { color: '#388e3c', bg: '#e8f5e9', abbr: 'DÓŁ' };

  @Input() cabinets: KitchenCabinet[] = [];
  @Input() editingCabinetId: string | null = null;
  @Input() selectedDrawingCabinetId: string | null = null;
  @Input() wallType: WallType = 'MAIN';

  @Output() remove = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() clone = new EventEmitter<string>();
  @Output() showDrawing = new EventEmitter<string>();

  protected trackByCabinetId = (_: number, cabinet: KitchenCabinet) => cabinet.id;
  protected trackBySide = (_: number, group: { side: CabinetSide }) => group.side;
  protected cabinetMetaById: Record<string, CabinetVisualMeta> = {};

  /** Przeliczany tylko gdy zmienią się @Input() — bezpieczne z OnPush. */
  protected groupedCabinets: Array<{ side: CabinetSide; cabinets: KitchenCabinet[] }> = [];

  ngOnChanges(): void {
    this.groupedCabinets = this.computeGroupedCabinets();
    this.cabinetMetaById = this.buildCabinetMetaById();
  }

  private computeGroupedCabinets(): Array<{ side: CabinetSide; cabinets: KitchenCabinet[] }> {
    if (this.wallType !== 'ISLAND') {
      return [{ side: 'FRONT', cabinets: this.cabinets }];
    }
    return (['FRONT', 'BACK'] as CabinetSide[]).map(side => ({
      side,
      cabinets: this.cabinets.filter(cabinet => (cabinet.cabinetSide ?? 'FRONT') === side)
    })).filter(group => group.cabinets.length > 0);
  }

  onRemove(cabinetId: string): void {
    this.remove.emit(cabinetId);
  }

  onEdit(cabinetId: string): void {
    this.edit.emit(cabinetId);
  }

  onClone(cabinetId: string): void {
    this.clone.emit(cabinetId);
  }

  onShowDrawing(cabinetId: string): void {
    this.showDrawing.emit(cabinetId);
  }

  isEditing(cabinetId: string): boolean {
    return this.editingCabinetId === cabinetId;
  }

  isDrawingSelected(cabinetId: string): boolean {
    return this.selectedDrawingCabinetId === cabinetId;
  }

  hasTechnicalDrawing(cabinet: KitchenCabinet): boolean {
    return hasKitchenCabinetTechnicalDrawing(cabinet);
  }

  /** Łączny koszt szafki (boards + components + jobs) lub null gdy brak kalkulacji. */
  cabinetTotalCost(cabinet: KitchenCabinet): number | null {
    const r = cabinet.calculatedResult;
    if (!r) return null;
    return (r.boardCosts ?? 0) + (r.componentCosts ?? 0) + (r.jobCosts ?? 0);
  }

  /** Meta wizualna karty: kolor strefy, tło dla active, skrót typu. */
  cabinetVisualMeta(cabinet: KitchenCabinet): CabinetVisualMeta {
    if (isFreestandingAppliance(cabinet.type)) {
      return { color: '#9e9e9e', bg: '#f5f5f5', abbr: 'AGD' };
    }
    if (cabinet.type === KitchenCabinetType.CORNER_CABINET) {
      return { color: '#ef6c00', bg: '#fff3e0', abbr: 'NAR' };
    }
    const zone = getCabinetZone(cabinet);
    switch (zone) {
      case 'TOP':    return { color: '#1565c0', bg: '#e3f2fd', abbr: 'GÓR' };
      case 'FULL':   return { color: '#7b1fa2', bg: '#f3e5f5', abbr: 'SŁU' };
      case 'BOTTOM':
      default:       return KitchenCabinetListComponent.DEFAULT_VISUAL_META;
    }
  }

  private buildCabinetMetaById(): Record<string, CabinetVisualMeta> {
    return this.cabinets.reduce<Record<string, CabinetVisualMeta>>((acc, cabinet) => {
      acc[cabinet.id] = this.cabinetVisualMeta(cabinet);
      return acc;
    }, {});
  }
}
