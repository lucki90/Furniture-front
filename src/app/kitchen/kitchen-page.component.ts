import { Component, inject } from '@angular/core';
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { KitchenLayoutComponent } from "./kitchen-layout/kitchen-layout.component";
import { CabinetFormComponent } from "./cabinet-form/cabinet-form.component";
import { KitchenCabinetListComponent } from './cabinet-list/kitchen-cabinet-list.component';
import { KitchenFloorPlanComponent } from './floor-plan/kitchen-floor-plan.component';
import { AddWallDialogComponent, AddWallDialogData, AddWallDialogResult } from './add-wall-dialog/add-wall-dialog.component';
import { SaveProjectDialogComponent, SaveProjectDialogData, SaveProjectDialogResult } from './save-project-dialog/save-project-dialog.component';
import { KitchenStateService } from './service/kitchen-state.service';
import { KitchenService } from './service/kitchen.service';
import { CabinetCalculatedEvent, KitchenCabinet, CountertopConfig, PlinthConfig } from './model/kitchen-state.model';
import { MultiWallCalculateResponse } from './model/kitchen-project.model';
import { Board, Component as CabinetComponent, Job } from './cabinet-form/model/kitchen-cabinet-form.model';
import {
  CountertopMaterialType,
  COUNTERTOP_MATERIAL_OPTIONS,
  CountertopJointType,
  COUNTERTOP_JOINT_OPTIONS,
  CountertopEdgeType,
  COUNTERTOP_EDGE_OPTIONS,
  COUNTERTOP_THICKNESS_OPTIONS
} from './model/countertop.model';
import {
  FeetType,
  FEET_TYPE_OPTIONS,
  PlinthMaterialType,
  PLINTH_MATERIAL_OPTIONS
} from './model/plinth.model';

// Aggregated types for details tabs
export interface AggregatedBoard {
  material: string;
  thickness: number;
  width: number;
  height: number;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface AggregatedComponent {
  name: string;
  type: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface AggregatedJob {
  name: string;
  type: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

@Component({
  selector: 'app-kitchen-page',
  templateUrl: './kitchen-page.component.html',
  styleUrls: ['./kitchen-page.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CabinetFormComponent,
    KitchenLayoutComponent,
    KitchenCabinetListComponent,
    KitchenFloorPlanComponent
  ]
})
export class KitchenPageComponent {

  private stateService = inject(KitchenStateService);
  private kitchenService = inject(KitchenService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  result: any | null = null;
  editingCabinet: KitchenCabinet | null = null;

  // Stan kalkulacji projektu (multi-wall)
  projectResult: MultiWallCalculateResponse | null = null;
  projectError: string | null = null;
  isCalculatingProject = false;

  // Aktywna zakładka w szczegółach projektu
  activeDetailsTab: 'walls' | 'boards' | 'components' | 'jobs' = 'walls';

  // Agregowane dane dla zakładek szczegółów
  aggregatedBoards: AggregatedBoard[] = [];
  aggregatedComponents: AggregatedComponent[] = [];
  aggregatedJobs: AggregatedJob[] = [];

  // Koszt odpadu (SHEET_WASTE) - opcjonalnie wliczany
  includeWasteCost = false;
  totalWasteCost = 0;
  wasteDetails: AggregatedComponent[] = [];

  // Stan zapisywania projektu
  isSavingProject = false;

  // Multi-wall signals
  readonly walls = this.stateService.walls;
  readonly selectedWall = this.stateService.selectedWall;
  readonly selectedWallId = this.stateService.selectedWallId;

  // Project signals
  readonly currentProjectId = this.stateService.currentProjectId;
  readonly currentProjectName = this.stateService.currentProjectName;
  readonly currentProjectVersion = this.stateService.currentProjectVersion;

  // Legacy compatibility
  readonly wall = this.stateService.wall;
  readonly cabinets = this.stateService.cabinets;
  readonly totalCost = this.stateService.totalCost;
  readonly selectedWallTotalCost = this.stateService.selectedWallTotalCost;
  readonly totalWidth = this.stateService.totalWidth;
  readonly fitsOnWall = this.stateService.fitsOnWall;
  readonly remainingWidth = this.stateService.remainingWidth;
  readonly totalCabinetCount = this.stateService.totalCabinetCount;

  get wallLength(): number {
    return this.selectedWall()?.widthMm ?? 3600;
  }

  set wallLength(value: number) {
    const wall = this.selectedWall();
    if (wall) {
      this.stateService.updateWallDimensions(wall.id, value, wall.heightMm);
      this.resetProjectResult();
    }
  }

  get wallHeight(): number {
    return this.selectedWall()?.heightMm ?? 2600;
  }

  set wallHeight(value: number) {
    const wall = this.selectedWall();
    if (wall) {
      this.stateService.updateWallDimensions(wall.id, wall.widthMm, value);
      this.resetProjectResult();
    }
  }

  get editingCabinetId(): string | null {
    return this.editingCabinet?.id ?? null;
  }

  get formTitle(): string {
    return this.editingCabinet ? 'Edytuj szafkę' : 'Dodaj szafkę';
  }

  get selectedWallLabel(): string {
    const wall = this.selectedWall();
    return wall ? this.stateService.getWallLabel(wall.type) : '';
  }

  // ============ COUNTERTOP & PLINTH CONFIG ============

  // Opcje dla dropdownów
  readonly countertopMaterialOptions = COUNTERTOP_MATERIAL_OPTIONS;
  readonly countertopThicknessOptions = COUNTERTOP_THICKNESS_OPTIONS;
  readonly countertopJointOptions = COUNTERTOP_JOINT_OPTIONS;
  readonly countertopEdgeOptions = COUNTERTOP_EDGE_OPTIONS;
  readonly feetTypeOptions = FEET_TYPE_OPTIONS;
  readonly plinthMaterialOptions = PLINTH_MATERIAL_OPTIONS;

  // Helper - pobiera konfigurację blatu dla aktualnej ściany
  private getSelectedWallCountertopConfig(): CountertopConfig | undefined {
    const wallId = this.selectedWallId();
    if (!wallId) return undefined;
    return this.stateService.getCountertopConfig(wallId);
  }

  // Helper - pobiera konfigurację cokołu dla aktualnej ściany
  private getSelectedWallPlinthConfig(): PlinthConfig | undefined {
    const wallId = this.selectedWallId();
    if (!wallId) return undefined;
    return this.stateService.getPlinthConfig(wallId);
  }

  // Gettery dla konfiguracji blatu
  get countertopEnabled(): boolean {
    return this.getSelectedWallCountertopConfig()?.enabled ?? true;
  }

  set countertopEnabled(value: boolean) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true, materialType: 'LAMINATE' as CountertopMaterialType, thicknessMm: 38, jointType: 'ALUMINUM_STRIP' as CountertopJointType, edgeType: 'ABS_EDGE' as CountertopEdgeType };
    this.stateService.updateCountertopConfig(wallId, { ...current, enabled: value });
    this.resetProjectResult();
  }

  get countertopMaterial(): CountertopMaterialType {
    return this.getSelectedWallCountertopConfig()?.materialType ?? 'LAMINATE';
  }

  set countertopMaterial(value: CountertopMaterialType) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true, materialType: 'LAMINATE' as CountertopMaterialType, thicknessMm: 38, jointType: 'ALUMINUM_STRIP' as CountertopJointType, edgeType: 'ABS_EDGE' as CountertopEdgeType };
    this.stateService.updateCountertopConfig(wallId, { ...current, materialType: value });
    this.resetProjectResult();
  }

  get countertopThickness(): number {
    return this.getSelectedWallCountertopConfig()?.thicknessMm ?? 38;
  }

  set countertopThickness(value: number) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true, materialType: 'LAMINATE' as CountertopMaterialType, thicknessMm: 38, jointType: 'ALUMINUM_STRIP' as CountertopJointType, edgeType: 'ABS_EDGE' as CountertopEdgeType };
    this.stateService.updateCountertopConfig(wallId, { ...current, thicknessMm: value });
    this.resetProjectResult();
  }

  get countertopJoint(): CountertopJointType {
    return this.getSelectedWallCountertopConfig()?.jointType ?? 'ALUMINUM_STRIP';
  }

  set countertopJoint(value: CountertopJointType) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true, materialType: 'LAMINATE' as CountertopMaterialType, thicknessMm: 38, jointType: 'ALUMINUM_STRIP' as CountertopJointType, edgeType: 'ABS_EDGE' as CountertopEdgeType };
    this.stateService.updateCountertopConfig(wallId, { ...current, jointType: value });
    this.resetProjectResult();
  }

  get countertopEdge(): CountertopEdgeType {
    return this.getSelectedWallCountertopConfig()?.edgeType ?? 'ABS_EDGE';
  }

  set countertopEdge(value: CountertopEdgeType) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true, materialType: 'LAMINATE' as CountertopMaterialType, thicknessMm: 38, jointType: 'ALUMINUM_STRIP' as CountertopJointType, edgeType: 'ABS_EDGE' as CountertopEdgeType };
    this.stateService.updateCountertopConfig(wallId, { ...current, edgeType: value });
    this.resetProjectResult();
  }

  // Gettery dla konfiguracji cokołu
  get plinthEnabled(): boolean {
    return this.getSelectedWallPlinthConfig()?.enabled ?? true;
  }

  set plinthEnabled(value: boolean) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallPlinthConfig() ?? { enabled: true, feetType: 'FEET_100' as FeetType, materialType: 'PVC' as PlinthMaterialType };
    this.stateService.updatePlinthConfig(wallId, { ...current, enabled: value });
    this.resetProjectResult();
  }

  get feetType(): FeetType {
    return this.getSelectedWallPlinthConfig()?.feetType ?? 'FEET_100';
  }

  set feetType(value: FeetType) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallPlinthConfig() ?? { enabled: true, feetType: 'FEET_100' as FeetType, materialType: 'PVC' as PlinthMaterialType };
    this.stateService.updatePlinthConfig(wallId, { ...current, feetType: value });
    this.resetProjectResult();
  }

  get plinthMaterial(): PlinthMaterialType {
    return this.getSelectedWallPlinthConfig()?.materialType ?? 'PVC';
  }

  set plinthMaterial(value: PlinthMaterialType) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallPlinthConfig() ?? { enabled: true, feetType: 'FEET_100' as FeetType, materialType: 'PVC' as PlinthMaterialType };
    this.stateService.updatePlinthConfig(wallId, { ...current, materialType: value });
    this.resetProjectResult();
  }

  /**
   * Zwraca wysokość cokołu na podstawie wybranego typu nóżek
   */
  get plinthHeight(): number {
    const feetOption = this.feetTypeOptions.find(o => o.value === this.feetType);
    return feetOption?.plinthHeightMm ?? 97;
  }

  // ============ WALL MANAGEMENT ============

  onAddWallRequested(): void {
    const availableTypes = this.stateService.getAvailableWallTypes();

    if (availableTypes.length === 0) {
      this.snackBar.open('Wszystkie typy ścian zostały już dodane', 'OK', {
        duration: 3000
      });
      return;
    }

    const dialogRef = this.dialog.open(AddWallDialogComponent, {
      data: { availableTypes } as AddWallDialogData,
      width: '400px'
    });

    dialogRef.afterClosed().subscribe((result: AddWallDialogResult | undefined) => {
      if (result) {
        this.stateService.addWall(result.type, result.widthMm, result.heightMm);
        this.snackBar.open(`Dodano ścianę: ${this.stateService.getWallLabel(result.type)}`, 'OK', {
          duration: 2000
        });
        this.resetProjectResult();
      }
    });
  }

  onWallRemoved(wallId: string): void {
    const wall = this.walls().find(w => w.id === wallId);
    if (!wall) return;

    if (wall.cabinets.length > 0) {
      const confirmRemove = confirm(
        `Ściana "${this.stateService.getWallLabel(wall.type)}" zawiera ${wall.cabinets.length} szafek. Czy na pewno chcesz ją usunąć?`
      );
      if (!confirmRemove) return;
    }

    this.stateService.removeWall(wallId);
    this.snackBar.open('Ściana została usunięta', 'OK', { duration: 2000 });
    this.resetProjectResult();
  }

  // ============ CABINET MANAGEMENT ============

  onCabinetCalculated(event: CabinetCalculatedEvent): void {
    this.result = event.result;

    if (event.editingCabinetId) {
      this.stateService.updateCabinet(event.editingCabinetId, event.formData, event.result);
      this.editingCabinet = null;
    } else {
      this.stateService.addCabinet(event.formData, event.result);
    }

    this.resetProjectResult();
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
    this.resetProjectResult();
  }

  onWallChange(): void {
    // This is now handled by the setters for wallLength and wallHeight
    this.resetProjectResult();
  }

  clearAll(): void {
    const confirmClear = confirm('Czy na pewno chcesz usunąć wszystkie ściany i szafki?');
    if (!confirmClear) return;

    this.stateService.clearAll();
    this.result = null;
    this.editingCabinet = null;
    this.resetProjectResult();
  }

  clearSelectedWallCabinets(): void {
    const wall = this.selectedWall();
    if (!wall || wall.cabinets.length === 0) return;

    const confirmClear = confirm(`Czy na pewno chcesz usunąć wszystkie szafki ze ściany "${this.selectedWallLabel}"?`);
    if (!confirmClear) return;

    this.stateService.clearSelectedWallCabinets();
    this.resetProjectResult();
  }

  // ============ PROJECT SAVE ============

  /**
   * Otwiera dialog zapisywania projektu i zapisuje go w bazie.
   */
  onSaveProject(): void {
    const isUpdate = this.currentProjectId() !== null;

    const dialogRef = this.dialog.open(SaveProjectDialogComponent, {
      data: {
        projectName: this.currentProjectName() || '',
        projectDescription: '',
        isUpdate
      } as SaveProjectDialogData,
      width: '450px'
    });

    dialogRef.afterClosed().subscribe((result: SaveProjectDialogResult | undefined) => {
      if (!result) return;

      this.isSavingProject = true;

      if (isUpdate && this.currentProjectId()) {
        // Aktualizacja istniejącego projektu
        const request = this.stateService.buildUpdateProjectRequest(result.name, result.description);

        this.kitchenService.updateProject(this.currentProjectId()!, request).subscribe({
          next: (response) => {
            this.stateService.setProjectInfo(response.id, response.name, response.version);
            this.isSavingProject = false;
            this.snackBar.open('Projekt został zaktualizowany', 'OK', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error updating project:', err);
            this.isSavingProject = false;
            this.snackBar.open('Błąd podczas aktualizacji projektu', 'OK', { duration: 5000 });
          }
        });
      } else {
        // Tworzenie nowego projektu
        const request = this.stateService.buildMultiWallProjectRequest(result.name, result.description);

        this.kitchenService.createProject(request).subscribe({
          next: (response) => {
            this.stateService.setProjectInfo(response.id, response.name, response.version);
            this.isSavingProject = false;
            this.snackBar.open('Projekt został zapisany', 'OK', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error creating project:', err);
            this.isSavingProject = false;
            this.snackBar.open('Błąd podczas zapisywania projektu', 'OK', { duration: 5000 });
          }
        });
      }
    });
  }

  // ============ PROJECT CALCULATION ============

  /**
   * Wywołuje endpoint /kitchen/project/calculate-all z wszystkimi ścianami i szafkami.
   */
  calculateProject(): void {
    if (this.totalCabinetCount() === 0) {
      this.projectError = 'Dodaj przynajmniej jedną szafkę do projektu';
      return;
    }

    this.isCalculatingProject = true;
    this.projectError = null;
    this.projectResult = null;

    const request = this.stateService.buildMultiWallCalculateRequest();

    this.kitchenService.calculateMultiWall(request).subscribe({
      next: (response) => {
        this.projectResult = response;
        this.aggregateProjectDetails(response);
        this.isCalculatingProject = false;
        console.log('Multi-wall calculation result:', response);
      },
      error: (err) => {
        console.error('Multi-wall calculation error:', err);
        this.projectError = err.error?.message || err.message || 'Wystąpił błąd podczas kalkulacji projektu';
        this.isCalculatingProject = false;
      }
    });
  }

  private resetProjectResult(): void {
    this.projectResult = null;
    this.projectError = null;
    this.aggregatedBoards = [];
    this.aggregatedComponents = [];
    this.aggregatedJobs = [];
    this.totalWasteCost = 0;
    this.wasteDetails = [];
  }

  /**
   * Agreguje płyty, komponenty i prace z wszystkich szafek w projekcie
   */
  private aggregateProjectDetails(response: MultiWallCalculateResponse): void {
    const boardsMap = new Map<string, AggregatedBoard>();
    const componentsMap = new Map<string, AggregatedComponent>();
    const wasteMap = new Map<string, AggregatedComponent>(); // Osobna mapa dla SHEET_WASTE
    const jobsMap = new Map<string, AggregatedJob>();

    for (const wall of response.walls) {
      for (const cabinet of wall.cabinets) {
        // Agreguj płyty
        if (cabinet.boards) {
          for (const board of cabinet.boards) {
            const key = `${board.boardName}_${board.boardThickness}_${board.sideX}_${board.sideY}`;
            const existing = boardsMap.get(key);
            if (existing) {
              existing.quantity += board.quantity;
              existing.totalCost += board.totalPrice;
            } else {
              boardsMap.set(key, {
                material: board.boardName,
                thickness: board.boardThickness,
                width: board.sideX,
                height: board.sideY,
                quantity: board.quantity,
                unitCost: board.priceEntry?.price ?? 0,
                totalCost: board.totalPrice
              });
            }
          }
        }

        // Agreguj komponenty (z wydzieleniem SHEET_WASTE)
        if (cabinet.components) {
          for (const comp of cabinet.components) {
            const isWaste = comp.category === 'SHEET_WASTE';
            const targetMap = isWaste ? wasteMap : componentsMap;

            const key = `${comp.category}_${comp.model}`;
            const existing = targetMap.get(key);
            if (existing) {
              existing.quantity += comp.quantity;
              existing.totalCost += comp.totalPrice;
            } else {
              targetMap.set(key, {
                name: comp.model,
                type: comp.category,
                quantity: comp.quantity,
                unitCost: comp.priceEntry?.price ?? 0,
                totalCost: comp.totalPrice
              });
            }
          }
        }

        // Agreguj prace
        if (cabinet.jobs) {
          for (const job of cabinet.jobs) {
            const key = `${job.category}_${job.type}`;
            const existing = jobsMap.get(key);
            if (existing) {
              existing.quantity += job.quantity;
              existing.totalCost += job.totalPrice;
            } else {
              jobsMap.set(key, {
                name: job.type,
                type: job.category,
                quantity: job.quantity,
                unitCost: job.priceEntry?.price ?? 0,
                totalCost: job.totalPrice
              });
            }
          }
        }
      }
    }

    this.aggregatedBoards = Array.from(boardsMap.values());
    this.aggregatedComponents = Array.from(componentsMap.values());
    this.aggregatedJobs = Array.from(jobsMap.values());

    // Wydziel koszt odpadu
    this.wasteDetails = Array.from(wasteMap.values());
    this.totalWasteCost = this.wasteDetails.reduce((sum, w) => sum + w.totalCost, 0);
  }

  /**
   * Oblicza całkowity koszt projektu z opcjonalnym kosztem odpadu
   */
  get adjustedTotalCost(): number {
    if (!this.projectResult) return 0;
    const baseCost = this.projectResult.totalProjectCost - this.totalWasteCost;
    return this.includeWasteCost ? this.projectResult.totalProjectCost : baseCost;
  }

  /**
   * Oblicza koszt komponentów z opcjonalnym kosztem odpadu
   */
  get adjustedComponentCost(): number {
    if (!this.projectResult) return 0;
    const baseCost = this.projectResult.totalComponentCost - this.totalWasteCost;
    return this.includeWasteCost ? this.projectResult.totalComponentCost : baseCost;
  }
}
