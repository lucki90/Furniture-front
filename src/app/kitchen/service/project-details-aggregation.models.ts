import { MultiWallCalculateResponse } from '../model/kitchen-project.model';

export interface AggregatedBoard {
  material: string;
  thickness: number;
  width: number;
  height: number;
  quantity: number;
  unitCost: number;
  totalCost: number;
  color?: string;
  veneerX?: number;
  veneerY?: number;
  veneerColor?: string;
  boardLabel?: string;
  cabinetRefs?: string[];
  remarks?: string;
  veneerEdgeLabel?: string;
}

export interface AggregatedComponent {
  name: string;
  type: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  isWaste?: boolean;
}

export interface AggregatedJob {
  name: string;
  type: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface AggregationResult {
  boards: AggregatedBoard[];
  components: AggregatedComponent[];
  jobs: AggregatedJob[];
  wasteCost: number;
  wasteDetails: AggregatedComponent[];
}

export interface AggregationMaps {
  boards: Map<string, AggregatedBoard>;
  components: Map<string, AggregatedComponent>;
  jobs: Map<string, AggregatedJob>;
}

export interface AggregationState {
  maps: AggregationMaps;
  globalCabinetIdx: number;
  bomTranslations?: Record<string, string>;
}

export type PriceEntryLike = { price?: number | null } | null | undefined;
export type ComponentLike = {
  category: string;
  model: string;
  quantity: number;
  totalPrice?: number | null;
  priceEntry?: PriceEntryLike;
};
export type JobLike = {
  category: string;
  type: string;
  quantity: number;
  totalPrice: number;
  priceEntry?: PriceEntryLike;
};
export type CabinetLike = MultiWallCalculateResponse['walls'][number]['cabinets'][number];
export type WallLike = MultiWallCalculateResponse['walls'][number];
