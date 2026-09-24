export type CuttingAxis = 'SPLIT_X' | 'SPLIT_Y';

/** Odpowiedź endpointu wizualizacji rozkroju gilotynowego. */
export interface CuttingLayoutResponse {
  sheets: CuttingSheetLayout[];
  sheetCount: number;
  totalCutLengthMm: number;
  totalCutCount: number;
  totalSheetAreaMm2: number;
  totalUsedAreaMm2: number;
  totalWasteAreaMm2: number;
  totalKerfAreaMm2: number;
  utilization: number;
}

/** Rozkrój pojedynczego arkusza wraz z jego metrykami. */
export interface CuttingSheetLayout {
  index: number;
  width: number;
  height: number;
  material: string;
  color: string;
  thicknessMm: number;
  origin: string;
  kerfMm: number;
  placements: CuttingPlacement[];
  cuts: CuttingSegment[];
  offcuts: CuttingOffcut[];
  usedAreaMm2: number;
  wasteAreaMm2: number;
  kerfAreaMm2: number;
  cutLengthMm: number;
  cutCount: number;
  utilization: number;
}

/** Formatka umieszczona na arkuszu. */
export interface CuttingPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  boardRef: string;
  label: string;
}

/** Jedno pełne cięcie bieżącej strefy arkusza. */
export interface CuttingSegment {
  axis: CuttingAxis;
  coord: number;
  from: number;
  to: number;
  length: number;
  depth: number;
}

/** Wolny prostokąt pozostały po rozkroju. */
export interface CuttingOffcut {
  x: number;
  y: number;
  width: number;
  height: number;
  areaMm2: number;
  useful: boolean;
}

/** Minimalny kontrakt wejściowy zgodny z backendowym BoardDto. */
export interface CuttingBoardRequest {
  quantity: number;
  sideX: number;
  sideY: number;
  boardThickness: number;
  veneerX: number;
  veneerY: number;
  boardName: string;
  boardNameLabel?: string;
  color: string;
  veneerColor: string;
  material: string;
  varnished: boolean;
  lshapeCutoutLengthAMm?: number | null;
  lshapeCutoutLengthBMm?: number | null;
}
