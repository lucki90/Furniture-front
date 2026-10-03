import { MultiWallCalculateResponse } from '../model/kitchen-project.model';
import { GrainAxis } from '../../shared/model/grain-direction';

export interface AggregatedBoard {
  /** Klucz grupowania; dla dodatków ściany techniczny (`BLAT_LAMINATE`) — do wyświetlenia służy `boardLabel`. */
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
  /** Czytelna nazwa materiału (np. „Laminat”), gdy `material` jest kluczem technicznym — kolumna symbolu w Excelu. */
  materialName?: string;
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
