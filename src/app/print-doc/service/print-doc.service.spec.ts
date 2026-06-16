import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PrintDocRequest } from '../../alone-cabinet/model/cabinet-form.model';
import { ExcelService } from '../../kitchen/service/excel.service';
import { PrintDocService } from './print-doc.service';

describe('PrintDocService', () => {
  let service: PrintDocService;
  let excelService: jasmine.SpyObj<ExcelService>;

  beforeEach(() => {
    excelService = jasmine.createSpyObj<ExcelService>('ExcelService', ['downloadBoardList']);
    excelService.downloadBoardList.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      providers: [
        PrintDocService,
        { provide: ExcelService, useValue: excelService }
      ]
    });

    service = TestBed.inject(PrintDocService);
  });

  it('tworzy serwis', () => {
    expect(service).toBeTruthy();
  });

  it('mapuje legacy PrintDocRequest na wspólny ExcelRowRequest i deleguje eksport', () => {
    const rows: PrintDocRequest[] = [
      {
        quantity: 2,
        symbol: 'PLYTA',
        thickness: 18,
        length: 720,
        lengthVeneer: 1,
        width: 300,
        widthVeneer: 0,
        veneerColor: 'biały',
        sticker: 'Bok',
        remarks: 'uwaga'
      },
      {
        quantity: 1,
        symbol: 'HDF',
        thickness: 3,
        length: 700,
        width: 500,
        sticker: 'Plecy',
        remarks: ''
      }
    ];

    service.downloadExcel(rows).subscribe();

    const [mappedRows, filename] = excelService.downloadBoardList.calls.mostRecent().args;
    expect(filename).toBe('szafka.xlsx');
    expect(mappedRows).toEqual([
      {
        lp: 1,
        quantity: 2,
        symbol: 'PLYTA',
        thickness: 18,
        length: 720,
        lengthVeneer: 1,
        width: 300,
        widthVeneer: 0,
        veneerColor: 'biały',
        sticker: 'Bok',
        remarks: 'uwaga',
        veneerEdgeLabel: ''
      },
      {
        lp: 2,
        quantity: 1,
        symbol: 'HDF',
        thickness: 3,
        length: 700,
        lengthVeneer: 0,
        width: 500,
        widthVeneer: 0,
        veneerColor: '',
        sticker: 'Plecy',
        remarks: '',
        veneerEdgeLabel: ''
      }
    ]);
  });
});
