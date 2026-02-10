import { Component, inject } from '@angular/core';
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';
import { KitchenLayoutComponent } from "./kitchen-layout/kitchen-layout.component";
import { CabinetResultComponent } from "./cabinet-result/cabinet-result.component";
import { CabinetFormComponent } from "./cabinet-form/cabinet-form.component";
import { KitchenCabinetListComponent } from './cabinet-list/kitchen-cabinet-list.component';
import { KitchenStateService } from './service/kitchen-state.service';
import { KitchenService } from './service/kitchen.service';
import { CabinetCalculatedEvent, KitchenCabinet } from './model/kitchen-state.model';
import { KitchenProjectResponse } from './model/kitchen-project.model';

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
  private kitchenService = inject(KitchenService);

  result: any | null = null;
  editingCabinet: KitchenCabinet | null = null;

  // Stan kalkulacji projektu
  projectResult: KitchenProjectResponse | null = null;
  projectError: string | null = null;
  isCalculatingProject = false;

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

    // Reset wyniku projektu po zmianach w szafkach
    this.projectResult = null;
    this.projectError = null;
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
    // Reset wyniku projektu po usunięciu szafki
    this.projectResult = null;
    this.projectError = null;
  }

  onWallChange(): void {
    this.stateService.updateWall({
      length: this.wallLength,
      height: this.wallHeight
    });
    // Reset wyniku projektu po zmianie ściany
    this.projectResult = null;
    this.projectError = null;
  }

  clearAll(): void {
    this.stateService.clearAll();
    this.result = null;
    this.editingCabinet = null;
    this.projectResult = null;
    this.projectError = null;
  }

  /**
   * Wywołuje endpoint /kitchen/project/calculate z wszystkimi szafkami.
   */
  calculateProject(): void {
    if (this.cabinets().length === 0) {
      this.projectError = 'Dodaj przynajmniej jedną szafkę do projektu';
      return;
    }

    this.isCalculatingProject = true;
    this.projectError = null;
    this.projectResult = null;

    const request = this.stateService.buildProjectRequest();

    this.kitchenService.calculateProject(request).subscribe({
      next: (response) => {
        this.projectResult = response;
        this.isCalculatingProject = false;
        console.log('Project calculation result:', response);
      },
      error: (err) => {
        console.error('Project calculation error:', err);
        this.projectError = err.error?.message || err.message || 'Wystąpił błąd podczas kalkulacji projektu';
        this.isCalculatingProject = false;
      }
    });
  }
}
