import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

@Component({
  selector: 'app-kitchen-cabinet-list',
  templateUrl: './kitchen-cabinet-list.component.html',
  styleUrls: ['./kitchen-cabinet-list.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class KitchenCabinetListComponent {

  @Input() cabinets: KitchenCabinet[] = [];
  @Input() editingCabinetId: string | null = null;

  @Output() remove = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();

  getCabinetTypeName(type: KitchenCabinetType): string {
    const typeNames: Record<KitchenCabinetType, string> = {
      [KitchenCabinetType.BASE_ONE_DOOR]: 'Dolna 1-drzwiowa',
      [KitchenCabinetType.BASE_TWO_DOOR]: 'Dolna 2-drzwiowa',
      [KitchenCabinetType.BASE_WITH_DRAWERS]: 'Dolna z szufladami',
      [KitchenCabinetType.TALL_CABINET]: 'Słupek',
      [KitchenCabinetType.CORNER_CABINET]: 'Narożna',
      [KitchenCabinetType.UPPER_ONE_DOOR]: 'Wisząca 1-drzwiowa',
      [KitchenCabinetType.UPPER_TWO_DOOR]: 'Wisząca 2-drzwiowa',
      [KitchenCabinetType.UPPER_OPEN_SHELF]: 'Wisząca otwarta',
      [KitchenCabinetType.UPPER_CASCADE]: 'Wisząca kaskadowa',
      [KitchenCabinetType.UPPER_HOOD]: 'Na okap',
      [KitchenCabinetType.BASE_SINK]: 'Zlewowa',
      [KitchenCabinetType.BASE_COOKTOP]: 'Pod płytę grzewczą',
      [KitchenCabinetType.BASE_DISHWASHER]: 'Zmywarka (front)',
      [KitchenCabinetType.BASE_DISHWASHER_FREESTANDING]: 'Zmywarka wolnostojąca'
    };
    return typeNames[type] ?? type;
  }

  onRemove(cabinetId: string): void {
    this.remove.emit(cabinetId);
  }

  onEdit(cabinetId: string): void {
    this.edit.emit(cabinetId);
  }

  isEditing(cabinetId: string): boolean {
    return this.editingCabinetId === cabinetId;
  }
}
