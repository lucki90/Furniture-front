import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CabinetPlacementResponse, ProjectCabinetRequest } from './kitchen-project.model';

/**
 * Preset szafki (backend: `/kitchen/cabinet-presets`). Własny ma `name`, wbudowany `translationKey` (kategoria
 * `CABINET_PRESET`). `cabinet` ma kształt szafki zapisanego projektu — bez pozycji i materiałów.
 */
export interface CabinetPresetResponse {
  id: number;
  name?: string | null;
  translationKey?: string | null;
  system: boolean;
  kitchenCabinetType: KitchenCabinetType;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  cabinet: CabinetPlacementResponse;
}

export interface CreateCabinetPresetRequest {
  name: string;
  /** Szafka z kontraktu projektu; backend pomija pozycję, materiały, nazwę i identyfikator. */
  cabinet: ProjectCabinetRequest;
}

export interface CabinetPresetOption {
  preset: CabinetPresetResponse;
  label: string;
  /** `szer.×wys.×głęb.` w mm */
  dimensions: string;
}

/** Najwięcej szafek wstawianych naraz z formularza. */
export const MAX_INSERT_QUANTITY = 10;
