import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AloneCabinetService {
  furnitureData: any; // Dane z endpointu /api/furniture/alone/calculate

  private singleCalcUrl = 'http://localhost:8080/api/furniture/alone/calculate';
  private manyCalcUrl = 'http://localhost:8080/api/furniture/alone/calculate-many';

  constructor(private http: HttpClient) { }

  calculateCabinet(data: any): Observable<any> {
    return this.http.post<any>(this.singleCalcUrl, data);
  }

  calculateMany(data: any[]): Observable<any> {
    return this.http.post<any>(this.manyCalcUrl, data);
  }
}
