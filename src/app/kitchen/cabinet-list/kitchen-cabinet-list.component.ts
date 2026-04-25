import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CabinetTypeNamePipe } from '../cabinet-form/pipes/cabinet-type-name.pipe';
import { CabinetSide, WallType } from '../model/kitchen-project.model';

@Component({
  selector: 'app-kitchen-cabinet-list',
  templateUrl: './kitchen-cabinet-list.component.html',
  styleUrls: ['./kitchen-cabinet-list.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CabinetTypeNamePipe]
})
export class KitchenCabinetListComponent implements OnChanges {

  @Input() cabinets: KitchenCabinet[] = [];
  @Input() editingCabinetId: string | null = null;
  @Input() wallType: WallType = 'MAIN';

  @Output() remove = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() clone = new EventEmitter<string>();

  protected trackByCabinetId = (_: number, cabinet: KitchenCabinet) => cabinet.id;
  protected trackBySide = (_: number, group: { side: CabinetSide }) => group.side;

  /** Przeliczany tylko gdy zmienią się @Input() — bezpieczne z OnPush. */
  protected groupedCabinets: Array<{ side: CabinetSide; cabinets: KitchenCabinet[] }> = [];

  ngOnChanges(): void {
    this.groupedCabinets = this.computeGroupedCabinets();
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

  isEditing(cabinetId: string): boolean {
    return this.editingCabinetId === cabinetId;
  }
}
