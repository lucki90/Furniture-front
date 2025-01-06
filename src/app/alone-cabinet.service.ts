import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AloneCabinetService {

  private apiUrl = 'http://localhost:8080/api/furniture/alone/calculate';

  constructor(private http: HttpClient) { }

  calculateCabinet(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }
}
