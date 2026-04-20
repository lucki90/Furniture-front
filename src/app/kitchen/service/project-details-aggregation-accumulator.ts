import { MultiWallCalculateResponse } from '../model/kitchen-project.model';
import {
  AggregatedBoard,
  AggregatedComponent,
  AggregatedJob,
  AggregationMaps,
  AggregationResult
} from './project-details-aggregation.models';

export class ProjectDetailsAggregationAccumulator {
  createMaps(): AggregationMaps {
    return {
      boards: new Map<string, AggregatedBoard>(),
      components: new Map<string, AggregatedComponent>(),
      jobs: new Map<string, AggregatedJob>()
    };
  }

  addBoard(map: Map<string, AggregatedBoard>, board: AggregatedBoard): void {
    const key = [
      board.material,
      board.thickness,
      board.width,
      board.height,
      board.color ?? '',
      board.veneerX ?? 0,
      board.veneerY ?? 0,
      board.veneerColor ?? ''
    ].join('_');

    const existing = map.get(key);
    if (existing) {
      existing.quantity += board.quantity;
      existing.totalCost += board.totalCost;
      if (board.cabinetRefs?.length) {
        existing.cabinetRefs = [...(existing.cabinetRefs ?? []), ...board.cabinetRefs];
      }
      if (board.remarks && board.remarks !== existing.remarks) {
        existing.remarks = existing.remarks
          ? `${existing.remarks}; ${board.remarks}`
          : board.remarks;
      }
      return;
    }

    map.set(key, { ...board });
  }

  addComponent(map: Map<string, AggregatedComponent>, component: AggregatedComponent): void {
    const key = `${component.type}_${component.name}`;
    const existing = map.get(key);

    if (existing) {
      existing.quantity += component.quantity;
      existing.totalCost += component.totalCost;
      return;
    }

    map.set(key, { ...component });
  }

  addJob(map: Map<string, AggregatedJob>, job: AggregatedJob): void {
    const key = `${job.type}_${job.name}`;
    const existing = map.get(key);

    if (existing) {
      existing.quantity += job.quantity;
      existing.totalCost += job.totalCost;
      return;
    }

    map.set(key, { ...job });
  }

  buildResult(response: MultiWallCalculateResponse, maps: AggregationMaps): AggregationResult {
    const wasteDetails = this.buildWasteDetails(response);

    return {
      boards: Array.from(maps.boards.values()),
      components: [...Array.from(maps.components.values()), ...wasteDetails],
      jobs: Array.from(maps.jobs.values()),
      wasteCost: response.totalWasteCost ?? 0,
      wasteDetails
    };
  }

  private buildWasteDetails(response: MultiWallCalculateResponse): AggregatedComponent[] {
    return (response.globalWasteComponents ?? []).map(comp => ({
      name: comp.model,
      type: comp.category,
      quantity: comp.quantity,
      unitCost: comp.priceEntry?.price ?? 0,
      totalCost: comp.totalPrice,
      isWaste: true
    }));
  }
}
