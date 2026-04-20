import { Component, inject, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AddWallDialogComponent, AddWallDialogData, AddWallDialogResult } from './add-wall-dialog/add-wall-dialog.component';
import { SaveProjectDialogComponent, SaveProjectDialogData, SaveProjectDialogResult } from './save-project-dialog/save-project-dialog.component';
import { OfferOptionsDialogComponent } from './offer-options-dialog/offer-options-dialog.component';
import { KitchenStateService } from './service/kitchen-state.service';
import { AggregatedBoard, AggregatedComponent, AggregatedJob } from './service/project-details-aggregator.service';
import { CabinetCalculatedEvent, KitchenCabinet } from './model/kitchen-state.model';
import { FEET_TYPE_OPTIONS } from './model/plinth.model';
import { MultiWallCalculateResponse, ProjectStatus, getStatusLabel, getStatusColor } from './model/kitchen-project.model';
import { CabinetResponse } from './cabinet-form/model/kitchen-cabinet-form.model';
import { ToastService } from '../core/error/toast.service';
import { ApiErrorHandler } from '../core/error/api-error-handler.service';
import { PricingBreakdown } from './service/project-pricing.service';
import { LanguageService } from '../service/language.service';
import {
  calculateAdjustedComponentCost,
  calculateAdjustedTotalCost,
  sumAggregatedBoardsCost,
  sumAggregatedComponentsCost,
  sumAggregatedJobsCost
} from './service/kitchen-project-summary.utils';
import { KitchenProjectPricingFacade } from './service/kitchen-project-pricing.facade';
import { KitchenProjectWorkflowFacade } from './service/kitchen-project-workflow.facade';
import { KitchenProjectExportFacade } from './service/kitchen-project-export.facade';
import { KitchenProjectStatusFacade } from './service/kitchen-project-status.facade';
import { KitchenWorkspaceActionsFacade } from './service/kitchen-workspace-actions.facade';
import { KitchenPageHeaderComponent } from './page-header/kitchen-page-header.component';
import { KitchenCabinetsSectionComponent } from './cabinets-section/kitchen-cabinets-section.component';
import { KitchenWorkspaceSectionComponent } from './workspace-section/kitchen-workspace-section.component';
import { KitchenCostsSectionComponent } from './costs-section/kitchen-costs-section.component';
import { KitchenPageFooterComponent } from './page-footer/kitchen-page-footer.component';
import { KitchenBomTranslationsService } from './service/kitchen-bom-translations.service';
import { buildCalculationViewState, buildPricingViewStateFromResult, createEmptyCalculationViewState } from './kitchen-page-view-state';

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

// TODO R.13: Consider ChangeDetectionStrategy.OnPush after migrating remaining mutable fields to signals.
// Today several values below are still plain class fields updated from async callbacks.
// With OnPush that would require manual markForCheck() calls in a few places.
// Moving those fields to signals would make this component much easier to optimize safely.
@Component({
  selector: 'app-kitchen-page',
  templateUrl: './kitchen-page.component.html',
  styleUrls: ['./kitchen-page.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    KitchenPageHeaderComponent,
    KitchenCabinetsSectionComponent,
    KitchenWorkspaceSectionComponent,
    KitchenCostsSectionComponent,
    KitchenPageFooterComponent
  ]
})
export class KitchenPageComponent {

  // TODO(CODEX): This component still coordinates too many screen-level concerns. It is much lighter than before, but project workflow, pricing, export and dialogs can still be separated further into smaller feature services if this screen keeps growing.
  private stateService = inject(KitchenStateService);
  private pricingFacade = inject(KitchenProjectPricingFacade);
  private projectWorkflowFacade = inject(KitchenProjectWorkflowFacade);
  private projectExportFacade = inject(KitchenProjectExportFacade);
  private projectStatusFacade = inject(KitchenProjectStatusFacade);
  private workspaceActionsFacade = inject(KitchenWorkspaceActionsFacade);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private errorHandler = inject(ApiErrorHandler);
  private bomTranslationsService = inject(KitchenBomTranslationsService);
  private languageService = inject(LanguageService);
  private destroyRef = inject(DestroyRef);

  // Single cabinet calculation result shown in the sidebar detail panel
  // (not the same as projectResult which is a multi-wall aggregation)
  result: CabinetResponse | null = null;
  editingCabinet: KitchenCabinet | null = null;

  // Stan kalkulacji projektu (multi-wall)
  projectResult: MultiWallCalculateResponse | null = null;
  isCalculatingProject = false;

  // Active tab in project details panel
  activeDetailsTab: 'walls' | 'boards' | 'components' | 'jobs' | 'pricing' = 'walls';

  // Wycena projektu
  pricing: PricingBreakdown | null = null;
  isPricingLoading = false;
  isPricingSaving = false;
  isPdfDownloading = false;
  private lastOfferOptions: import('./service/project-pricing.service').OfferOptionsRequest = {
    showCostDetails: true,
    frontDescription: '',
    countertopDescription: '',
    hardwareDescription: 'Blum'
  };
  pricingDiscountPct = 0;
  pricingManualOverrideEnabled = false;
  pricingManualOverride: number | null = null;
  pricingOfferNotes = '';

  // Aggregated data used by project detail tabs
  aggregatedBoards: AggregatedBoard[] = [];
  aggregatedComponents: AggregatedComponent[] = [];
  aggregatedJobs: AggregatedJob[] = [];

  // Koszt odpadu (SHEET_WASTE) - opcjonalnie wliczany
  includeWasteCost = false;
  totalWasteCost = 0;
  wasteDetails: AggregatedComponent[] = [];

  // Pricing warnings for missing catalog prices (pricingComplete=false)
  pricingWarnings: string[] = [];

  // Stan eksportu Excel
  isExporting = false;

  // Stan zapisywania projektu
  isSavingProject = false;
  isChangingStatus = false;

  /**
   * Backend translation dictionary for BOARD_NAME.* and MATERIAL.* keys.
   * Used both in BOM aggregation and Excel export.
   */
  private bomTranslations: Record<string, string> = {};

  constructor() {
    // Keep BOM translations in sync with the active UI language.
    // The dedicated service encapsulates the language -> dictionary lookup pipeline.
    // takeUntilDestroyed keeps the subscription local to this screen instance.
    this.bomTranslationsService.watchTranslations().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((translations: Record<string, string>) => {
      this.bomTranslations = translations;
    });
  }

  // Sync wall-level config with global signals when selected wall changes

  // Sync wall-level config with global signals when selected wall changes
  private syncEffect = effect(() => {
    const wallId = this.selectedWallId();
    if (!wallId) return;

    // Synchronizuj plinth z feetType
    const plinthConfig = this.stateService.getPlinthConfig(wallId);
    if (plinthConfig?.enabled) {
      const feetOption = FEET_TYPE_OPTIONS.find(o => o.value === plinthConfig.feetType);
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
    if (!projectId || this.isChangingStatus) return;

    this.isChangingStatus = true;

    this.projectStatusFacade.changeStatus(projectId, newStatus).subscribe({
      next: ({ projectInfo, successMessage }) => {
        this.stateService.setProjectInfo(
          projectInfo.id, projectInfo.name, projectInfo.version,
          projectInfo.description, projectInfo.status, projectInfo.allowedTransitions,
          projectInfo.clientName, projectInfo.clientPhone, projectInfo.clientEmail
        );
        this.isChangingStatus = false;
        this.toast.success(successMessage);
      },
      error: (err) => {
        console.error('Error changing project status:', err);
        this.isChangingStatus = false;
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
        this.stateService.addWall(result.type, result.widthMm, result.heightMm);
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

  onCloneCabinet(cabinetId: string): void {
    this.stateService.cloneCabinet(cabinetId);
    this.resetProjectResult();
  }

  clearAll(): void {
    this.workspaceActionsFacade.confirmAndClearAll().subscribe(cleared => {
      if (!cleared) return;
      this.result = null;
      this.editingCabinet = null;
      this.resetProjectResult();
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
    const isUpdate = this.currentProjectId() !== null;

    const dialogRef = this.dialog.open(SaveProjectDialogComponent, {
      data: {
        projectName: this.currentProjectName() || '',
        projectDescription: this.currentProjectDescription() || '',
        clientName: this.stateService.currentProjectClientName() || '',
        clientPhone: this.stateService.currentProjectClientPhone() || '',
        clientEmail: this.stateService.currentProjectClientEmail() || '',
        isUpdate
      } as SaveProjectDialogData,
      width: '500px'
    });

    dialogRef.afterClosed().subscribe((result: SaveProjectDialogResult | undefined) => {
      if (!result) return;

      this.isSavingProject = true;

      this.projectWorkflowFacade.saveProject(this.currentProjectId(), result, {
        buildCreateRequest: dialogResult => this.stateService.buildMultiWallProjectRequest(
          dialogResult.name,
          dialogResult.description,
          dialogResult.clientName,
          dialogResult.clientPhone,
          dialogResult.clientEmail
        ),
        buildUpdateRequest: dialogResult => this.stateService.buildUpdateProjectRequest(
          dialogResult.name,
          dialogResult.description,
          dialogResult.clientName,
          dialogResult.clientPhone,
          dialogResult.clientEmail
        )
      }).subscribe({
        next: ({ projectInfo, successMessage }) => {
          this.stateService.setProjectInfo(
            projectInfo.id,
            projectInfo.name,
            projectInfo.version,
            projectInfo.description,
            projectInfo.status,
            projectInfo.allowedTransitions,
            projectInfo.clientName,
            projectInfo.clientPhone,
            projectInfo.clientEmail
          );
          this.isSavingProject = false;
          this.toast.success(successMessage);
        },
        error: (err) => {
          console.error('Error saving project:', err);
          this.isSavingProject = false;
          this.errorHandler.handle(err);
        }
      });
    });
  }

  // ============ PROJECT CALCULATION ============

  /** Runs multi-wall project calculation for the current workspace. */
  calculateProject(): void {
    if (this.totalCabinetCount() === 0) {
      this.toast.error('Dodaj przynajmniej jedna szafke do projektu');
      return;
    }

    this.isCalculatingProject = true;
    this.projectResult = null;

    const request = this.stateService.buildMultiWallCalculateRequest();

    this.projectWorkflowFacade.calculateProject(request, this.stateService.walls(), this.bomTranslations).subscribe({
      next: ({ response, aggregation, pricingWarnings }) => {
        Object.assign(this, buildCalculationViewState({ response, aggregation, pricingWarnings }));
        this.isCalculatingProject = false;

        if (this.pricingWarnings.length > 0) {
          this.toast.warning('Brak cen katalogowych dla: ' + this.pricingWarnings.join(', ') + '. Kwoty moga byc zanizone.');
        }
      },
      error: (err) => {
        console.error('Multi-wall calculation error:', err);
        this.errorHandler.handle(err);
        this.isCalculatingProject = false;
      }
    });
  }

  private resetProjectResult(): void {
    Object.assign(this, createEmptyCalculationViewState());
  }

  // ============ WYCENA PROJEKTU ============

  loadPricing(): void {
    const id = this.currentProjectId();
    if (!id) return;
    this.isPricingLoading = true;
    this.pricingFacade.loadPricing(id).subscribe({
      next: result => {
        Object.assign(this, buildPricingViewStateFromResult(result));
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
    this.pricingFacade.savePricing(id, {
      discountPct: this.pricingDiscountPct,
      manualOverrideEnabled: this.pricingManualOverrideEnabled,
      manualOverride: this.pricingManualOverride,
      offerNotes: this.pricingOfferNotes
    }).subscribe({
      next: result => {
        Object.assign(this, buildPricingViewStateFromResult(result));
        this.isPricingSaving = false;
      },
      error: () => {
        this.isPricingSaving = false;
      }
    });
  }

  downloadOfferPdf(): void {
    const id = this.currentProjectId();
    if (!id) return;

    // Warn about missing BOM prices, but do not block PDF generation.
    const priceWarning = this.validateBomPrices();
    if (priceWarning) {
      this.toast.warning(priceWarning);
    }

    const dialogRef = this.dialog.open(OfferOptionsDialogComponent, {
      width: '480px',
      data: this.lastOfferOptions
    });
    dialogRef.afterClosed().subscribe(options => {
      if (!options) return; // user cancelled
      this.lastOfferOptions = options; // persist for next opening

      this.isPdfDownloading = true;
      this.projectExportFacade.downloadOfferPdf({ projectId: id, options }).subscribe({
        next: () => {
          this.isPdfDownloading = false;
        },
        error: () => {
          this.isPdfDownloading = false;
        }
      });
    });
  }

  /** Total project cost with optional waste cost included. */
  get adjustedTotalCost(): number {
    return calculateAdjustedTotalCost(this.projectResult, this.includeWasteCost);
  }

  /** Component cost with optional waste cost included. */
  get adjustedComponentCost(): number {
    return calculateAdjustedComponentCost(this.projectResult, this.includeWasteCost);
  }

  /** Sum of all aggregated board costs. */
  get totalAggregatedBoardsCost(): number {
    return sumAggregatedBoardsCost(this.aggregatedBoards);
  }

  /** Sum of all aggregated component costs. */
  get totalAggregatedComponentsCost(): number {
    return sumAggregatedComponentsCost(this.aggregatedComponents, this.includeWasteCost);
  }

  /** Sum of all aggregated job costs. */
  get totalAggregatedJobsCost(): number {
    return sumAggregatedJobsCost(this.aggregatedJobs);
  }

  // ============ EXCEL EXPORT ===========

  /** Returns a warning when BOM contains items with missing catalog prices. */
  private validateBomPrices(): string | null {
    return this.projectExportFacade.getBomPriceWarning(this.aggregatedBoards, this.aggregatedComponents, this.aggregatedJobs);
  }

  /** Exports current aggregated boards as an Excel order file. */
  downloadExcel(): void {
    if (!this.projectResult || this.isExporting) return;

    const priceWarning = this.validateBomPrices();
    if (priceWarning) {
      this.toast.warning(priceWarning);
    }

    this.isExporting = true;
    this.projectExportFacade.exportExcel({
      boards: this.aggregatedBoards,
      bomTranslations: this.bomTranslations,
      fallbackMaterialNames: MATERIAL_NAMES_PL,
      projectName: this.stateService.currentProjectName(),
      language: this.languageService.lang()
    }).subscribe({
      next: () => {
        this.isExporting = false;
      },
      error: () => {
        this.isExporting = false;
        this.toast.error('Blad podczas generowania pliku Excel');
      }
    });
  }
}

