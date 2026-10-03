import { MultiWallCalculateResponse } from '../model/kitchen-project.model';
import { GrainAxis } from '../../shared/model/grain-direction';

export interface AggregatedBoard {
  /** Nazwa elementu lub etykieta dodatku, np. FRONT_NAME, BLAT_LAMINATE. */
  material: string;
  /** Właściwy materiał formatki z BoardDto; brak w starszych odpowiedziach. */
  boardMaterial?: string;
  boardMaterialLabel?: string;
  varnished?: boolean;
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
  /** Kierunek słoja w osiach `width` (= `sideX`) i `height` (= `sideY`). */
  grainAxis?: GrainAxis | null;
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
