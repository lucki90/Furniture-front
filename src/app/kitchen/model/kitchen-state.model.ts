import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { OpeningType } from '../cabinet-form/model/kitchen-cabinet-constants';

export interface KitchenCabinet {
  id: string;
  type: KitchenCabinetType;
  openingType: OpeningType;
  width: number;
  height: number;
  depth: number;
  shelfQuantity: number;
  calculatedResult?: CabinetCalculationResult;
}

export interface CabinetCalculationResult {
  totalCost: number;
  boardCosts: number;
  componentCosts: number;
  jobCosts: number;
}

export interface KitchenWallConfig {
  length: number;
  height: number;
}

export interface CabinetPosition {
  cabinetId: string;
  x: number;
  width: number;
  height: number;
}

export interface CabinetFormData {
  kitchenCabinetType: KitchenCabinetType;
  openingType: OpeningType;
  width: number;
  height: number;
  depth: number;
  shelfQuantity: number;
  drawerQuantity?: number;
  drawerModel?: string | null;
}

export interface CabinetCalculatedEvent {
  formData: CabinetFormData;
  result: any;
  editingCabinetId?: string;
}
