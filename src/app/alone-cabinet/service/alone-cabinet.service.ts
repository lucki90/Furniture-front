import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import { CabinetRequest, CabinetResponse } from '../model/cabinet-form.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AloneCabinetService {
  private readonly singleCalcUrl = `${environment.apiUrl}/alone/calculate`;
  private readonly manyCalcUrl = `${environment.apiUrl}/alone/calculate-many`;

  constructor(private readonly http: HttpClient) {
  }

  calculateCabinet(data: CabinetRequest): Observable<CabinetResponse> {
    return this.http.post<CabinetResponse>(this.singleCalcUrl, data);
  }

  calculateMany(data: CabinetRequest[]): Observable<CabinetResponse> {
    return this.http.post<CabinetResponse>(this.manyCalcUrl, data);
  }
}
