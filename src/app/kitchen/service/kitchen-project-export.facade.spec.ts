import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BrowserDownloadService } from '../../shared/browser-download.service';
import { KitchenProjectExportFacade } from './kitchen-project-export.facade';
import { ExcelService } from './excel.service';
import { KitchenProjectPricingFacade } from './kitchen-project-pricing.facade';
import { AggregatedBoard, AggregatedComponent, AggregatedJob } from './project-details-aggregator.service';

describe('KitchenProjectExportFacade', () => {
  let facade: KitchenProjectExportFacade;
  let excelService: jasmine.SpyObj<ExcelService>;
  let pricingFacade: jasmine.SpyObj<KitchenProjectPricingFacade>;
  let browserDownloadService: jasmine.SpyObj<BrowserDownloadService>;

  beforeEach(() => {
    excelService = jasmine.createSpyObj<ExcelService>('ExcelService', ['downloadBoardList']);
    pricingFacade = jasmine.createSpyObj<KitchenProjectPricingFacade>('KitchenProjectPricingFacade', ['downloadOfferPdf']);
    browserDownloadService = jasmine.createSpyObj<BrowserDownloadService>('BrowserDownloadService', ['downloadBlob']);

    TestBed.configureTestingModule({
      providers: [
        KitchenProjectExportFacade,
        { provide: ExcelService, useValue: excelService },
        { provide: KitchenProjectPricingFacade, useValue: pricingFacade },
        { provide: BrowserDownloadService, useValue: browserDownloadService }
      ]
    });

    facade = TestBed.inject(KitchenProjectExportFacade);
  });

  it('should expose BOM warning helper', () => {
    const warning = facade.getBomPriceWarning(
      [{ unitCost: 0 } as AggregatedBoard],
      [{ unitCost: 0, isWaste: false } as AggregatedComponent],
      [{ unitCost: 5 } as AggregatedJob]
    );

    expect(warning).toBe('Brak cen dla: 1 płyt, 1 komponentów. Wycena będzie niepełna.');
  });

  it('should build excel rows and call excel export service', (done) => {
    excelService.downloadBoardList.and.returnValue(of(void 0));

    facade.exportExcel({
      boards: [
        {
          quantity: 2,
          color: '',
          material: 'CHIPBOARD',
          thickness: 18,
          height: 720,
          veneerY: 0,
          width: 560,
          veneerX: 1,
          veneerColor: 'white',
          boardLabel: 'Bok',
          cabinetRefs: ['S1'],
          remarks: '',
          veneerEdgeLabel: 'ABS'
        } as AggregatedBoard
      ],
      bomTranslations: { 'MATERIAL.CHIPBOARD': 'Płyta wiórowa' },
      fallbackMaterialNames: { CHIPBOARD: 'Fallback' },
      projectName: 'Projekt / klient',
      language: 'pl'
    }).subscribe(() => {
      expect(excelService.downloadBoardList).toHaveBeenCalled();
      const [rows, filename, language] = excelService.downloadBoardList.calls.mostRecent().args;
      expect(rows).toEqual([
        jasmine.objectContaining({
          symbol: 'Płyta wiórowa',
          sticker: 'Bok (S1)'
        })
      ]);
      expect(filename).toBe('kuchnia_plyty_Projekt___klient_20260417.xlsx');
      expect(language).toBe('pl');
      done();
    });
  });

  it('should download offer pdf through browser download service', (done) => {
    const blob = new Blob(['pdf']);
    pricingFacade.downloadOfferPdf.and.returnValue(of({
      blob,
      filename: 'oferta.pdf'
    }));

    facade.downloadOfferPdf({
      projectId: 12,
      options: { showCostDetails: true }
    }).subscribe(() => {
      expect(pricingFacade.downloadOfferPdf).toHaveBeenCalledWith(12, { showCostDetails: true });
      expect(browserDownloadService.downloadBlob).toHaveBeenCalledWith(blob, 'oferta.pdf');
      done();
    });
  });
});
