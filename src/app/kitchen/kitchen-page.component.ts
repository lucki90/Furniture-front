import { Component, HostListener, inject, effect, DestroyRef, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AddWallDialogComponent, AddWallDialogData, AddWallDialogResult } from './add-wall-dialog/add-wall-dialog.component';
import { KitchenStateService } from './service/kitchen-state.service';
import { AggregatedBoard, AggregatedComponent, AggregatedJob } from './service/project-details-aggregator.service';
import { CabinetCalculatedEvent, KitchenCabinet } from './model/kitchen-state.model';
import { MultiWallCalculateResponse, ProjectStatus, getStatusLabel, getStatusColor } from './model/kitchen-project.model';
import { CabinetResponse } from './cabinet-form/model/kitchen-cabinet-form.model';
import { ToastService } from '../core/error/toast.service';
import { ApiErrorHandler } from '../core/error/api-error-handler.service';
import { LanguageService } from '../service/language.service';
import {
  calculateAdjustedComponentCost,
  calculateAdjustedTotalCost,
  sumAggregatedBoardsCost,
  sumAggregatedComponentsCost,
  sumAggregatedJobsCost
} from './service/kitchen-project-summary.utils';
import { KitchenProjectWorkflowFacade } from './service/kitchen-project-workflow.facade';
import { KitchenProjectExportFacade } from './service/kitchen-project-export.facade';
import { KitchenProjectStatusFacade } from './service/kitchen-project-status.facade';
import { KitchenWorkspaceActionsFacade } from './service/kitchen-workspace-actions.facade';
import { KitchenPageHeaderComponent } from './page-header/kitchen-page-header.component';
import { KitchenCabinetsSectionComponent } from './cabinets-section/kitchen-cabinets-section.component';
import { KitchenWorkspaceSectionComponent } from './workspace-section/kitchen-workspace-section.component';
import { KitchenCostsSectionComponent } from './costs-section/kitchen-costs-section.component';
import { KitchenPageFooterComponent } from './page-footer/kitchen-page-footer.component';
import { KitchenProjectsDrawerComponent } from './projects-drawer/kitchen-projects-drawer.component';
import { KitchenBomTranslationsService } from './service/kitchen-bom-translations.service';
import { buildCalculationViewState } from './kitchen-page-view-state';
import { KitchenPagePricingService } from './service/kitchen-page-pricing.service';
import { KitchenService } from './service/kitchen.service';
import { KitchenProjectTransitionGuardService } from './service/kitchen-project-transition-guard.service';
import { KitchenProjectRequestsFacade } from './service/kitchen-project-requests.facade';

export function resolveKitchenPageInitialView(
  storedView: string | null,
  hasCostsContent: boolean
): 'config' | 'costs' {
  const normalized: 'config' | 'costs' = storedView === 'costs' ? 'costs' : 'config';
  return normalized === 'costs' && !hasCostsContent ? 'config' : normalized;
}

// Fallback Polish material names used in Excel until backend translations are loaded.
// MATERIAL.* translations live in the backend dictionary and are loaded reactively for the active language.
// We keep local fallback labels here so export still works before translations arrive.
/** Polish fallback translations for raw material codes (Excel Symbol column). */
const MATERIAL_NAMES_PL: Record<string, string> = {
  CHIPBOARD: 'Plyta wiorowa',
  MDF_LAMINATED: 'MDF laminowany',
  MDF: 'MDF',
  HDF: 'HDF',
  SOLID_WOOD: 'Drewno lite',
  PLYWOOD: 'Sklejka',
  OSB: 'OSB',
  ACRYLIC: 'Akryl',
  GLASS: 'Szklo',
};

@Component({
  selector: 'app-kitchen-page',
  templateUrl: './kitchen-page.component.html',
  styleUrls: ['./kitchen-page.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    KitchenPageHeaderComponent,
    KitchenCabinetsSectionComponent,
    KitchenWorkspaceSectionComponent,
    KitchenCostsSectionComponent,
    KitchenPageFooterComponent,
    KitchenProjectsDrawerComponent
  ],
  providers: [KitchenPagePricingService]
})
export class KitchenPageComponent {

  private stateService = inject(KitchenStateService);
  protected readonly pricingService = inject(KitchenPagePricingService);
  private projectWorkflowFacade = inject(KitchenProjectWorkflowFacade);
  private projectExportFacade = inject(KitchenProjectExportFacade);
  private projectStatusFacade = inject(KitchenProjectStatusFacade);
  private workspaceActionsFacade = inject(KitchenWorkspaceActionsFacade);
  private kitchenService = inject(KitchenService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private toast = inject(ToastService);
  private errorHandler = inject(ApiErrorHandler);
  private bomTranslationsService = inject(KitchenBomTranslationsService);
  private languageService = inject(LanguageService);
  private destroyRef = inject(DestroyRef);
  private projectTransitionGuard = inject(KitchenProjectTransitionGuardService);
  private requestsFacade = inject(KitchenProjectRequestsFacade);

  readonly projectTransitionInProgress = this.projectTransitionGuard.isTransitioning;

  // Single cabinet calculation result shown in the sidebar detail panel
  readonly result = signal<CabinetResponse | null>(null);
  readonly editingCabinet = signal<KitchenCabinet | null>(null);
  readonly editingCabinetId = computed(() => this.editingCabinet()?.id ?? null);

  // Stan kalkulacji projektu (multi-wall)
  readonly projectResult = signal<MultiWallCalculateResponse | null>(null);
  readonly isCalculatingProject = signal(false);

  // Tryb widoku strony: 'config' (workspace + lista szafek) lub 'costs' (zestawienie kosztów).
  // Persystowany w localStorage; auto-przełącza się na 'costs' po udanej kalkulacji.
  readonly view = signal<'config' | 'costs'>(resolveKitchenPageInitialView(
    localStorage.getItem('fp_view'),
    this.stateService.totalCabinetCount() > 0
  ));
  readonly isProjectsDrawerOpen = signal(false);
  readonly openingProjectFromDrawerId = signal<number | null>(null);

  // Active tab in project details panel
  readonly activeDetailsTab = signal<'walls' | 'boards' | 'components' | 'jobs' | 'pricing'>('walls');

  // Aggregated data used by project detail tabs
  readonly aggregatedBoards = signal<AggregatedBoard[]>([]);
  readonly aggregatedComponents = signal<AggregatedComponent[]>([]);
  readonly aggregatedJobs = signal<AggregatedJob[]>([]);

  // Koszt odpadu (SHEET_WASTE) - opcjonalnie wliczany
  readonly includeWasteCost = signal(false);
  readonly totalWasteCost = signal(0);
  readonly wasteDetails = signal<AggregatedComponent[]>([]);

  // Pricing warnings for missing catalog prices (pricingComplete=false)
  readonly pricingWarnings = signal<string[]>([]);

  // Stan eksportu Excel
  readonly isExporting = signal(false);

  // Stan zapisywania projektu
  readonly isSavingProject = signal(false);
  readonly isChangingStatus = signal(false);

  /**
   * Backend translation dictionary for BOARD_NAME.* and MATERIAL.* keys.
   * Used both in BOM aggregation and Excel export.
   */
  private readonly bomTranslations = signal<Record<string, string>>({});

  constructor() {
    // Keep BOM translations in sync with the active UI language.
    this.bomTranslationsService.watchTranslations().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((translations: Record<string, string>) => {
      this.bomTranslations.set(translations);
    });
  }

  // Sync wall-level config with global signals when selected wall changes
  private syncEffect = effect(() => {
    const wallId = this.selectedWallId();
    if (!wallId) return;

    // Synchronizuj wysokość cokołu aktywnej ściany z ustawieniem projektowym,
    // żeby nowe ściany i kalkulacja korzystały z tej samej kanonicznej wartości.
    const plinthConfig = this.stateService.getPlinthConfig(wallId);
    if (plinthConfig?.enabled && plinthConfig.heightMm != null) {
      this.stateService.updateProjectSettings({ plinthHeightMm: plinthConfig.heightMm });
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
  readonly cabinets = this.stateService.cabinets;
  readonly totalCost = this.stateService.totalCost;
  readonly selectedWallTotalCost = this.stateService.selectedWallTotalCost;
  readonly totalWidth = this.stateService.totalWidth;
  readonly fitsOnWall = this.stateService.fitsOnWall;
  readonly remainingWidth = this.stateService.remainingWidth;
  readonly totalCabinetCount = this.stateService.totalCabinetCount;
  readonly canUndo = this.stateService.canUndo;
  readonly canRedo = this.stateService.canRedo;

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!event.ctrlKey && !event.metaKey) return;
    const tag = (event.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (event.key === 'z' || event.key === 'Z') {
      if (event.shiftKey) {
        event.preventDefault();
        this.redo();
      } else {
        event.preventDefault();
        this.undo();
      }
    } else if (event.key === 'y' || event.key === 'Y') {
      event.preventDefault();
      this.redo();
    } else if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      if (!this.isSavingProject()) {
        this.onSaveProject();
      }
    }
  }

  undo(): void {
    if (this.stateService.undo()) {
      this.resetProjectResult();
    }
  }

  redo(): void {
    if (this.stateService.redo()) {
      this.resetProjectResult();
    }
  }

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

  get roomWidthMm(): number | null {
    return this.stateService.currentProjectRoomWidthMm();
  }

  set roomWidthMm(value: number | null) {
    this.stateService.updateRoomDimensions(value, this.roomDepthMm, { recordHistory: true });
    this.resetProjectResult();
  }

  get roomDepthMm(): number | null {
    return this.stateService.currentProjectRoomDepthMm();
  }

  set roomDepthMm(value: number | null) {
    this.stateService.updateRoomDimensions(this.roomWidthMm, value, { recordHistory: true });
    this.resetProjectResult();
  }

  get selectedWallLabel(): string {
    const wall = this.selectedWall();
    return wall ? this.stateService.getWallLabel(wall.type) : '';
  }

  get currentProjectStatusLabel(): string {
    return getStatusLabel(this.currentProjectStatus());
  }

  get currentProjectStatusColor(): string {
    return getStatusColor(this.currentProjectStatus());
  }

  get currentProjectTransitionOptions(): { value: ProjectStatus; label: string }[] {
    return this.currentProjectAllowedTransitions().map(status => ({
      value: status,
      label: getStatusLabel(status)
    }));
  }

  // ============ COUNTERTOP & PLINTH CONFIG ============
  // Gettery/settery przeniesione do WallConfigComponent (R.2.5).
  // Handler emitowanego zdarzenia:
  onWallConfigChanged(): void {
    this.resetProjectResult();
  }

  // ============ STATUS MANAGEMENT ============

  onStatusChange(newStatus: ProjectStatus): void {
    const projectId = this.currentProjectId();
    if (!projectId || this.isChangingStatus()) return;

    this.isChangingStatus.set(true);

    this.projectStatusFacade.changeStatus(projectId, newStatus).subscribe({
      next: ({ projectInfo, successMessage }) => {
        this.stateService.setProjectInfo(
          projectInfo.id, projectInfo.name, projectInfo.version,
          projectInfo.description, projectInfo.status, projectInfo.allowedTransitions,
          projectInfo.clientName, projectInfo.clientPhone, projectInfo.clientEmail
        );
        this.isChangingStatus.set(false);
        this.toast.success(successMessage);
      },
      error: (err) => {
        console.error('Error changing project status:', err);
        this.isChangingStatus.set(false);
        this.errorHandler.handle(err);
      }
    });
  }

  // ============ WALL MANAGEMENT ============

  onAddWallRequested(): void {
    const availableTypes = this.stateService.getAvailableWallTypes();

    if (availableTypes.length === 0) {
      this.toast.error('Wszystkie typy scian zostaly juz dodane');
      return;
    }

    const dialogRef = this.dialog.open(AddWallDialogComponent, {
      data: { availableTypes } as AddWallDialogData,
      width: '400px'
    });

    dialogRef.afterClosed().subscribe((result: AddWallDialogResult | undefined) => {
      if (result) {
        this.stateService.addWall(
          result.type,
          result.widthMm,
          result.heightMm,
          result.islandDepthMm,
          result.adjacentToWall
        );
        this.toast.success(`Dodano sciane: ${this.stateService.getWallLabel(result.type)}`);
        this.resetProjectResult();
      }
    });
  }

  onWallRemoved(wallId: string): void {
    const wall = this.walls().find(w => w.id === wallId);
    if (!wall) return;

    this.workspaceActionsFacade.confirmAndRemoveWall(wall, this.stateService.getWallLabel(wall.type))
      .subscribe(removed => {
        if (removed) {
          this.resetProjectResult();
        }
      });
  }

  // ============ CABINET MANAGEMENT ============

  onCabinetCalculated(event: CabinetCalculatedEvent): void {
    this.result.set(event.result);

    if (event.editingCabinetId) {
      this.stateService.updateCabinet(event.editingCabinetId, event.formData, event.result);
      this.editingCabinet.set(null);
    } else {
      this.stateService.addCabinet(event.formData, event.result);
    }

    this.resetProjectResult();
  }

  onEditCabinet(cabinetId: string): void {
    const cabinet = this.stateService.getCabinetById(cabinetId);
    if (cabinet) {
      this.editingCabinet.set(cabinet);
    }
  }

  onCancelEdit(): void {
    this.editingCabinet.set(null);
  }

  onRemoveCabinet(cabinetId: string): void {
    this.stateService.removeCabinet(cabinetId);
    this.resetProjectResult();
  }

  onCloneCabinet(cabinetId: string): void {
    this.stateService.cloneCabinet(cabinetId);
    this.resetProjectResult();
  }

  clearAll(): void {
    this.workspaceActionsFacade.confirmAndClearAll().subscribe(cleared => {
      if (!cleared) return;
      this.clearLocalWorkspaceViewState();
    });
  }

  /** Zmiana trybu widoku (Konfigurator / Koszty). Persystuje wybór w localStorage. */
  setView(view: 'config' | 'costs'): void {
    if (view === 'costs') {
      if (this.editingCabinetId() !== null) return;
      if (!this.canRenderCostsView()) {
        view = 'config';
      }
    }

    if (this.view() === view) return;
    this.view.set(view);
    localStorage.setItem('fp_view', view);
  }

  toggleProjectsDrawer(): void {
    this.isProjectsDrawerOpen.update(v => !v);
  }

  closeProjectsDrawer(): void {
    this.isProjectsDrawerOpen.set(false);
    queueMicrotask(() => {
      // Keep this selector in sync with `.projects-toggle-btn` in KitchenPageHeaderComponent.
      const trigger = document.querySelector<HTMLButtonElement>('.projects-toggle-btn');
      trigger?.focus();
    });
  }

  createNewProjectFromDrawer(): void {
    if (this.projectTransitionInProgress() || this.isSavingProject() || this.openingProjectFromDrawerId() !== null) {
      return;
    }
    this.projectTransitionGuard.confirmUnsavedAndProceed('utwórz nowy projekt', {
      onProceed: () => {
        this.stateService.startNewProject();
        this.clearLocalWorkspaceViewState();
        this.closeProjectsDrawer();
        this.router.navigate(['/kitchen']);
      },
      onSavingChange: isSaving => {
        this.isSavingProject.set(isSaving);
      }
    });
  }

  openProjectFromDrawer(projectId: number): void {
    if (
      projectId === this.currentProjectId()
      || this.projectTransitionInProgress()
      || this.isSavingProject()
      || this.openingProjectFromDrawerId() !== null
    ) {
      return;
    }

    this.projectTransitionGuard.confirmUnsavedAndProceed('otwórz inny projekt', {
      onProceed: () => {
        this.openingProjectFromDrawerId.set(projectId);
        this.kitchenService.getProjectById(projectId).subscribe({
          next: project => {
            this.stateService.loadProject(project);
            this.clearLocalWorkspaceViewState();
            this.closeProjectsDrawer();
            this.router.navigate(['/kitchen'], {
              queryParams: { projectId: project.id }
            });
            this.openingProjectFromDrawerId.set(null);
          },
          error: err => {
            console.error('Error loading project from drawer:', err);
            this.openingProjectFromDrawerId.set(null);
            this.errorHandler.handle(err);
          }
        });
      },
      onSavingChange: isSaving => {
        this.isSavingProject.set(isSaving);
      }
    });
  }

  clearSelectedWallCabinets(): void {
    const wall = this.selectedWall();
    if (!wall || wall.cabinets.length === 0) return;

    this.workspaceActionsFacade.confirmAndClearSelectedWallCabinets(this.selectedWallLabel)
      .subscribe(cleared => {
        if (cleared) {
          this.resetProjectResult();
        }
      });
  }

  // ============ PROJECT SAVE ============

  /**
   * Otwiera dialog zapisywania projektu i zapisuje go w bazie.
   */
  onSaveProject(): void {
    this.projectTransitionGuard.openSaveProjectDialogAndPersist({
      onSavingChange: isSaving => {
        this.isSavingProject.set(isSaving);
      }
    });
  }

  // ============ PROJECT CALCULATION ============

  /** Runs multi-wall project calculation for the current workspace. */
  calculateProject(): void {
    if (this.totalCabinetCount() === 0) {
      this.toast.error('Dodaj przynajmniej jedna szafke do projektu');
      return;
    }

    this.isCalculatingProject.set(true);
    this.projectResult.set(null);

    const request = this.requestsFacade.buildMultiWallCalculateRequest();

    this.pricingService.reset();
    this.projectWorkflowFacade.calculateProject(request, this.stateService.walls(), this.bomTranslations()).subscribe({
      next: ({ response, aggregation, pricingWarnings }) => {
        const state = buildCalculationViewState({ response, aggregation, pricingWarnings });
        this.projectResult.set(state.projectResult);
        this.aggregatedBoards.set(state.aggregatedBoards);
        this.aggregatedComponents.set(state.aggregatedComponents);
        this.aggregatedJobs.set(state.aggregatedJobs);
        this.totalWasteCost.set(state.totalWasteCost);
        this.wasteDetails.set(state.wasteDetails);
        this.pricingWarnings.set(state.pricingWarnings);
        this.isCalculatingProject.set(false);
        this.setView('costs');

        if (this.pricingWarnings().length > 0) {
          this.toast.warning('Uwagi projektu: ' + this.pricingWarnings().join(', '));
        }
      },
      error: (err) => {
        console.error('Multi-wall calculation error:', err);
        this.errorHandler.handle(err);
        this.isCalculatingProject.set(false);
      }
    });
  }

  private resetProjectResult(): void {
    this.projectResult.set(null);
    this.aggregatedBoards.set([]);
    this.aggregatedComponents.set([]);
    this.aggregatedJobs.set([]);
    this.totalWasteCost.set(0);
    this.wasteDetails.set([]);
    this.pricingWarnings.set([]);
    this.pricingService.reset();
    if (this.view() === 'costs') {
      this.setView('config');
    }
  }

  private clearLocalWorkspaceViewState(): void {
    this.result.set(null);
    this.editingCabinet.set(null);
    this.resetProjectResult();
    this.setView('config');
  }

  private canRenderCostsView(): boolean {
    return this.totalCabinetCount() > 0 || this.projectResult() !== null;
  }

  // ============ WYCENA PROJEKTU ============

  loadPricing(): void { this.pricingService.loadPricing(); }

  savePricing(): void { this.pricingService.savePricing(); }

  downloadOfferPdf(): void { this.pricingService.downloadOfferPdf(this.validateBomPrices()); }

  /** Total project cost with optional waste cost included. */
  get adjustedTotalCost(): number {
    return calculateAdjustedTotalCost(this.projectResult(), this.includeWasteCost());
  }

  /** Component cost with optional waste cost included. */
  get adjustedComponentCost(): number {
    return calculateAdjustedComponentCost(this.projectResult(), this.includeWasteCost());
  }

  /** Sum of all aggregated board costs. */
  get totalAggregatedBoardsCost(): number {
    return sumAggregatedBoardsCost(this.aggregatedBoards());
  }

  /** Sum of all aggregated component costs. */
  get totalAggregatedComponentsCost(): number {
    return sumAggregatedComponentsCost(this.aggregatedComponents(), this.includeWasteCost());
  }

  /** Sum of all aggregated job costs. */
  get totalAggregatedJobsCost(): number {
    return sumAggregatedJobsCost(this.aggregatedJobs());
  }

  // ============ EXCEL EXPORT ===========

  /** Returns a warning when BOM contains items with missing catalog prices. */
  private validateBomPrices(): string | null {
    return this.projectExportFacade.getBomPriceWarning(this.aggregatedBoards(), this.aggregatedComponents(), this.aggregatedJobs());
  }

  /** Exports current aggregated boards as an Excel order file. */
  downloadExcel(): void {
    if (!this.projectResult() || this.isExporting()) return;

    const priceWarning = this.validateBomPrices();
    if (priceWarning) {
      this.toast.warning(priceWarning);
    }

    this.isExporting.set(true);
    this.projectExportFacade.exportExcel({
      boards: this.aggregatedBoards(),
      bomTranslations: this.bomTranslations(),
      fallbackMaterialNames: MATERIAL_NAMES_PL,
      projectName: this.stateService.currentProjectName(),
      language: this.languageService.lang()
    }).subscribe({
      next: () => {
        this.isExporting.set(false);
      },
      error: () => {
        this.isExporting.set(false);
        this.toast.error('Blad podczas generowania pliku Excel');
      }
    });
  }
}
