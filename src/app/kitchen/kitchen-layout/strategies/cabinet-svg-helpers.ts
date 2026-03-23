import { DisplayHandle } from './cabinet-render-context';

/**
 * Tworzy uchwyt pionowy (dla drzwi).
 * Uchwyt ograniczony do max 12px wysokości.
 */
export function createVerticalHandle(x: number, y: number, length: number): DisplayHandle {
  return {
    type: 'BAR',
    x1: x,
    y1: y,
    x2: x,
    y2: y + Math.min(length, 12)
  };
}

/**
 * Tworzy uchwyt poziomy (dla szuflad).
 */
export function createHorizontalHandle(centerX: number, centerY: number, halfLength: number): DisplayHandle {
  return {
    type: 'BAR',
    x1: centerX - halfLength,
    y1: centerY,
    x2: centerX + halfLength,
    y2: centerY
  };
}
