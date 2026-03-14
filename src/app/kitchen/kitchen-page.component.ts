import { Component, inject, effect } from '@angular/core';
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
import { CabinetCalculatedEvent, KitchenCabinet, CountertopConfig, PlinthConfig, isUpperCabinetType } from './model/kitchen-state.model';
import { MultiWallCalculateResponse, ProjectStatus, getStatusLabel, getStatusColor, PROJECT_STATUSES } from './model/kitchen-project.model';
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
import { ToastService } from '../core/error/toast.service';
import { ExcelService, ExcelRowRequest } from './service/excel.service';

// Tłumaczenia nazw płyt z backendu (BoardNameEnum) na język polski
const BOARD_NAME_PL: Record<string, string> = {
  'SIDE_NAME': 'Bok',
  'WREATH_NAME': 'Wieniec',
  'TOP_WREATH_NAME': 'Wieniec górny',
  'FRONT_NAME': 'Front',
  'FRONT_DRAWER_NAME': 'Front szuflady',
  'BASE_DRAWER_NAME': 'Dno szuflady',
  'BACK_DRAWER_NAME': 'Tył szuflady',
  'FRONT_SUPPORTER_DRAWER_NAME': 'Podpora frontu szuflady',
  'SIDE_DRAWER_NAME': 'Bok szuflady',
  'SHELF_NAME': 'Półka',
  'HDF_NAME': 'HDF tył',
  'SEGMENT_DIVIDER_NAME': 'Przegroda segmentu',
  'SINK_APRON': 'Blenda zlewu',
  'HOOD_SCREEN': 'Blenda okapu'
};

// Aggregated types for details tabs
export interface AggregatedBoard {
  material: string;
  thickness: number;
  width: number;
  height: number;
  quantity: number;
  unitCost: number;
  totalCost: number;
  /** Kolor płyty — z boardDto.color (np. "RAL 9016", "Dąb naturalny") */
  color?: string;
  /** Okleina na krawędziach szerokości (0/1/2 krawędzie) — z boardDto.veneerX */
  veneerX?: number;
  /** Okleina na krawędziach długości (0/1/2 krawędzie) — z boardDto.veneerY */
  veneerY?: number;
  /** Kolor okleiny — z boardDto.veneerColor */
  veneerColor?: string;
  /** Polska nazwa płyty (tłumaczenie BoardNameEnum) — np. "Bok", "Półka" */
  boardLabel?: string;
  /** Numery szafek, w których ta płyta wystąpiła — np. ["Sz.1", "Sz.3"] */
  cabinetRefs?: string[];
  /**
   * Uwagi do płyty — generowane automatycznie:
   * - FRONT_NAME + HINGE_MILLING: "X puszek na długość Ymm"
   * - SIDE_NAME + GROOVE_FOR_HDF: "Frezowanie nutu pod HDF na boku Ymm"
   */
  remarks?: string;
}

export interface AggregatedComponent {
  name: string;
  type: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  isWaste?: boolean; // true = odpad z cięcia płyt (SHEET_WASTE)
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
  private excelService = inject(ExcelService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private toast = inject(ToastService);

  result: any | null = null;
  editingCabinet: KitchenCabinet | null = null;

  // Stan kalkulacji projektu (multi-wall)
  projectResult: MultiWallCalculateResponse | null = null;
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

  // Stan eksportu Excel
  isExporting = false;

  // Stan zapisywania projektu
  isSavingProject = false;
  isChangingStatus = false;

  // Synchronizacja wall-level config → global signals przy zmianie ściany
  private syncEffect = effect(() => {
    const wallId = this.selectedWallId();
    if (!wallId) return;

    // Synchronizuj plinth z feetType
    const plinthConfig = this.stateService.getPlinthConfig(wallId);
    if (plinthConfig?.enabled) {
      const feetOption = this.feetTypeOptions.find(o => o.value === plinthConfig.feetType);
      if (feetOption) {
        this.stateService.updateProjectSettings({ plinthHeightMm: feetOption.feetHeightMm });
      }
    }

    // Synchronizuj countertop thickness
    const countertopConfig = this.stateService.getCountertopConfig(wallId);
    if (countertopConfig?.enabled && countertopConfig.thicknessMm) {
      this.stateService.updateProjectSettings({ countertopThicknessMm: countertopConfig.thicknessMm });
    }
  });

  // Multi-wall signals
  readonly walls = this.stateService.walls;
  readonly selectedWall = this.stateService.selectedWall;
  readonly selectedWallId = this.stateService.selectedWallId;

  // Project signals
  readonly currentProjectId = this.stateService.currentProjectId;
  readonly currentProjectName = this.stateService.currentProjectName;
  readonly currentProjectDescription = this.stateService.currentProjectDescription;
  readonly currentProjectVersion = this.stateService.currentProjectVersion;
  readonly currentProjectStatus = this.stateService.currentProjectStatus;
  readonly currentProjectAllowedTransitions = this.stateService.currentProjectAllowedTransitions;

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
    // Synchronizuj grubość blatu z globalnym sygnałem
    this.stateService.updateProjectSettings({ countertopThicknessMm: value });
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

  // Głębokość blatu (manualDepthMm, default 600mm)
  get countertopDepth(): number {
    return this.getSelectedWallCountertopConfig()?.manualDepthMm ?? 600;
  }

  set countertopDepth(value: number) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true };
    this.stateService.updateCountertopConfig(wallId, { ...current, manualDepthMm: value });
    this.resetProjectResult();
  }

  // Naddatek boczny (sideOverhangExtraMm, default 5mm)
  get countertopSideOverhang(): number {
    return this.getSelectedWallCountertopConfig()?.sideOverhangExtraMm ?? 5;
  }

  set countertopSideOverhang(value: number) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true };
    this.stateService.updateCountertopConfig(wallId, { ...current, sideOverhangExtraMm: value });
    this.resetProjectResult();
  }

  // Włączenie ręcznego nadpisania długości blatu
  get countertopManualLengthEnabled(): boolean {
    return this.getSelectedWallCountertopConfig()?.manualLengthMm != null;
  }

  set countertopManualLengthEnabled(enabled: boolean) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true };
    this.stateService.updateCountertopConfig(wallId, {
      ...current,
      manualLengthMm: enabled ? (current.manualLengthMm ?? 1200) : undefined
    });
    this.resetProjectResult();
  }

  // Ręczna długość blatu
  get countertopManualLength(): number {
    return this.getSelectedWallCountertopConfig()?.manualLengthMm ?? 1200;
  }

  set countertopManualLength(value: number) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true };
    this.stateService.updateCountertopConfig(wallId, { ...current, manualLengthMm: value });
    this.resetProjectResult();
  }

  /**
   * Maksymalna głębokość szafek dolnych/słupków (do walidacji głębokości blatu).
   */
  get maxBottomCabinetDepth(): number {
    const wall = this.selectedWall();
    if (!wall || wall.cabinets.length === 0) return 0;
    const bottomCabinets = wall.cabinets.filter(c => !isUpperCabinetType(c.type));
    if (bottomCabinets.length === 0) return 0;
    return Math.max(...bottomCabinets.map(c => c.depth));
  }

  /**
   * Ostrzeżenie: głębokość blatu jest mniejsza niż głębokość najgłębszej szafki dolnej.
   */
  get countertopDepthWarning(): boolean {
    const depth = this.countertopDepth;
    const maxCabDepth = this.maxBottomCabinetDepth;
    return maxCabDepth > 0 && depth < maxCabDepth;
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
    // Synchronizuj wysokość nóżek z globalnym sygnałem (feetHeightMm = fizyczna wysokość nóżek)
    const feetOption = this.feetTypeOptions.find(o => o.value === value);
    this.stateService.updateProjectSettings({ plinthHeightMm: feetOption?.feetHeightMm ?? 100 });
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

  /** Grubość płyty cokołowej (domyślnie: 18mm dla MDF/CHIPBOARD, 16mm dla PVC/ALUMINUM) */
  get plinthThickness(): number {
    const configured = this.getSelectedWallPlinthConfig()?.thicknessMm;
    if (configured != null) return configured;
    const mat = this.plinthMaterial;
    return (mat === 'MDF_LAMINATED' || mat === 'CHIPBOARD') ? 18 : 16;
  }

  set plinthThickness(value: number) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallPlinthConfig() ?? { enabled: true };
    this.stateService.updatePlinthConfig(wallId, { ...current, thicknessMm: value });
    this.resetProjectResult();
  }

  /**
   * Zwraca wysokość cokołu na podstawie wybranego typu nóżek
   */
  get plinthHeight(): number {
    const feetOption = this.feetTypeOptions.find(o => o.value === this.feetType);
    return feetOption?.plinthHeightMm ?? 97;
  }

  // Gettery/settery dla blendy górnej
  get upperFillerHeight(): number {
    return this.stateService.upperFillerHeightMm();
  }

  set upperFillerHeight(value: number) {
    this.stateService.updateProjectSettings({ upperFillerHeightMm: value });
    this.resetProjectResult();
  }

  // ============ STATUS MANAGEMENT ============

  getStatusLabel(status: ProjectStatus): string {
    return getStatusLabel(status);
  }

  getStatusColor(status: ProjectStatus): string {
    return getStatusColor(status);
  }

  onStatusChange(newStatus: ProjectStatus): void {
    const projectId = this.currentProjectId();
    if (!projectId || this.isChangingStatus) return;

    this.isChangingStatus = true;

    this.kitchenService.changeProjectStatus(projectId, newStatus).subscribe({
      next: (response) => {
        this.stateService.setProjectInfo(
          response.id, response.name, response.version,
          response.description, response.status, response.allowedTransitions
        );
        this.isChangingStatus = false;
        this.snackBar.open(`Status zmieniony na: ${getStatusLabel(response.status)}`, 'OK', { duration: 3000 });
      },
      error: (err) => {
        console.error('Error changing project status:', err);
        this.isChangingStatus = false;
        this.toast.showHttpError(err);
      }
    });
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
        projectDescription: this.currentProjectDescription() || '',
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
            this.stateService.setProjectInfo(response.id, response.name, response.version, result.description, response.status, response.allowedTransitions);
            this.isSavingProject = false;
            this.snackBar.open('Projekt został zaktualizowany', 'OK', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error updating project:', err);
            this.isSavingProject = false;
            this.toast.showHttpError(err);
          }
        });
      } else {
        // Tworzenie nowego projektu
        const request = this.stateService.buildMultiWallProjectRequest(result.name, result.description);

        this.kitchenService.createProject(request).subscribe({
          next: (response) => {
            this.stateService.setProjectInfo(response.id, response.name, response.version, result.description, response.status, response.allowedTransitions);
            this.isSavingProject = false;
            this.snackBar.open('Projekt został zapisany', 'OK', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error creating project:', err);
            this.isSavingProject = false;
            this.toast.showHttpError(err);
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
      this.toast.error('Dodaj przynajmniej jedną szafkę do projektu');
      return;
    }

    this.isCalculatingProject = true;
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
        this.toast.showHttpError(err);
        this.isCalculatingProject = false;
      }
    });
  }

  private resetProjectResult(): void {
    this.projectResult = null;
    this.aggregatedBoards = [];
    this.aggregatedComponents = [];
    this.aggregatedJobs = [];
    this.totalWasteCost = 0;
    this.wasteDetails = [];
  }

  /**
   * Agreguje płyty, komponenty i prace z wszystkich szafek w projekcie.
   * Uwzględnia również blaty, cokoły i blendy jako płyty.
   */
  private aggregateProjectDetails(response: MultiWallCalculateResponse): void {
    const boardsMap = new Map<string, AggregatedBoard>();
    const componentsMap = new Map<string, AggregatedComponent>();
    const jobsMap = new Map<string, AggregatedJob>();

    // Globalny licznik szafek (przez wszystkie ściany), do kolumny "Etykieta" w Excelu
    let globalCabinetIdx = 0;
    // Konfiguracja ścian frontendu — do odczytu thicknessMm cokołu
    const frontendWalls = this.stateService.walls();

    for (let wallIdx = 0; wallIdx < response.walls.length; wallIdx++) {
      const wall = response.walls[wallIdx];
      const frontendWall = frontendWalls[wallIdx];

      // 1. Agreguj płyty z szafek
      for (const cabinet of wall.cabinets) {
        const cabinetRef = `Sz.${++globalCabinetIdx}`;

        // Uwagi auto-generowane na podstawie prac frezarskich szafki
        const cabinetJobs = cabinet.jobs ?? [];
        const hingeMilling = cabinetJobs.find(j => j.type === 'HINGE_MILLING');
        const grooveForHdf = cabinetJobs.find(j => j.type === 'GROOVE_FOR_HDF');

        if (cabinet.boards) {
          for (const board of cabinet.boards) {
            // Generuj uwagę specyficzną dla rodzaju płyty
            let boardRemarks = '';
            if (board.boardName === 'FRONT_NAME' && hingeMilling) {
              // Liczba puszek na zawiasy; sideY = wysokość frontu (bok montażu zawiasów)
              const hingeCount = Math.round(hingeMilling.quantity);
              boardRemarks = `${hingeCount} ${hingeCount === 1 ? 'puszka' : hingeCount < 5 ? 'puszki' : 'puszek'} na długość ${board.sideY}mm`;
            } else if (board.boardName === 'SIDE_NAME' && grooveForHdf) {
              // Nut pod HDF biegnie wzdłuż wysokości boku szafki (sideY)
              boardRemarks = `Frezowanie nutu pod HDF na boku ${board.sideY}mm`;
            }

            this.addBoardToMap(boardsMap, {
              material: board.boardName,
              thickness: board.boardThickness,
              width: board.sideX,
              height: board.sideY,
              quantity: board.quantity,
              unitCost: board.priceEntry?.price ?? 0,
              totalCost: board.totalPrice,
              color: board.color,
              veneerX: board.veneerX ?? 0,
              veneerY: board.veneerY ?? 0,
              veneerColor: board.veneerColor ?? '',
              boardLabel: BOARD_NAME_PL[board.boardName] ?? board.boardName,
              cabinetRefs: [cabinetRef],
              remarks: boardRemarks || undefined
            });
          }
        }

        // Agreguj komponenty — odpad (SHEET_WASTE) trafia razem z resztą, ale z flagą isWaste
        if (cabinet.components) {
          for (const comp of cabinet.components) {
            const isWaste = comp.category === 'SHEET_WASTE';
            const key = `${comp.category}_${comp.model}`;
            const existing = componentsMap.get(key);
            if (existing) {
              existing.quantity += comp.quantity;
              existing.totalCost += comp.totalPrice;
            } else {
              componentsMap.set(key, {
                name: comp.model,
                type: comp.category,
                quantity: comp.quantity,
                unitCost: comp.priceEntry?.price ?? 0,
                totalCost: comp.totalPrice,
                isWaste
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

      // 2. Agreguj blat jako płytę
      if (wall.countertop?.enabled && wall.countertop.segments) {
        for (const segment of wall.countertop.segments) {
          this.addBoardToMap(boardsMap, {
            material: `BLAT_${wall.countertop.materialType}`,
            thickness: segment.thicknessMm,
            width: segment.lengthMm,
            height: segment.depthMm,
            quantity: 1,
            unitCost: segment.materialCost,
            totalCost: segment.materialCost
          });

          // Dodaj cięcie blatu jako pracę
          if (segment.cuttingCost > 0) {
            this.addJobToMap(jobsMap, {
              name: 'COUNTERTOP_CUTTING',
              type: 'COUNTERTOP',
              quantity: 1,
              unitCost: segment.cuttingCost,
              totalCost: segment.cuttingCost
            });
          }

          // Dodaj oklejinę blatu jako pracę
          if (segment.edgingCost > 0) {
            this.addJobToMap(jobsMap, {
              name: 'COUNTERTOP_EDGING',
              type: 'COUNTERTOP',
              quantity: 1,
              unitCost: segment.edgingCost,
              totalCost: segment.edgingCost
            });
          }
        }

        // Komponenty blatu (śruby łączące, listewki)
        if (wall.countertop.components) {
          for (const comp of wall.countertop.components) {
            this.addComponentToMap(componentsMap, {
              name: comp.model,
              type: comp.category,
              quantity: comp.quantity,
              unitCost: comp.priceEntry?.price ?? 0,
              totalCost: comp.totalPrice ?? 0
            });
          }
        }
      }

      // 3. Agreguj cokół jako płytę
      if (wall.plinth?.enabled && wall.plinth.segments) {
        // Grubość: użyj skonfigurowanej przez użytkownika, fallback wg materiału
        const plinthMat = wall.plinth.materialType ?? '';
        const plinthThicknessMm = frontendWall?.plinthConfig?.thicknessMm
          ?? ((plinthMat === 'MDF_LAMINATED' || plinthMat === 'CHIPBOARD') ? 18 : 16);
        for (const segment of wall.plinth.segments) {
          this.addBoardToMap(boardsMap, {
            material: `COKOL_${plinthMat}`,
            thickness: plinthThicknessMm,
            width: segment.lengthMm,
            height: segment.heightMm,
            quantity: 1,
            unitCost: segment.materialCost,
            totalCost: segment.materialCost
          });

          // Dodaj cięcie cokołu jako pracę (jeśli jest)
          if (segment.cuttingCost > 0) {
            this.addJobToMap(jobsMap, {
              name: 'PLINTH_CUTTING',
              type: 'PLINTH',
              quantity: 1,
              unitCost: segment.cuttingCost,
              totalCost: segment.cuttingCost
            });
          }
        }

        // Komponenty cokołu (nóżki, klipsy)
        if (wall.plinth.components) {
          for (const comp of wall.plinth.components) {
            this.addComponentToMap(componentsMap, {
              name: comp.model,
              type: comp.category,
              quantity: comp.quantity,
              unitCost: comp.priceEntry?.price ?? 0,
              totalCost: comp.totalPrice ?? 0
            });
          }
        }
      }

      // 4. Agreguj blendy jako płyty
      if (wall.fillerPanels) {
        for (const filler of wall.fillerPanels) {
          // Płyta blendy → boards
          this.addBoardToMap(boardsMap, {
            material: `BLENDA_${filler.fillerType}`,
            thickness: filler.thicknessMm,
            width: filler.widthMm,
            height: filler.heightMm,
            quantity: 1,
            unitCost: filler.materialCost,
            totalCost: filler.materialCost
          });

          // Cięcie blendy → jobs
          if (filler.cuttingCost > 0) {
            this.addJobToMap(jobsMap, {
              name: 'FILLER_CUTTING',
              type: 'FILLER',
              quantity: 1,
              unitCost: filler.cuttingCost,
              totalCost: filler.cuttingCost
            });
          }

          // Oklejina blendy → jobs
          if (filler.veneerCost > 0) {
            this.addJobToMap(jobsMap, {
              name: 'FILLER_VENEER',
              type: 'FILLER',
              quantity: 1,
              unitCost: filler.veneerCost,
              totalCost: filler.veneerCost
            });
          }

          // Komponenty blendy (oklejiny, złączki)
          if (filler.components) {
            for (const comp of filler.components) {
              this.addComponentToMap(componentsMap, {
                name: comp.model,
                type: comp.category,
                quantity: comp.quantity,
                unitCost: comp.priceEntry?.price ?? 0,
                totalCost: comp.totalPrice ?? 0
              });
            }
          }
        }
      }

      // 5. Agreguj obudowy boczne jako płyty
      if (wall.enclosures) {
        for (const enc of wall.enclosures) {
          const sideLabel = enc.leftSide ? 'L' : 'P';

          // Płyty obudowy
          for (const board of enc.boards ?? []) {
            this.addBoardToMap(boardsMap, {
              material: `${board.label} (${enc.leftSide ? 'lewa' : 'prawa'})`,
              thickness: board.thicknessMm,
              width: board.widthMm,
              height: board.heightMm,
              quantity: 1,
              unitCost: board.materialCost,
              totalCost: board.materialCost
            });
          }

          // Cięcie obudowy → jobs
          if (enc.cuttingCost > 0) {
            this.addJobToMap(jobsMap, {
              name: 'ENCLOSURE_CUTTING',
              type: 'ENCLOSURE',
              quantity: 1,
              unitCost: enc.cuttingCost,
              totalCost: enc.cuttingCost
            });
          }
        }
      }

      // 6. Agreguj blendę górną jako płyty (z podziałem na segmenty ≤ 2800mm)
      if (wall.upperFiller?.enabled && wall.upperFiller.segments) {
        for (const seg of wall.upperFiller.segments) {
          const label = seg.requiresJoint
            ? `Blenda górna (seg. ${seg.segmentIndex + 1})`
            : 'Blenda górna';
          // Materiał płyty
          this.addBoardToMap(boardsMap, {
            material: label,
            thickness: 18,
            width: seg.lengthMm,
            height: seg.heightMm,
            quantity: 1,
            unitCost: seg.materialCost,
            totalCost: seg.materialCost
          });
          // Cięcie → jobs
          if (seg.cuttingCost > 0) {
            this.addJobToMap(jobsMap, {
              name: `UPPER_FILLER_CUTTING${seg.requiresJoint ? `_${seg.segmentIndex + 1}` : ''}`,
              type: 'UPPER_FILLER',
              quantity: 1,
              unitCost: seg.cuttingCost,
              totalCost: seg.cuttingCost
            });
          }
        }
      }
    }

    this.aggregatedBoards = Array.from(boardsMap.values());
    // Sortuj: zwykłe komponenty najpierw, odpad na końcu
    this.aggregatedComponents = Array.from(componentsMap.values())
      .sort((a, b) => (a.isWaste ? 1 : 0) - (b.isWaste ? 1 : 0));
    this.aggregatedJobs = Array.from(jobsMap.values());

    // Wydziel odpad z aggregatedComponents (do sekcji checkboxa)
    this.wasteDetails = this.aggregatedComponents.filter(c => c.isWaste);
    this.totalWasteCost = this.wasteDetails.reduce((sum, w) => sum + w.totalCost, 0);
  }

  /**
   * Dodaje płytę do mapy agregacji (lub sumuje jeśli istnieje).
   * Klucz uwzględnia kolor i okleinę — płyty o różnych kolorach/okleinach nie są łączone.
   * Przy łączeniu: scalane są numery szafek (cabinetRefs).
   */
  private addBoardToMap(map: Map<string, AggregatedBoard>, board: AggregatedBoard): void {
    const key = [
      board.material, board.thickness, board.width, board.height,
      board.color ?? '', board.veneerX ?? 0, board.veneerY ?? 0, board.veneerColor ?? ''
    ].join('_');
    const existing = map.get(key);
    if (existing) {
      existing.quantity += board.quantity;
      existing.totalCost += board.totalCost;
      if (board.cabinetRefs?.length) {
        existing.cabinetRefs = [...(existing.cabinetRefs ?? []), ...board.cabinetRefs];
      }
      // Merge remarks: deduplikacja (jeśli taka sama uwaga, nie duplikuj)
      if (board.remarks && board.remarks !== existing.remarks) {
        existing.remarks = existing.remarks
          ? `${existing.remarks}; ${board.remarks}`
          : board.remarks;
      }
    } else {
      map.set(key, { ...board });
    }
  }

  /**
   * Dodaje komponent do mapy agregacji.
   */
  private addComponentToMap(map: Map<string, AggregatedComponent>, comp: AggregatedComponent): void {
    const key = `${comp.type}_${comp.name}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += comp.quantity;
      existing.totalCost += comp.totalCost;
    } else {
      map.set(key, { ...comp });
    }
  }

  /**
   * Dodaje pracę do mapy agregacji.
   */
  private addJobToMap(map: Map<string, AggregatedJob>, job: AggregatedJob): void {
    const key = `${job.type}_${job.name}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += job.quantity;
      existing.totalCost += job.totalCost;
    } else {
      map.set(key, { ...job });
    }
  }

  /**
   * Całkowity koszt projektu z opcjonalnym kosztem odpadu.
   * totalProjectCost = boardCost + componentCost + wasteCost + jobCost (z odpadem).
   * checkbox ZAZNACZONY  → totalProjectCost (z odpadem)
   * checkbox ODZNACZONY  → totalProjectCost - wasteCost
   */
  get adjustedTotalCost(): number {
    if (!this.projectResult) return 0;
    const waste = this.projectResult.totalWasteCost ?? this.totalWasteCost;
    return this.includeWasteCost
      ? this.projectResult.totalProjectCost
      : this.projectResult.totalProjectCost - waste;
  }

  /**
   * Koszt komponentów z opcjonalnym kosztem odpadu.
   * totalComponentCost = bez odpadu (po wydzieleniu AloneStandingCabinetService).
   * checkbox ZAZNACZONY  → totalComponentCost + wasteCost (dodajemy odpad)
   * checkbox ODZNACZONY  → totalComponentCost (bez odpadu)
   */
  get adjustedComponentCost(): number {
    if (!this.projectResult) return 0;
    const waste = this.projectResult.totalWasteCost ?? this.totalWasteCost;
    return this.includeWasteCost
      ? this.projectResult.totalComponentCost + waste
      : this.projectResult.totalComponentCost;
  }

  /**
   * Oblicza sumę kosztów wszystkich zagregowanych płyt (szafki + blat + cokół + blendy)
   */
  get totalAggregatedBoardsCost(): number {
    return this.aggregatedBoards.reduce((sum, board) => sum + board.totalCost, 0);
  }

  /**
   * Oblicza sumę kosztów komponentów w zakładce Komponenty.
   * Gdy checkbox "wlicz odpad" jest odznaczony — wiersze odpadu są wyszarzone i NIE wliczane.
   */
  get totalAggregatedComponentsCost(): number {
    return this.aggregatedComponents
      .filter(comp => !comp.isWaste || this.includeWasteCost)
      .reduce((sum, comp) => sum + comp.totalCost, 0);
  }

  /**
   * Oblicza sumę kosztów wszystkich zagregowanych prac
   */
  get totalAggregatedJobsCost(): number {
    return this.aggregatedJobs.reduce((sum, job) => sum + job.totalCost, 0);
  }

  // ─── Eksport Excel ──────────────────────────────────────────────────────────

  /**
   * Generuje plik Excel z listą płyt do zamówienia (zamówienie_cięcia).
   * Wysyła zagregowane płyty do backendu → POST /download/excel → plik .xlsx.
   *
   * Kolumna "Uwagi" jest gotowa w szablonie — wypełnienie automatyczne w kolejnej iteracji
   * (np. "2 puszki ø35mm na boku 400mm", "rzaz na boku 450mm").
   */
  downloadExcel(): void {
    if (!this.projectResult || this.isExporting) return;

    this.isExporting = true;

    const rows: ExcelRowRequest[] = this.aggregatedBoards.map((board, index) => {
      // Etykieta (naklejka): polska nazwa płyty + numery szafek w nawiasie
      let sticker = board.boardLabel ?? board.material;
      if (board.cabinetRefs?.length) {
        sticker += ` (${board.cabinetRefs.join(', ')})`;
      }

      return {
        lp: index + 1,
        quantity: board.quantity,
        // Symbol = kolor płyty (np. "RAL 9016", "Dąb"); fallback: material/boardName
        symbol: board.color || board.material,
        thickness: board.thickness,
        // sideY = wysokość płyty = kierunek słoja (długość)
        length: board.height,
        lengthVeneer: board.veneerY ?? 0,   // liczba okleinowanych krawędzi (kierunek długości)
        width: board.width,
        widthVeneer: board.veneerX ?? 0,    // liczba okleinowanych krawędzi (kierunek szerokości)
        veneerColor: board.veneerColor ?? '',
        sticker,
        remarks: board.remarks ?? ''
      };
    });

    // Nazwa pliku: kuchnia_plyty_%nazwa%_%data% lub kuchnia_%data% gdy brak nazwy
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const projectName = this.stateService.currentProjectName();
    const namePart = projectName
      ? `kuchnia_plyty_${projectName}_${dateStr}`
      : `kuchnia_${dateStr}`;
    const filename = namePart.replace(/[^\w\-ąęółśżźćńĄĘÓŁŚŻŹĆŃ]/g, '_') + '.xlsx';

    this.excelService.downloadBoardList(rows, filename).subscribe({
      next: () => {
        this.isExporting = false;
      },
      error: () => {
        this.isExporting = false;
        this.toast.error('Błąd podczas generowania pliku Excel');
      }
    });
  }
}
