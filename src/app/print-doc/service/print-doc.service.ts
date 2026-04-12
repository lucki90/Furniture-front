import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';
import { environment } from '../../../environments/environment';
import { PrintDocRequest } from '../../alone-cabinet/model/cabinet-form.model';

@Injectable({
  providedIn: 'root'
})
export class PrintDocService {

  private excelUrl = `${environment.apiUrl}/download/excel`;

  constructor(private http: HttpClient) {

  }

  // Metoda do pobierania pliku Excel
  downloadExcel(data: PrintDocRequest[]): Observable<Blob> {

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(this.excelUrl, data, {responseType: 'blob'});
  }
}
