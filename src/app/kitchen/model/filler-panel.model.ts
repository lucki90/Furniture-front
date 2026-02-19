/**
 * Model dla blend (paneli wypełniających).
 */

// ============ ENUMS ============

export type FillerPanelType = 'SIDE_FILLER' | 'TOP_FILLER' | 'BOTTOM_FILLER' | 'CORNER_FILLER' | 'BETWEEN_FILLER';

export const FILLER_PANEL_TYPE_OPTIONS: { value: FillerPanelType; label: string; description: string }[] = [
  { value: 'SIDE_FILLER', label: 'Blenda boczna', description: 'Między szafką a ścianą' },
  { value: 'TOP_FILLER', label: 'Blenda górna', description: 'Nad szafkami górnymi, do sufitu' },
  { value: 'BOTTOM_FILLER', label: 'Blenda dolna', description: 'Między cokołem a szafką' },
  { value: 'CORNER_FILLER', label: 'Blenda narożna', description: 'W narożniku, między szafkami' },
  { value: 'BETWEEN_FILLER', label: 'Blenda między szafkami', description: 'Wypełnia przestrzeń między szafkami' }
];

// ============ REQUEST ============

export interface FillerPanelRequest {
  fillerType: FillerPanelType;
  widthMm: number;
  heightMm?: number;
  thicknessMm: number;
  positionX: number;
  positionY: number;
  adjacentCabinetId?: string;
  leftSide: boolean;
  materialCode?: string;
  colorCode?: string;
  veneerShortEdges: number;
  veneerLongEdges: number;
}

export const DEFAULT_FILLER_PANEL_REQUEST: Partial<FillerPanelRequest> = {
  fillerType: 'SIDE_FILLER',
  widthMm: 50,
  thicknessMm: 18,
  leftSide: true,
  veneerShortEdges: 1,
  veneerLongEdges: 0
};

// ============ RESPONSE ============

export interface FillerPanelResponse {
  fillerType: FillerPanelType;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  positionX: number;
  positionY: number;
  materialCode?: string;
  colorCode?: string;
  adjacentCabinetId?: string;
  leftSide: boolean;
  components: any[]; // ComponentDto
  materialCost: number;
  cuttingCost: number;
  veneerCost: number;
  componentsCost: number;
  totalCost: number;
}

// ============ CONSTANTS ============

export const FILLER_PANEL_CONSTANTS = {
  MIN_WIDTH_MM: 20,
  MAX_WIDTH_MM: 300,
  DEFAULT_THICKNESS_MM: 18
};
