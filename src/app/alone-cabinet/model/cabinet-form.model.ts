/**
 * Interfejsy dla danych formularza szafki
 */
export interface CabinetRequest {
  lang: string;
  height: number;
  width: number;
  depth: number;
  shelfQuantity: number | null;
  needBacks: boolean;
  isHanging: boolean;
  isHangingOnRail: boolean;
  isStandingOnFeet: boolean;
  isBackInGroove: boolean;
  isFrontExtended: boolean;
  isCoveredWithCounterTop: boolean;
  varnishedFront: boolean;
  frontType: string;
  cabinetType: string;
  openingType: string;
  drawerRequest: DrawerRequest | null;
  materialRequest: MaterialRequest;
}

export interface DrawerRequest {
  drawerModel: string;
  drawerQuantity: number;
  drawerBaseHdf: boolean;
  drawerFrontDetails: DrawerFrontDetail[] | null;
}

export interface DrawerFrontDetail {
  height: number | null;
  name: string | null;
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
 * Model odpowiedzi z serwera
 */
export interface CabinetResponse {
  boards: Board[];
  components: Component[];
  jobs: Job[];
  boardTotalCost: number;
  componentTotalCost: number;
  jobTotalCost: number;
}

export interface Board {
  boardName: string;
  quantity: number;
  sideX: number;
  veneerX?: number;
  sideY: number;
  veneerY?: number;
  boardThickness: number;
  color: string;
  veneerColor?: string;
  priceEntry: PriceEntry;
  totalPrice: number;
  remarks: string;
}

export interface Component {
  category: string;
  model: string;
  quantity: number;
  additionalInfo: string[] | null;
  priceEntry: PriceEntry;
  totalPrice: number;
}

export interface Job {
  category: string;
  type: string;
  quantity: number;
  additionalInfo: string[] | undefined;
  priceEntry: PriceEntry;
  totalPrice: number;
}

export interface PriceEntry {
  price: number;
  unit: string;
}

/**
 * Obiekt żądania dla drukowania dokumentów
 */
export interface PrintDocRequest {
  quantity: number;
  symbol: string;
  thickness: number;
  length: number;
  lengthVeneer?: number;
  width: number;
  widthVeneer?: number;
  veneerColor?: string;
  sticker: string;
  remarks: string
}


