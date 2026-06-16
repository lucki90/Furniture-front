import { CabinetFormData } from '../../../model/kitchen-state.model';
import { CornerCabinetRequest } from '../../model/corner-cabinet.model';
import { DrawerFrontDetail, MaterialRequest } from '../../model/kitchen-cabinet-form.model';
import { SegmentRequest } from '../../model/segment.model';

export interface MaterialDefaults {
  boxMaterial: string;
  boxBoardThickness: number;
  boxColor: string;
  frontMaterial: string;
  frontBoardThickness: number;
  frontColor: string;
  backMaterial: string;
  backBoardThickness: number;
  /** Czy fronty są domyślnie lakierowane (bez naliczania okleiny). */
  varnishedFront: boolean;
}

export const DEFAULT_MATERIAL_DEFAULTS: MaterialDefaults = {
  boxMaterial: 'CHIPBOARD',
  boxBoardThickness: 18,
  boxColor: 'WHITE',
  frontMaterial: 'CHIPBOARD',
  frontBoardThickness: 18,
  frontColor: 'WHITE',
  backMaterial: 'HDF',
  backBoardThickness: 3,
  varnishedFront: false
};

export type CabinetRequestFormValue = Partial<CabinetFormData> & Pick<CabinetFormData, 'width' | 'height' | 'depth'>;

export interface DrawerCalculateRequest {
  drawerModel?: string | null;
  drawerQuantity: number;
  drawerBaseHdf: boolean;
  drawerFrontDetails: DrawerFrontDetail[] | null;
}

export interface CascadeSegmentCalculateRequest {
  orderIndex: number;
  height: number;
  depth: number;
  frontType: string;
  shelfQuantity: number;
  isLiftUp?: boolean;
  isFrontExtended?: boolean;
}

/**
 * Request wysyłany do endpointu kalkulacji pojedynczej szafki (`POST /kitchen/add`).
 * Bazuje na backendowym `api.cabinet.dto.request.CabinetRequest` i zawiera opcjonalne pola per typ szafki.
 */
export interface CabinetCalculateRequest {
  lang: string;
  kitchenCabinetType: string;
  cabinetType?: string | null;
  openingType: string;
  height: number;
  width: number;
  depth: number;
  shelfQuantity: number;
  frontType?: string | null;
  varnishedFront: boolean;
  isFrontExtended: boolean;
  isLiftUp?: boolean;
  liftMechanismType?: string;
  allowThirdLiftMechanism?: boolean;
  hfUpperFrontHeightMm?: number | null;
  drawerRequest: DrawerCalculateRequest | null;
  drawerLayoutType?: string;
  cargoVariant?: string;
  cargoBrand?: string;
  materialRequest: MaterialRequest;
  needBacks: boolean;
  isStandingOnFeet: boolean;
  isCoveredWithCounterTop: boolean;
  isHanging: boolean;
  isHangingOnRail: boolean;
  isBackInGroove: boolean;
  attachedPlinthHeightMm?: number;
  attachedPlinthSetbackMm?: number;
  segments?: SegmentRequest[] | null;
  cornerRequest?: CornerCabinetRequest;
  bottomWreathOnFloor?: boolean;
  sinkFrontType?: string;
  sinkApronEnabled?: boolean;
  sinkApronHeightMm?: number;
  cooktopType?: string;
  cooktopFrontType?: string;
  hoodFrontType?: string;
  hoodScreenEnabled?: boolean;
  hoodScreenHeightMm?: number;
  cascadeSegments?: CascadeSegmentCalculateRequest[];
  ovenHeightType?: string;
  ovenLowerSectionType?: string;
  ovenApronEnabled?: boolean;
  ovenApronHeightMm?: number;
  fridgeSectionType?: string;
  lowerFrontHeightMm?: number;
  fridgeFreestandingType?: string;
  drainerFrontType?: string;
  pantryPassageFrontType?: string;
}

export interface KitchenCabinetRequestMapper {
  map(formValue: CabinetRequestFormValue, materialDefaults: MaterialDefaults): CabinetCalculateRequest;
}
