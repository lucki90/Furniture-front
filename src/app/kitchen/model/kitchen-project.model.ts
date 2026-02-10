import { Board, Component, Job } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { OpeningType } from '../cabinet-form/model/kitchen-cabinet-constants';

/**
 * Request do kalkulacji całego projektu kuchni
 */
export interface KitchenProjectRequest {
  wall: KitchenWallRequest;
  cabinets: ProjectCabinetRequest[];
}

export interface KitchenWallRequest {
  length: number;
  height: number;
}

export interface ProjectCabinetRequest {
  cabinetId: string;
  kitchenCabinetType: KitchenCabinetType;
  openingType: OpeningType;
  height: number;
  width: number;
  depth: number;
  positionX: number;
  positionY: number;
  shelfQuantity: number;
  varnishedFront: boolean;
  materialRequest: MaterialRequest;
}

export interface MaterialRequest {
  boxMaterial: string;
  boxBoardThickness: number;
  boxColor: string;
  boxVeneerColor: string;
  frontMaterial: string;
  frontBoardThickness: number;
  frontColor: string;
  frontVeneerColor: string | null;
}

/**
 * Response z kalkulacji projektu kuchni
 */
export interface KitchenProjectResponse {
  wall: WallSummary;
  cabinets: CabinetSummary[];

  usedWidthBottom: number;
  remainingWidthBottom: number;
  usedWidthTop: number;
  remainingWidthTop: number;
  fits: boolean;

  totalBoardCost: number;
  totalComponentCost: number;
  totalJobCost: number;
  totalProjectCost: number;
}

export interface WallSummary {
  length: number;
  height: number;
}

export interface CabinetSummary {
  cabinetId: string;
  kitchenCabinetType: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  depth: number;

  boards: Board[];
  components: Component[];
  jobs: Job[];

  boardCost: number;
  componentCost: number;
  jobCost: number;
  totalCost: number;
}
