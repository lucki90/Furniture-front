import type { DrawingRect } from './technical-drawing-layout.model';

export type InteriorBoardKind = 'shelf' | 'divider';

const MAX_VISIBLE_INTERIOR_BOARDS = 7;

export function buildHorizontalBoards(
  count: number,
  x: number,
  y: number,
  width: number,
  height: number,
  thickness: number,
  label: string,
  kind: InteriorBoardKind
): DrawingRect[] {
  const visibleCount = Math.min(count, MAX_VISIBLE_INTERIOR_BOARDS);
  return Array.from({ length: visibleCount }, (_, index) => {
    const boardY = y + ((index + 1) * height / (visibleCount + 1)) - thickness / 2;
    return {
      x,
      y: boardY,
      width,
      height: thickness,
      className: `technical-rect technical-rect--${kind}`,
      label: `${label} ${index + 1}`
    };
  });
}
