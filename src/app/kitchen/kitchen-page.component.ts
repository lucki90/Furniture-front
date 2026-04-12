import { Component, inject, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { KitchenLayoutComponent } from "./kitchen-layout/kitchen-layout.component";
import { CabinetFormComponent } from "./cabinet-form/cabinet-form.component";
import { KitchenCabinetListComponent } from './cabinet-list/kitchen-cabinet-list.component';
import { KitchenFloorPlanComponent } from './floor-plan/kitchen-floor-plan.component';
import { AddWallDialogComponent, AddWallDialogData, AddWallDialogResult } from './add-wall-dialog/add-wall-dialog.component';
import { SaveProjectDialogComponent, SaveProjectDialogData, SaveProjectDialogResult } from './save-project-dialog/save-project-dialog.component';
import { OfferOptionsDialogComponent } from './offer-options-dialog/offer-options-dialog.component';
import { KitchenStateService } from './service/kitchen-state.service';
import { KitchenService } from './service/kitchen.service';
import { ProjectDetailsAggregatorService, AggregatedBoard, AggregatedComponent, AggregatedJob } from './service/project-details-aggregator.service';
import { CabinetCalculatedEvent, KitchenCabinet } from './model/kitchen-state.model';
import { FEET_TYPE_OPTIONS } from './model/plinth.model';
import { MultiWallCalculateResponse, ProjectStatus, getStatusLabel, getStatusColor, PROJECT_STATUSES } from './model/kitchen-project.model';
import { Board, CabinetResponse, Component as CabinetComponent, Job } from './cabinet-form/model/kitchen-cabinet-form.model';
import { ToastService } from '../core/error/toast.service';
import { ConfirmDialogService } from '../shared/confirm-dialog/confirm-dialog.service';
import { WallConfigComponent } from './wall-config/wall-config.component';
import { ExcelService, ExcelRowRequest } from './service/excel.service';
import { ProjectPricingService, PricingBreakdown, UpdatePricingRequest } from './service/project-pricing.service';
import { LanguageService } from '../service/language.service';
import { TranslationService } from '../translation/translation.service';

// Polskie fallback-i nazw materiałów — używane gdy tłumaczenia z backendu nie są jeszcze załadowane.
// Tłumaczenia MATERIAL.* są w DB (10-insert-translations.sql + 25-board-name-translations.sql).
// Preload odbywa się w translationLoadEffect() przez bomTranslations — patrz niżej.
/** Polish fallback translations for raw material codes (Excel Symbol column). */
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

// TODO R.13: Dodać ChangeDetectionStrategy.OnPush po migracji pól na sygnały.
// Aktualnie result, projectResult, aggregatedBoards/Components/Jobs, isCalculatingProject
// itp. są zwykłymi polami klasy — zmiany w HTTP callbackach nie wyzwolą CD z OnPush
// bez inject(ChangeDetectorRef).markForCheck(). Migracja do signal() uprości to znacznie.
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
    KitchenFloorPlanComponent,
    WallConfigComponent
  ]
})
export class KitchenPageComponent {

  private stateService = inject(KitchenStateService);
  private kitchenService = inject(KitchenService);
  private aggregatorService = inject(ProjectDetailsAggregatorService);
  private excelService = inject(ExcelService);
  private pricingService = inject(ProjectPricingService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private languageService = inject(LanguageService);
  private translationService = inject(TranslationService);
  private destroyRef = inject(DestroyRef);

  // Single cabinet calculation result shown in the sidebar detail panel
  // (not the same as projectResult which is a multi-wall aggregation)
  result: CabinetResponse | null = null;
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

  // trackBy helpers — zapobiegają niepotrzebnemu re-renderowaniu list przy CD
  protected trackByIndex = (index: number) => index;
  protected trackByWall = (_: number, wall: import('./model/kitchen-project.model').WallCalculationSummary) => wall.wallType;

  /**
   * Tłumaczenia BOM (BOARD_NAME.* i MATERIAL.*) załadowane z backendu w bieżącym języku.
   * Klucze: "BOARD_NAME.SIDE_NAME", "MATERIAL.CHIPBOARD" itp.
   * Używane w aggregate() (board labels) i downloadExcel() (symbol kolumna).
   */
  private bomTranslations: Record<string, string> = {};

  constructor() {
    // Ładuje tłumaczenia BOM przy każdej zmianie języka.
    // toObservable + switchMap anuluje poprzedni request przy szybkiej zmianie języka
    // — eliminuje memory leak który powstawał przy effect() + subscribe().
    toObservable(this.languageService.lang).pipe(
      switchMap(lang => this.translationService.getByCategories(['BOARD_NAME', 'MATERIAL'], lang)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(translations => {
      this.bomTranslations = translations;
    });
  }

  // Synchronizacja wall-level config → global signals przy zmianie ściany
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
  // Gettery/settery przeniesione do WallConfigComponent (R.2.5).
  // Handler emitowanego zdarzenia:
  onWallConfigChanged(): void {
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
          response.description, response.status, response.allowedTransitions,
          response.clientName, response.clientPhone, response.clientEmail
        );
        this.isChangingStatus = false;
        this.toast.success(`Status zmieniony na: ${getStatusLabel(response.status)}`);
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
      this.toast.error('Wszystkie typy ścian zostały już dodane');
      return;
    }

    const dialogRef = this.dialog.open(AddWallDialogComponent, {
      data: { availableTypes } as AddWallDialogData,
      width: '400px'
    });

    dialogRef.afterClosed().subscribe((result: AddWallDialogResult | undefined) => {
      if (result) {
        this.stateService.addWall(result.type, result.widthMm, result.heightMm);
        this.toast.success(`Dodano ścianę: ${this.stateService.getWallLabel(result.type)}`);
        this.resetProjectResult();
      }
    });
  }

  onWallRemoved(wallId: string): void {
    const wall = this.walls().find(w => w.id === wallId);
    if (!wall) return;

    const doRemove = () => {
      this.stateService.removeWall(wallId);
      this.toast.success('Ściana została usunięta');
      this.resetProjectResult();
    };

    if (wall.cabinets.length > 0) {
      this.confirmDialog.confirm({
        message: `Ściana "${this.stateService.getWallLabel(wall.type)}" zawiera ${wall.cabinets.length} szafek. Czy na pewno chcesz ją usunąć?`,
        confirmText: 'Usuń'
      }).subscribe(confirmed => { if (confirmed) doRemove(); });
    } else {
      doRemove();
    }
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

  onWallChange(): void {
    // This is now handled by the setters for wallLength and wallHeight
    this.resetProjectResult();
  }

  clearAll(): void {
    this.confirmDialog.confirm({
      message: 'Czy na pewno chcesz usunąć wszystkie ściany i szafki?',
      confirmText: 'Usuń wszystko'
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.stateService.clearAll();
      this.result = null;
      this.editingCabinet = null;
      this.resetProjectResult();
    });
  }

  clearSelectedWallCabinets(): void {
    const wall = this.selectedWall();
    if (!wall || wall.cabinets.length === 0) return;

    this.confirmDialog.confirm({
      message: `Czy na pewno chcesz usunąć wszystkie szafki ze ściany "${this.selectedWallLabel}"?`,
      confirmText: 'Usuń szafki'
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.stateService.clearSelectedWallCabinets();
      this.resetProjectResult();
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

      if (isUpdate && this.currentProjectId()) {
        // Aktualizacja istniejącego projektu
        const request = this.stateService.buildUpdateProjectRequest(result.name, result.description, result.clientName, result.clientPhone, result.clientEmail);

        this.kitchenService.updateProject(this.currentProjectId()!, request).subscribe({
          next: (response) => {
            this.stateService.setProjectInfo(response.id, response.name, response.version, result.description, response.status, response.allowedTransitions, result.clientName, result.clientPhone, result.clientEmail);
            this.isSavingProject = false;
            this.toast.success('Projekt został zaktualizowany');
          },
          error: (err) => {
            console.error('Error updating project:', err);
            this.isSavingProject = false;
            this.toast.showHttpError(err);
          }
        });
      } else {
        // Tworzenie nowego projektu
        const request = this.stateService.buildMultiWallProjectRequest(result.name, result.description, result.clientName, result.clientPhone, result.clientEmail);

        this.kitchenService.createProject(request).subscribe({
          next: (response) => {
            this.stateService.setProjectInfo(response.id, response.name, response.version, result.description, response.status, response.allowedTransitions, result.clientName, result.clientPhone, result.clientEmail);
            this.isSavingProject = false;
            this.toast.success('Projekt został zapisany');
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
        const agg = this.aggregatorService.aggregate(response, this.stateService.walls(), this.bomTranslations);
        this.aggregatedBoards = agg.boards;
        this.aggregatedComponents = agg.components;
        this.aggregatedJobs = agg.jobs;
        this.totalWasteCost = agg.wasteCost;
        this.wasteDetails = agg.wasteDetails;
        this.isCalculatingProject = false;
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

  downloadOfferPdf(): void {
    const id = this.currentProjectId();
    if (!id) return;

    // Ostrzeżenie o brakujących cenach — nie blokuje, tylko informuje
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
      this.pricingService.downloadOfferPdf(id, options).subscribe({
        next: (response) => {
          const blob = response.body;
          if (!blob) { this.isPdfDownloading = false; return; }

          // Extract filename from Content-Disposition header
          const disposition = response.headers.get('Content-Disposition');
          let filename = 'oferta.pdf';
          if (disposition) {
            const match = disposition.match(/filename="?([^";\n]+)"?/);
            if (match?.[1]) filename = match[1];
          }

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          this.isPdfDownloading = false;
        },
        error: () => {
          this.isPdfDownloading = false;
        }
      });
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
   * Sprawdza czy w BOM są pozycje bez ustawionych cen (unitCost === 0).
   * Zwraca komunikat ostrzeżenia lub null jeśli wszystko OK.
   */
  private validateBomPrices(): string | null {
    const boardsMissing = this.aggregatedBoards.filter(b => !b.unitCost || b.unitCost === 0).length;
    const componentsMissing = this.aggregatedComponents
      .filter(c => !c.isWaste && (!c.unitCost || c.unitCost === 0)).length;
    const jobsMissing = this.aggregatedJobs.filter(j => !j.unitCost || j.unitCost === 0).length;

    const parts: string[] = [];
    if (boardsMissing > 0) parts.push(`${boardsMissing} płyt`);
    if (componentsMissing > 0) parts.push(`${componentsMissing} komponentów`);
    if (jobsMissing > 0) parts.push(`${jobsMissing} prac`);

    if (parts.length === 0) return null;
    return `Brak cen dla: ${parts.join(', ')}. Wycena będzie niepełna.`;
  }

  /**
   * Generuje plik Excel z listą płyt do zamówienia (zamówienie_cięcia).
   * Wysyła zagregowane płyty do backendu → POST /download/excel → plik .xlsx.
   *
   * Kolumna "Uwagi" jest gotowa w szablonie — wypełnienie automatyczne w kolejnej iteracji
   * (np. "2 puszki ø35mm na boku 400mm", "rzaz na boku 450mm").
   */
  downloadExcel(): void {
    if (!this.projectResult || this.isExporting) return;

    const priceWarning = this.validateBomPrices();
    if (priceWarning) {
      this.toast.warning(priceWarning);
    }

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
        // Symbol = kolor płyty (np. "RAL 9016", "Dąb"); fallback: przetłumaczona nazwa materiału
        symbol: board.color || (board.material
          ? (this.bomTranslations['MATERIAL.' + board.material] ?? MATERIAL_NAMES_PL[board.material] ?? board.material)
          : ''),
        thickness: board.thickness,
        // sideY = wysokość płyty = kierunek słoja (długość)
        length: board.height,
        lengthVeneer: board.veneerY ?? 0,   // liczba okleinowanych krawędzi (kierunek długości)
        width: board.width,
        widthVeneer: board.veneerX ?? 0,    // liczba okleinowanych krawędzi (kierunek szerokości)
        veneerColor: board.veneerColor ?? '',
        sticker,
        remarks: board.remarks ?? '',
        veneerEdgeLabel: board.veneerEdgeLabel ?? ''
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

    this.excelService.downloadBoardList(rows, filename, this.languageService.lang()).subscribe({
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
