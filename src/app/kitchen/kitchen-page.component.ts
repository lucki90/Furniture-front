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
import { ProjectDetailsAggregatorService, AggregatedBoard, AggregatedComponent, AggregatedJob } from './service/project-details-aggregator.service';
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
import { ProjectPricingService, PricingBreakdown, UpdatePricingRequest } from './service/project-pricing.service';

// TODO i18n — MATERIAL_NAMES: zastąpić TranslationService.getByCategory('MATERIAL', lang)
// Klucze MATERIAL.* już są w DB (10-insert-translations.sql, PL+EN).
// Uwaga: część kluczy różni się od kodu enum (np. MDF_LAMINATED nie ma MATERIAL.MDF_LAMINATED w DB —
// dodać w migracji SQL; podobnie OSB, ACRYLIC, SOLID_WOOD).
// Wymagana zmiana: preload przed downloadExcel() lub jako computed na podstawie sygnału języka.
/** Polish translations for raw material codes used as fallback in the Excel Symbol column. */
const MATERIAL_NAMES_PL: Record<string, string> = {
  CHIPBOARD: 'Płyta wiórowa',
  MDF_LAMINATED: 'MDF laminowany',
  MDF: 'MDF',
  HDF: 'HDF',
  SOLID_WOOD: 'Drewno lite',
  PLYWOOD: 'Sklejka',
  OSB: 'OSB',
  ACRYLIC: 'Akryl',
  GLASS: 'Szkło',
};

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
  private aggregatorService = inject(ProjectDetailsAggregatorService);
  private excelService = inject(ExcelService);
  private pricingService = inject(ProjectPricingService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private toast = inject(ToastService);

  result: any | null = null;
  editingCabinet: KitchenCabinet | null = null;

  // Stan kalkulacji projektu (multi-wall)
  projectResult: MultiWallCalculateResponse | null = null;
  isCalculatingProject = false;

  // Aktywna zakładka w szczegółach projektu
  activeDetailsTab: 'walls' | 'boards' | 'components' | 'jobs' | 'pricing' = 'walls';

  // Wycena projektu
  pricing: PricingBreakdown | null = null;
  isPricingLoading = false;
  isPricingSaving = false;
  pricingDiscountPct = 0;
  pricingManualOverrideEnabled = false;
  pricingManualOverride: number | null = null;
  pricingOfferNotes = '';

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
        const agg = this.aggregatorService.aggregate(response, this.stateService.walls());
        this.aggregatedBoards = agg.boards;
        this.aggregatedComponents = agg.components;
        this.aggregatedJobs = agg.jobs;
        this.totalWasteCost = agg.wasteCost;
        this.wasteDetails = agg.wasteDetails;
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
    this.pricing = null;
  }

  // ============ WYCENA PROJEKTU ============

  loadPricing(): void {
    const id = this.currentProjectId();
    if (!id) return;
    this.isPricingLoading = true;
    this.pricingService.getBreakdown(id).subscribe({
      next: (breakdown) => {
        this.pricing = breakdown;
        this.pricingDiscountPct = breakdown.discountPct ?? 0;
        this.pricingManualOverrideEnabled = breakdown.manualPriceOverride != null;
        this.pricingManualOverride = breakdown.manualPriceOverride ?? null;
        this.pricingOfferNotes = breakdown.offerNotes ?? '';
        this.isPricingLoading = false;
      },
      error: () => {
        this.isPricingLoading = false;
      }
    });
  }

  savePricing(): void {
    const id = this.currentProjectId();
    if (!id) return;
    this.isPricingSaving = true;
    const request: UpdatePricingRequest = {
      discountPct: this.pricingDiscountPct,
      manualPriceOverride: this.pricingManualOverrideEnabled ? this.pricingManualOverride : null,
      offerNotes: this.pricingOfferNotes || null
    };
    this.pricingService.updatePricing(id, request).subscribe({
      next: (breakdown) => {
        this.pricing = breakdown;
        this.isPricingSaving = false;
      },
      error: () => {
        this.isPricingSaving = false;
      }
    });
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
        // Symbol = kolor płyty (np. "RAL 9016", "Dąb"); fallback: polska nazwa materiału
        symbol: board.color || (board.material ? (MATERIAL_NAMES_PL[board.material] ?? board.material) : ''),
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
