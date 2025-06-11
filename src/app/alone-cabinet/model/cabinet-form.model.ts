/**
 * Interfejsy dla danych formularza szafki
 */
export interface CabinetFormData {
  lang: string;
  height: number;
  width: number;
  depth: number;
  shelfQuantity: number;
  drawerQuantity: number | null;
  oneFront: boolean;
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
  boardThickness?: number;
  color: string;
  veneerColor?: string;
  scrapedElement: ScrapedElement;
  totalPrice: number;
}

export interface Component {
  category: string;
  model: string;
  quantity: number;
  additionalInfo: string[] | null;
  scrapedElement: ScrapedElement;
  totalPrice: number;
}

export interface Job {
  category: string;
  type: string;
  quantity: number;
  additionalInfo: string[] | undefined;
  scrapedElement: ScrapedElement;
  totalPrice: number;
}

export interface ScrapedElement {
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
  remarks: string;
}
