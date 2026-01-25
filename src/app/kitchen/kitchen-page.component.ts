import { Component, inject } from '@angular/core';
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';
import { KitchenLayoutComponent } from "./kitchen-layout/kitchen-layout.component";
import { CabinetResultComponent } from "./cabinet-result/cabinet-result.component";
import { CabinetFormComponent } from "./cabinet-form/cabinet-form.component";
import { KitchenCabinetListComponent } from './cabinet-list/kitchen-cabinet-list.component';
import { KitchenStateService } from './service/kitchen-state.service';
import { CabinetCalculatedEvent, KitchenCabinet } from './model/kitchen-state.model';

@Component({
  selector: 'app-kitchen-page',
  templateUrl: './kitchen-page.component.html',
  styleUrls: ['./kitchen-page.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CabinetFormComponent,
    CabinetResultComponent,
    KitchenLayoutComponent,
    KitchenCabinetListComponent
  ]
})
export class KitchenPageComponent {

  private stateService = inject(KitchenStateService);

  result: any | null = null;
  editingCabinet: KitchenCabinet | null = null;

  readonly wall = this.stateService.wall;
  readonly cabinets = this.stateService.cabinets;
  readonly totalCost = this.stateService.totalCost;
  readonly totalWidth = this.stateService.totalWidth;
  readonly fitsOnWall = this.stateService.fitsOnWall;
  readonly remainingWidth = this.stateService.remainingWidth;

  wallLength = this.wall().length;
  wallHeight = this.wall().height;

  get editingCabinetId(): string | null {
    return this.editingCabinet?.id ?? null;
  }

  get formTitle(): string {
    return this.editingCabinet ? 'Edytuj szafke' : 'Dodaj szafke';
  }

  onCabinetCalculated(event: CabinetCalculatedEvent): void {
    this.result = event.result;

    if (event.editingCabinetId) {
      this.stateService.updateCabinet(event.editingCabinetId, event.formData, event.result);
      this.editingCabinet = null;
    } else {
      this.stateService.addCabinet(event.formData, event.result);
    }
  }

  onEditCabinet(cabinetId: string): void {
    const cabinet = this.stateService.getCabinetById(cabinetId);
    if (cabinet) {
      this.editingCabinet = cabinet;
    }
  }

  onCancelEdit(): void {
    this.editingCabinet = null;
  }

  onRemoveCabinet(cabinetId: string): void {
    this.stateService.removeCabinet(cabinetId);
  }

  onWallChange(): void {
    this.stateService.updateWall({
      length: this.wallLength,
      height: this.wallHeight
    });
  }

  clearAll(): void {
    this.stateService.clearAll();
    this.result = null;
    this.editingCabinet = null;
  }
}
