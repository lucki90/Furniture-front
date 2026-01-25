export interface KitchenWall {
  length: number;
  height: number;
}

export interface KitchenCabinetRequest {
  cabinetId: string;
  width: number;
  height: number;
}

export interface KitchenLayoutRequest {
  wall: KitchenWall;
  cabinets: KitchenCabinetRequest[];
}

export interface CabinetPosition {
  cabinetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KitchenLayoutResponse {
  wallLength: number;
  usedWidth: number;
  remainingWidth: number;
  fits: boolean;
  cabinets: CabinetPosition[];
}
