import { Injectable } from '@angular/core';
import { CornerCountertopResponse, MultiWallCalculateResponse, WallCalculationSummary } from '../model/kitchen-project.model';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { AggregationState } from './project-details-aggregation.models';
import { ProjectDetailsAggregationAccumulator } from './project-details-aggregation-accumulator';
import { ProjectDetailsPricingWarningsCollector } from './project-details-pricing-warnings.collector';
import { ProjectDetailsWallAggregator } from './project-details-wall-aggregator';

/**
 * Aggregates boards, components and jobs from a multi-wall calculation response
 * into flat lists for display in the BOM tabs and Excel export.
 *
 * This class now acts as a facade over smaller collaborators responsible for:
 * - wall/cabinet aggregation,
 * - merge/accumulation of BOM rows,
 * - pricing warning collection.
 */
@Injectable({ providedIn: 'root' })
export class ProjectDetailsAggregatorService {
  private readonly accumulator = new ProjectDetailsAggregationAccumulator();
  private readonly pricingWarningsCollector = new ProjectDetailsPricingWarningsCollector();
  private readonly wallAggregator = new ProjectDetailsWallAggregator(this.accumulator);

  // TODO(FE-54): Frontend nadal buduje zagregowany BOM i część reguł produkcyjnych.
  // Docelowe przeniesienie źródła prawdy do backendu wymaga osobnej decyzji architektonicznej.
  aggregate(response: MultiWallCalculateResponse, frontendWalls: WallWithCabinets[], bomTranslations?: Record<string, string>) {
    const state = this.createAggregationState(bomTranslations);

    for (let wallIdx = 0; wallIdx < response.walls.length; wallIdx++) {
      this.wallAggregator.aggregateWall(response.walls[wallIdx], frontendWalls[wallIdx], state);
    }

    this.wallAggregator.aggregateCornerCountertops(response.cornerCountertops, state.maps);

    return this.accumulator.buildResult(response, state.maps);
  }

  collectPricingWarnings(wallResult: WallCalculationSummary): string[] {
    return this.pricingWarningsCollector.collectPricingWarnings(wallResult);
  }

  collectCornerCountertopPricingWarnings(cornerCountertops: CornerCountertopResponse[] | null | undefined): string[] {
    return this.pricingWarningsCollector.collectCornerCountertopPricingWarnings(cornerCountertops);
  }

  private createAggregationState(bomTranslations?: Record<string, string>): AggregationState {
    return {
      maps: this.accumulator.createMaps(),
      globalCabinetIdx: 0,
      bomTranslations
    };
  }
}

export type {
  AggregatedBoard,
  AggregatedComponent,
  AggregatedJob,
  AggregationResult
} from './project-details-aggregation.models';
