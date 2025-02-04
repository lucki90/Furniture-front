import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PrintDocService {

  private excelUrl = 'http://localhost:8080/api/furniture/download/excel';

  constructor(private http: HttpClient) {

  }

  // Metoda do pobierania pliku Excel
  downloadExcel(data: any): Observable<Blob> {

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    console.log("data:")
    console.log(data)
    return this.http.post(this.excelUrl, data, { responseType: 'blob' });
  }
}
