import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PrintDocRequest } from '../../alone-cabinet/model/cabinet-form.model';
import { ExcelRowRequest, ExcelService } from '../../kitchen/service/excel.service';

@Injectable({
  providedIn: 'root'
})
export class PrintDocService {

  constructor(private excelService: ExcelService) {
  }

  downloadExcel(data: PrintDocRequest[]): Observable<void> {
    return this.excelService.downloadBoardList(this.mapToExcelRows(data), 'szafka.xlsx');
  }

  private mapToExcelRows(data: PrintDocRequest[]): ExcelRowRequest[] {
    return data.map((row, index): ExcelRowRequest => ({
      lp: index + 1,
      quantity: row.quantity,
      symbol: row.symbol,
      thickness: row.thickness,
      length: row.length,
      lengthVeneer: row.lengthVeneer ?? 0,
      width: row.width,
      widthVeneer: row.widthVeneer ?? 0,
      veneerColor: row.veneerColor ?? '',
      sticker: row.sticker,
      remarks: row.remarks ?? '',
      veneerEdgeLabel: ''
    }));
  }
}
