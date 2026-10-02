import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AggregatedBoard, AggregatedComponent, AggregatedJob } from '../service/project-details-aggregator.service';
import { CabinetSummary, MultiWallCalculateResponse, WallCalculationSummary } from '../model/kitchen-project.model';
import { PricingBreakdown } from '../service/project-pricing.service';
import { KitchenPricingTabComponent } from './kitchen-pricing-tab.component';
import { CuttingLayoutTabComponent } from './cutting-layout-tab.component';
import { CuttingLayoutResponse } from '../model/cutting-layout.model';
import { CabinetLabel } from '../service/kitchen-validation-error-options';

type DetailsTab = 'walls' | 'boards' | 'components' | 'jobs' | 'pricing';
type BomTab = 'boards' | 'components' | 'jobs' | 'cutting';

@Component({
  selector: 'app-kitchen-costs-section',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, KitchenPricingTabComponent, CuttingLayoutTabComponent],
  templateUrl: './kitchen-costs-section.component.html',
  styleUrls: ['./kitchen-costs-section.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenCostsSectionComponent {
  @Input() projectResult: MultiWallCalculateResponse | null = null;
  @Input() totalCabinetCount = 0;
  @Input() selectedWallLabel = '';
  @Input() selectedWallCabinetCount = 0;
  @Input() totalWidth = 0;
  @Input() fitsOnWall = true;
  @Input() remainingWidth = 0;
  @Input() selectedWallTotalCost = 0;
  @Input() wallsCount = 0;
  @Input() totalCost = 0;
  @Input() editingCabinetId: string | null = null;
  /** Etykiety szafek projektu według identyfikatora (`buildCabinetLabels`). */
  @Input() cabinetLabels: ReadonlyMap<string, CabinetLabel> = new Map();
  @Input() isCalculatingProject = false;

  @Input() pricingWarnings: string[] = [];
  @Input() aggregatedBoards: AggregatedBoard[] = [];
  @Input() aggregatedComponents: AggregatedComponent[] = [];
  @Input() aggregatedJobs: AggregatedJob[] = [];
  @Input() wasteDetails: AggregatedComponent[] = [];
  @Input() cuttingLayout: CuttingLayoutResponse | null = null;
  @Input() isCuttingLayoutLoading = false;
  @Input() cuttingLayoutError: string | null = null;

  @Input() totalAggregatedBoardsCost = 0;
  @Input() totalAggregatedComponentsCost = 0;
  @Input() totalAggregatedJobsCost = 0;
  @Input() adjustedTotalCost = 0;
  @Input() totalWasteCost = 0;

  @Input() includeWasteCost = false;

  @Input() activeDetailsTab: DetailsTab = 'walls';
  @Input() currentProjectId: number | null = null;
  @Input() pricing: PricingBreakdown | null = null;
  @Input() isPricingLoading = false;
  @Input() isPricingSaving = false;
  @Input() isPdfDownloading = false;
  @Input() pricingDiscountPct = 0;
  @Input() pricingManualOverrideEnabled = false;
  @Input() pricingManualOverride: number | null = null;
  @Input() pricingOfferNotes = '';

  @Output() calculateProject = new EventEmitter<void>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() includeWasteCostChange = new EventEmitter<boolean>();
  @Output() activeDetailsTabChange = new EventEmitter<DetailsTab>();
  @Output() pricingTabRequested = new EventEmitter<void>();
  @Output() cuttingTabRequested = new EventEmitter<void>();
  @Output() pricingDiscountPctChange = new EventEmitter<number>();
  @Output() pricingManualOverrideEnabledChange = new EventEmitter<boolean>();
  @Output() pricingManualOverrideChange = new EventEmitter<number | null>();
  @Output() pricingOfferNotesChange = new EventEmitter<string>();
  @Output() savePricing = new EventEmitter<void>();
  @Output() downloadOfferPdf = new EventEmitter<void>();

  /** Stan lokalny aktywnej podzakładki BOM-u; świadomie nie jest wejściem komponentu.
   *  Rodzic nadal zarządza wyłącznie ścianami i wyceną przez activeDetailsTab. */
  bomTab: BomTab = 'boards';

  setBomTab(tab: BomTab): void {
    this.bomTab = tab;
    if (tab === 'cutting') {
      this.cuttingTabRequested.emit();
    }
  }

  readonly trackByIndex = (index: number) => index;
  readonly trackByWall = (_: number, wall: WallCalculationSummary) => wall.wallType;
  readonly trackByCabinet = (_: number, cabinet: CabinetSummary) => cabinet.cabinetId ?? cabinet.kitchenCabinetType;

  /** Etykieta szafki w diagnostyce: numer i nazwa z karty ściany, bez nich — identyfikator albo typ. */
  cabinetDiagLabel(cabinet: CabinetSummary): string {
    const label = cabinet.cabinetId ? this.cabinetLabels.get(cabinet.cabinetId) : undefined;
    return label?.cabinet || cabinet.cabinetId || cabinet.kitchenCabinetType;
  }

  hasCountertopDiagnostics(wall: WallCalculationSummary): boolean {
    return (wall.countertop?.computedCountertopHeightMm ?? wall.countertop?.maxBaseCorpusHeightMm) != null;
  }

  hasEnclosureDiagnostics(wall: WallCalculationSummary): boolean {
    return (wall.cabinets ?? []).some(cabinet =>
      (cabinet.enclosureLeftOuterWidthMm ?? 0) > 0 || (cabinet.enclosureRightOuterWidthMm ?? 0) > 0
    );
  }

  setActiveTab(tab: DetailsTab): void {
    this.activeDetailsTabChange.emit(tab);
    if (tab === 'pricing') {
      this.pricingTabRequested.emit();
    }
  }

  onIncludeWasteCostChange(value: boolean): void {
    this.includeWasteCostChange.emit(value);
  }

  get displayedBoardsCost(): number {
    return this.totalAggregatedBoardsCost + (this.includeWasteCost ? this.totalWasteCost : 0);
  }

}
