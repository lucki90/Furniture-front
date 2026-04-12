import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CabinetTypeNamePipe } from '../cabinet-form/pipes/cabinet-type-name.pipe';

@Component({
  selector: 'app-kitchen-cabinet-list',
  templateUrl: './kitchen-cabinet-list.component.html',
  styleUrls: ['./kitchen-cabinet-list.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CabinetTypeNamePipe]
})
export class KitchenCabinetListComponent {

  @Input() cabinets: KitchenCabinet[] = [];
  @Input() editingCabinetId: string | null = null;

  @Output() remove = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() clone = new EventEmitter<string>();

  protected trackByCabinetId = (_: number, cabinet: KitchenCabinet) => cabinet.id;

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
