import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface CabinetRequest {
  x: number;
  y: number;
  z: number;
}

interface CabinetResponse {
  x: number;
  y: number;
  z: number;
}

@Injectable({
  providedIn: 'root'
})
export class AloneCabinetService {

  private apiUrl = 'http://localhost:8080/alone/calculate';

  constructor(private http: HttpClient) { }

  calculate(data: CabinetRequest): Observable<CabinetResponse> {
    return this.http.post<CabinetResponse>(this.apiUrl, data);
  }
}
