import {
  CabinetVisualConfig,
  DEFAULT_HANDLE_CONFIG,
  DEFAULT_PLINTH_CONFIG,
  FeetConfig,
  FrontElement,
  HandleConfig,
  PlinthConfig,
  generateDefaultFronts
} from '../cabinet-form/model/cabinet-visual-elements.model';
import { CabinetZone } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

export interface CabinetDetailInputData {
  type: KitchenCabinetType;
  width: number;
  height: number;
  depth: number;
  zone: CabinetZone;
  drawerQuantity?: number;
  visualConfig?: CabinetVisualConfig;
}

export interface CabinetDetailGeometry {
  scale: number;
  svgWidth: number;
  svgHeight: number;
  bodyX: number;
  bodyY: number;
  bodyWidth: number;
  bodyHeight: number;
  bodyHeightScaled: number;
  baseY: number;
  baseHeight: number;
  baseHeightScaled: number;
  countertopHeight: number;
  countertopHeightScaled: number;
  plinthSetback: number;
}

export interface CabinetDetailLayoutOptions {
  svgPadding: number;
  maxSvgWidth: number;
  maxSvgHeight: number;
}

const DEFAULT_COUNTERTOP_THICKNESS = 38;
const DEFAULT_HANDLE_COLOR = '#78909c';
const DEFAULT_PLINTH_SETBACK = 40;

export function computeCabinetScale(
  cabinet: CabinetDetailInputData,
  options: CabinetDetailLayoutOptions
): number {
  const availableWidth = options.maxSvgWidth - options.svgPadding * 2;
  const availableHeight = options.maxSvgHeight - options.svgPadding * 2;
  const scaleX = availableWidth / cabinet.width;
  const scaleY = availableHeight / cabinet.height;
  return Math.min(scaleX, scaleY, 0.3);
}

export function buildDefaultCabinetVisualConfig(cabinet: CabinetDetailInputData): CabinetVisualConfig {
  const isBottom = cabinet.zone === 'BOTTOM';
  const isFull = cabinet.zone === 'FULL';
  const plinthHeight = (isBottom || isFull) ? DEFAULT_PLINTH_CONFIG.height : 0;
  const countertopHeight = isBottom ? DEFAULT_COUNTERTOP_THICKNESS : 0;
  const usableHeight = cabinet.height - plinthHeight - countertopHeight;

  const fronts = generateDefaultFronts(
    cabinet.type,
    cabinet.width,
    usableHeight,
    cabinet.drawerQuantity
  ).map(front => ({
    ...front,
    handle: getDefaultHandleForFront(front)
  }));

  return {
    baseType: (isBottom || isFull) ? 'PLINTH' : 'NONE',
    plinth: (isBottom || isFull) ? { ...DEFAULT_PLINTH_CONFIG } : undefined,
    fronts,
    defaultHandle: { ...DEFAULT_HANDLE_CONFIG },
    hasCountertop: isBottom,
    countertopOverhang: 20
  };
}

export function buildCabinetDetailGeometry(
  cabinet: CabinetDetailInputData,
  config: CabinetVisualConfig,
  options: CabinetDetailLayoutOptions
): CabinetDetailGeometry {
  const scale = computeCabinetScale(cabinet, options);
  const baseHeight = getCabinetBaseHeight(config);
  const countertopHeight = getCabinetCountertopHeight(config, cabinet.zone);
  const bodyHeight = cabinet.height - baseHeight - countertopHeight;
  const bodyX = options.svgPadding;
  const bodyY = options.svgPadding + countertopHeight * scale;
  const bodyWidth = cabinet.width * scale;
  const bodyHeightScaled = bodyHeight * scale;
  const baseHeightScaled = baseHeight * scale;

  return {
    scale,
    svgWidth: cabinet.width * scale + options.svgPadding * 2,
    svgHeight: cabinet.height * scale + options.svgPadding * 2,
    bodyX,
    bodyY,
    bodyWidth,
    bodyHeight,
    bodyHeightScaled,
    baseY: bodyY + bodyHeightScaled,
    baseHeight,
    baseHeightScaled,
    countertopHeight,
    countertopHeightScaled: countertopHeight * scale,
    plinthSetback: ((config.plinth?.setback ?? DEFAULT_PLINTH_SETBACK) * scale)
  };
}

export function getFrontRect(front: FrontElement, geometry: CabinetDetailGeometry) {
  const x = geometry.bodyX + front.positionX * geometry.scale;
  const fromTop = geometry.bodyHeight - front.positionY - front.height;
  const y = geometry.bodyY + fromTop * geometry.scale;

  return {
    x,
    y,
    width: front.width * geometry.scale,
    height: front.height * geometry.scale
  };
}

export function buildHandlePath(
  front: FrontElement,
  geometry: CabinetDetailGeometry,
  defaultHandle?: HandleConfig
): string {
  const handle = front.handle || defaultHandle;
  if (!handle || handle.type === 'NONE' || handle.type === 'PUSH_TO_OPEN' || handle.type === 'KNOB') {
    return '';
  }

  const rect = getFrontRect(front, geometry);
  const handleLength = (handle.length || 128) * geometry.scale;
  const offset = (handle.offsetFromEdge || 30) * geometry.scale;

  let x1: number, y1: number, x2: number, y2: number;

  if (handle.orientation === 'HORIZONTAL') {
    const centerX = rect.x + rect.width / 2;
    x1 = centerX - handleLength / 2;
    x2 = centerX + handleLength / 2;

    if (handle.position === 'TOP') {
      y1 = y2 = rect.y + offset;
    } else if (handle.position === 'BOTTOM') {
      y1 = y2 = rect.y + rect.height - offset;
    } else {
      y1 = y2 = rect.y + rect.height / 2;
    }
  } else {
    const centerY = rect.y + rect.height / 2;
    y1 = centerY - handleLength / 2;
    y2 = centerY + handleLength / 2;

    if (handle.position === 'SIDE_LEFT') {
      x1 = x2 = rect.x + offset;
    } else if (handle.position === 'SIDE_RIGHT') {
      x1 = x2 = rect.x + rect.width - offset;
    } else {
      x1 = x2 = rect.x + rect.width / 2;
    }
  }

  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

export function isKnobHandle(front: FrontElement, defaultHandle?: HandleConfig): boolean {
  const handle = front.handle || defaultHandle;
  return handle?.type === 'KNOB';
}

export function getKnobPosition(
  front: FrontElement,
  geometry: CabinetDetailGeometry,
  defaultHandle?: HandleConfig
) {
  const handle = front.handle || defaultHandle;
  if (!handle) {
    return { x: 0, y: 0 };
  }

  const rect = getFrontRect(front, geometry);
  const offset = (handle.offsetFromEdge || 30) * geometry.scale;

  const x = handle.position === 'SIDE_LEFT'
    ? rect.x + offset
    : handle.position === 'SIDE_RIGHT'
      ? rect.x + rect.width - offset
      : rect.x + rect.width / 2;

  const y = handle.position === 'TOP'
    ? rect.y + offset
    : handle.position === 'BOTTOM'
      ? rect.y + rect.height - offset
      : rect.y + rect.height / 2;

  return { x, y };
}

export function hasHinges(front: FrontElement): boolean {
  return front.type === 'DOOR_SINGLE' || front.type === 'DOOR_DOUBLE';
}

export function getHingePositions(front: FrontElement, geometry: CabinetDetailGeometry): { x: number; y: number }[] {
  if (!hasHinges(front)) {
    return [];
  }

  const rect = getFrontRect(front, geometry);
  const hingeX = front.hingesSide === 'RIGHT'
    ? rect.x + rect.width - 2
    : rect.x + 2;
  const hingeCount = rect.height > 60 ? 3 : 2;

  return Array.from({ length: hingeCount }, (_, index) => ({
    x: hingeX,
    y: rect.y + (rect.height / (hingeCount + 1)) * (index + 1)
  }));
}

export function getFeetPositions(feetConfig: FeetConfig | undefined, geometry: CabinetDetailGeometry): { x: number; y: number }[] {
  if (!feetConfig) {
    return [];
  }

  const count = feetConfig.quantity || 4;
  const spacing = geometry.bodyWidth / (count - 1 || 1);
  const y = geometry.baseY + geometry.baseHeightScaled - 3;

  return Array.from({ length: count }, (_, index) => ({
    x: geometry.bodyX + spacing * index,
    y
  }));
}

export function getHandleColor(front: FrontElement, defaultHandle?: HandleConfig): string {
  return (front.handle || defaultHandle)?.color || DEFAULT_HANDLE_COLOR;
}

export function getPlinthColor(plinthConfig: PlinthConfig | undefined, fallbackColor: string): string {
  return plinthConfig?.color || fallbackColor;
}

export function getFeetColor(feetConfig: FeetConfig | undefined, fallbackColor: string): string {
  return feetConfig?.color || fallbackColor;
}

export function getCabinetBaseHeight(config: CabinetVisualConfig): number {
  if (config.baseType === 'PLINTH' && config.plinth) {
    return config.plinth.height;
  }
  if (config.baseType === 'FEET' && config.feet) {
    return config.feet.height;
  }
  return 0;
}

export function getCabinetCountertopHeight(config: CabinetVisualConfig, zone: CabinetZone): number {
  if (zone !== 'BOTTOM') {
    return 0;
  }
  return config.hasCountertop ? DEFAULT_COUNTERTOP_THICKNESS : 0;
}

function getDefaultHandleForFront(front: FrontElement): HandleConfig {
  switch (front.type) {
    case 'DRAWER':
      return {
        type: 'BAR',
        length: Math.min(128, front.width * 0.6),
        position: 'MIDDLE',
        orientation: 'HORIZONTAL',
        color: DEFAULT_HANDLE_COLOR,
        offsetFromEdge: front.height / 2
      };

    case 'DOOR_SINGLE':
    case 'DOOR_DOUBLE':
      return {
        type: 'BAR',
        length: 128,
        position: front.hingesSide === 'LEFT' ? 'SIDE_RIGHT' : 'SIDE_LEFT',
        orientation: 'VERTICAL',
        color: DEFAULT_HANDLE_COLOR,
        offsetFromEdge: 30
      };

    default:
      return { ...DEFAULT_HANDLE_CONFIG };
  }
}
