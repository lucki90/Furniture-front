import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PrintDocService {

  private excelUrl = `${environment.apiUrl}/download/excel`;

  constructor(private http: HttpClient) {

  }

  // Metoda do pobierania pliku Excel
  downloadExcel(data: any): Observable<Blob> {

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    console.log("data:")
    console.log(data)
    return this.http.post(this.excelUrl, data, {responseType: 'blob'});
  }
}
