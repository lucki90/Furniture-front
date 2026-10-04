import { ExcelRowRequest } from './excel.service';
import { AggregatedBoard, AggregatedComponent, AggregatedJob } from './project-details-aggregator.service';
import { MultiWallCalculateResponse } from '../model/kitchen-project.model';
import { orientBoardForOrder } from '../../shared/model/grain-direction';

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

export function sumAggregatedBoardsCost(boards: AggregatedBoard[]): number {
  return boards.reduce((sum, board) => sum + board.totalCost, 0);
}

export function sumAggregatedComponentsCost(components: AggregatedComponent[]): number {
  return components.reduce((sum, component) => sum + component.totalCost, 0);
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
    const material = board.boardMaterial || board.material;
    const materialLabel = bomTranslations['MATERIAL.' + material] ?? materialFallbacks[material] ?? material;
    let sticker = board.boardLabel ?? board.material;
    if (board.cabinetRefs?.length) {
      sticker += ` (${board.cabinetRefs.join(', ')})`;
    }

    const order = orientBoardForOrder({
      sideX: board.width,
      sideY: board.height,
      veneerX: board.veneerX,
      veneerY: board.veneerY,
      grainAxis: board.grainAxis
    });

    return {
      lp: index + 1,
      quantity: board.quantity,
      // Dodatki ściany (blat, cokół) mają gotową nazwę materiału z agregacji; klucz `material` jest techniczny.
      symbol: board.color || (board.materialName ?? materialLabel),
      thickness: board.thickness,
      length: order.length,
      lengthVeneer: order.lengthVeneer,
      width: order.width,
      widthVeneer: order.widthVeneer,
      veneerColor: board.veneerColor ?? '',
      sticker,
      remarks: [
        board.boardMaterial ? `Materiał: ${materialLabel}` : '',
        board.varnished ? 'Lakierowane' : '',
        board.remarks ?? ''
      ].filter(Boolean).join('; '),
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
