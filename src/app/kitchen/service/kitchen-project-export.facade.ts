import { Injectable, inject } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { BrowserDownloadService } from '../../shared/browser-download.service';
import { AggregatedBoard, AggregatedComponent, AggregatedJob } from './project-details-aggregator.service';
import { ExcelRowRequest, ExcelService } from './excel.service';
import { KitchenProjectPricingFacade } from './kitchen-project-pricing.facade';
import { OfferOptionsRequest } from './project-pricing.service';
import {
  buildBoardExcelFilename,
  buildBoardExcelRows,
  calculateBomPriceWarning
} from './kitchen-project-summary.utils';

export interface KitchenProjectExcelExportInput {
  boards: AggregatedBoard[];
  bomTranslations: Record<string, string>;
  fallbackMaterialNames: Record<string, string>;
  projectName?: string | null;
  language: string;
}

export interface KitchenProjectPdfExportInput {
  projectId: number;
  options: OfferOptionsRequest;
}

@Injectable({ providedIn: 'root' })
export class KitchenProjectExportFacade {
  private excelService = inject(ExcelService);
  private pricingFacade = inject(KitchenProjectPricingFacade);
  private browserDownloadService = inject(BrowserDownloadService);

  getBomPriceWarning(
    boards: AggregatedBoard[],
    components: AggregatedComponent[],
    jobs: AggregatedJob[]
  ): string | null {
    return calculateBomPriceWarning(boards, components, jobs);
  }

  buildExcelRows(input: KitchenProjectExcelExportInput): ExcelRowRequest[] {
    return buildBoardExcelRows(input.boards, input.bomTranslations, input.fallbackMaterialNames);
  }

  buildExcelFilename(projectName?: string | null): string {
    return buildBoardExcelFilename(projectName ?? undefined);
  }

  exportExcel(input: KitchenProjectExcelExportInput): Observable<void> {
    const rows = this.buildExcelRows(input);
    const filename = this.buildExcelFilename(input.projectName);
    return this.excelService.downloadBoardList(rows, filename, input.language);
  }

  downloadOfferPdf(input: KitchenProjectPdfExportInput): Observable<void> {
    return this.pricingFacade.downloadOfferPdf(input.projectId, input.options).pipe(
      tap(({ blob, filename }) => {
        if (blob) {
          this.browserDownloadService.downloadBlob(blob, filename);
        }
      }),
      map(() => undefined)
    );
  }
}
