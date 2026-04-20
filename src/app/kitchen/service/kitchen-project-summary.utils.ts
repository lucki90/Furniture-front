import { ExcelRowRequest } from './excel.service';
import { AggregatedBoard, AggregatedComponent, AggregatedJob } from './project-details-aggregator.service';
import { MultiWallCalculateResponse } from '../model/kitchen-project.model';

export function calculateBomPriceWarning(
  boards: AggregatedBoard[],
  components: AggregatedComponent[],
  jobs: AggregatedJob[]
): string | null {
  const boardsMissing = boards.filter(board => !board.unitCost || board.unitCost === 0).length;
  const componentsMissing = components.filter(component => !component.isWaste && (!component.unitCost || component.unitCost === 0)).length;
  const jobsMissing = jobs.filter(job => !job.unitCost || job.unitCost === 0).length;

  const parts: string[] = [];
  if (boardsMissing > 0) parts.push(`${boardsMissing} płyt`);
  if (componentsMissing > 0) parts.push(`${componentsMissing} komponentów`);
  if (jobsMissing > 0) parts.push(`${jobsMissing} prac`);

  if (parts.length === 0) {
    return null;
  }

  return `Brak cen dla: ${parts.join(', ')}. Wycena będzie niepełna.`;
}

export function calculateAdjustedTotalCost(projectResult: MultiWallCalculateResponse | null, includeWasteCost: boolean): number {
  if (!projectResult) {
    return 0;
  }

  const waste = projectResult.totalWasteCost ?? 0;
  return includeWasteCost ? projectResult.totalProjectCost : projectResult.totalProjectCost - waste;
}

export function calculateAdjustedComponentCost(projectResult: MultiWallCalculateResponse | null, includeWasteCost: boolean): number {
  if (!projectResult) {
    return 0;
  }

  const waste = projectResult.totalWasteCost ?? 0;
  return includeWasteCost ? projectResult.totalComponentCost + waste : projectResult.totalComponentCost;
}

export function sumAggregatedBoardsCost(boards: AggregatedBoard[]): number {
  return boards.reduce((sum, board) => sum + board.totalCost, 0);
}

export function sumAggregatedComponentsCost(components: AggregatedComponent[], includeWasteCost: boolean): number {
  return components
    .filter(component => !component.isWaste || includeWasteCost)
    .reduce((sum, component) => sum + component.totalCost, 0);
}

export function sumAggregatedJobsCost(jobs: AggregatedJob[]): number {
  return jobs.reduce((sum, job) => sum + job.totalCost, 0);
}

export function buildBoardExcelRows(
  boards: AggregatedBoard[],
  bomTranslations: Record<string, string>,
  materialFallbacks: Record<string, string>
): ExcelRowRequest[] {
  return boards.map((board, index) => {
    let sticker = board.boardLabel ?? board.material;
    if (board.cabinetRefs?.length) {
      sticker += ` (${board.cabinetRefs.join(', ')})`;
    }

    return {
      lp: index + 1,
      quantity: board.quantity,
      symbol: board.color || (
        board.material
          ? (bomTranslations['MATERIAL.' + board.material] ?? materialFallbacks[board.material] ?? board.material)
          : ''
      ),
      thickness: board.thickness,
      length: board.height,
      lengthVeneer: board.veneerY ?? 0,
      width: board.width,
      widthVeneer: board.veneerX ?? 0,
      veneerColor: board.veneerColor ?? '',
      sticker,
      remarks: board.remarks ?? '',
      veneerEdgeLabel: board.veneerEdgeLabel ?? ''
    };
  });
}

export function buildBoardExcelFilename(projectName: string | null | undefined, now: Date = new Date()): string {
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const namePart = projectName
    ? `kuchnia_plyty_${projectName}_${dateStr}`
    : `kuchnia_${dateStr}`;

  return namePart.replace(/[^\w\-ąęółśżźćńĄĘÓŁŚŻŹĆŃ]/g, '_') + '.xlsx';
}
