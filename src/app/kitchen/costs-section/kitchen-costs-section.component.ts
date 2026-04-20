import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AggregatedBoard, AggregatedComponent, AggregatedJob } from '../service/project-details-aggregator.service';
import { MultiWallCalculateResponse, WallCalculationSummary } from '../model/kitchen-project.model';
import { PricingBreakdown } from '../service/project-pricing.service';

type DetailsTab = 'walls' | 'boards' | 'components' | 'jobs' | 'pricing';

@Component({
  selector: 'app-kitchen-costs-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  @Input() isCalculatingProject = false;

  @Input() pricingWarnings: string[] = [];
  @Input() aggregatedBoards: AggregatedBoard[] = [];
  @Input() aggregatedComponents: AggregatedComponent[] = [];
  @Input() aggregatedJobs: AggregatedJob[] = [];
  @Input() wasteDetails: AggregatedComponent[] = [];

  @Input() totalAggregatedBoardsCost = 0;
  @Input() totalAggregatedComponentsCost = 0;
  @Input() totalAggregatedJobsCost = 0;
  @Input() adjustedComponentCost = 0;
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
  @Output() pricingDiscountPctChange = new EventEmitter<number>();
  @Output() pricingManualOverrideEnabledChange = new EventEmitter<boolean>();
  @Output() pricingManualOverrideChange = new EventEmitter<number | null>();
  @Output() pricingOfferNotesChange = new EventEmitter<string>();
  @Output() savePricing = new EventEmitter<void>();
  @Output() downloadOfferPdf = new EventEmitter<void>();

  // TODO(CODEX): Ta sekcja nadal łączy trzy różne odpowiedzialności:
  // pre-calculation summary, BOM tabs i workflow wyceny/oferty. To już dużo lepiej
  // niż w KitchenPageComponent, ale przy dalszym rozwoju warto będzie rozdzielić
  // przynajmniej pricing tab od reszty kosztorysu, żeby zmniejszyć ryzyko regresji.

  readonly trackByIndex = (index: number) => index;
  readonly trackByWall = (_: number, wall: WallCalculationSummary) => wall.wallType;

  setActiveTab(tab: DetailsTab): void {
    this.activeDetailsTabChange.emit(tab);
    if (tab === 'pricing') {
      this.pricingTabRequested.emit();
    }
  }

  onIncludeWasteCostChange(value: boolean): void {
    this.includeWasteCostChange.emit(value);
  }

  onPricingDiscountPctChange(value: string | number): void {
    this.pricingDiscountPctChange.emit(Number(value));
  }

  onPricingManualOverrideEnabledChange(value: boolean): void {
    this.pricingManualOverrideEnabledChange.emit(value);
  }

  onPricingManualOverrideChange(value: string | number): void {
    if (value === '' || value === null) {
      this.pricingManualOverrideChange.emit(null);
      return;
    }
    this.pricingManualOverrideChange.emit(Number(value));
  }

  onPricingOfferNotesChange(value: string): void {
    this.pricingOfferNotesChange.emit(value);
  }
}
