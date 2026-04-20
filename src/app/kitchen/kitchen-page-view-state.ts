import { PricingFormState, PricingLoadResult } from './service/kitchen-project-pricing.facade';
import { KitchenProjectCalculationResult } from './service/kitchen-project-workflow.facade';
import { AggregatedBoard, AggregatedComponent, AggregatedJob } from './service/project-details-aggregator.service';
import { MultiWallCalculateResponse } from './model/kitchen-project.model';
import { PricingBreakdown } from './service/project-pricing.service';

export interface KitchenPageCalculationViewState {
  projectResult: MultiWallCalculateResponse | null;
  aggregatedBoards: AggregatedBoard[];
  aggregatedComponents: AggregatedComponent[];
  aggregatedJobs: AggregatedJob[];
  totalWasteCost: number;
  wasteDetails: AggregatedComponent[];
  pricing: PricingBreakdown | null;
  pricingWarnings: string[];
}

export interface KitchenPagePricingViewState {
  pricing: PricingBreakdown | null;
  pricingDiscountPct: number;
  pricingManualOverrideEnabled: boolean;
  pricingManualOverride: number | null;
  pricingOfferNotes: string;
}

export function createEmptyCalculationViewState(): KitchenPageCalculationViewState {
  return {
    projectResult: null,
    aggregatedBoards: [],
    aggregatedComponents: [],
    aggregatedJobs: [],
    totalWasteCost: 0,
    wasteDetails: [],
    pricing: null,
    pricingWarnings: []
  };
}

export function buildCalculationViewState(
  result: KitchenProjectCalculationResult
): KitchenPageCalculationViewState {
  return {
    projectResult: result.response,
    aggregatedBoards: result.aggregation.boards,
    aggregatedComponents: result.aggregation.components,
    aggregatedJobs: result.aggregation.jobs,
    totalWasteCost: result.aggregation.wasteCost,
    wasteDetails: result.aggregation.wasteDetails,
    pricing: null,
    pricingWarnings: result.pricingWarnings
  };
}

export function buildPricingViewState(
  breakdown: PricingBreakdown,
  formState: PricingFormState
): KitchenPagePricingViewState {
  return {
    pricing: breakdown,
    pricingDiscountPct: formState.discountPct,
    pricingManualOverrideEnabled: formState.manualOverrideEnabled,
    pricingManualOverride: formState.manualOverride,
    pricingOfferNotes: formState.offerNotes
  };
}

export function buildPricingViewStateFromResult(result: PricingLoadResult): KitchenPagePricingViewState {
  return buildPricingViewState(result.breakdown, result.formState);
}
