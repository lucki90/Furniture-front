import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

export interface KitchenCabinet {
  id: string;
  type: KitchenCabinetType;
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
