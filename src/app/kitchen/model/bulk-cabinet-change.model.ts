import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { FieldErrorDetail } from '../../core/error/api-error.model';
import { FrontMountingType } from '../cabinet-form/model/front-mounting.model';
import { OpeningType } from '../cabinet-form/model/kitchen-cabinet-constants';
import { MaterialPresetResponse } from '../service/material-preset.service';

export type BulkChangeScope = 'WALL' | 'PROJECT';

/** Materiał szafek: bez zmian, z projektu (bez nadpisania) albo preset materiałowy. */
export type BulkMaterialChange =
  | { mode: 'KEEP' }
  | { mode: 'PROJECT' }
  | { mode: 'PRESET'; preset: MaterialPresetResponse };

/** Masowa zmiana szafek; `null` w polu — bez zmian. */
export interface BulkCabinetChange {
  scope: BulkChangeScope;
  openingType: OpeningType | null;
  frontMountingType: FrontMountingType | null;
  material: BulkMaterialChange;
}

/** Wynik przeliczenia jednej szafki (backend: `POST /kitchen/cabinets/calculate`). */
export interface CabinetCalculationResult {
  cabinetId: string;
  result?: CabinetResponse;
  errors?: FieldErrorDetail[];
}

export interface BulkChangeReportItem {
  cabinetId: string;
  label: string;
  reasons: string[];
}

export interface BulkChangeReport {
  changed: number;
  unchanged: number;
  /** Zmiana, której szafka nie obsługuje (np. typ bez frontów wpuszczanych) — to pole szafki bez zmian. */
  skipped: BulkChangeReportItem[];
  /** Szafka po zmianie nie przeszła kalkulacji — zostaje bez zmian. */
  failed: BulkChangeReportItem[];
}
