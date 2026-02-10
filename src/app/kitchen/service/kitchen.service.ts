import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {KitchenProjectRequest, KitchenProjectResponse} from '../model/kitchen-project.model';

@Injectable({
  providedIn: 'root'
})
export class KitchenService {

  private readonly baseUrl = 'http://localhost:8080/api/furniture/kitchen';
  private readonly addKitchenCabinet = `${this.baseUrl}/add`;
  private readonly kitchenLayout = `${this.baseUrl}/layout`;
  private readonly projectCalculate = `${this.baseUrl}/project/calculate`;

  constructor(private readonly http: HttpClient) {
  }

  calculateCabinet(data: any): Observable<any> {
    return this.http.post<any>(this.addKitchenCabinet, data);
  }

  postKitchenLayout(data: any): Observable<any> {
    return this.http.post<any>(this.kitchenLayout, data);
  }

  /**
   * Kalkuluje cały projekt kuchni - wszystkie szafki na ścianie.
   * Waliduje placement i zwraca zagregowane koszty.
   */
  calculateProject(request: KitchenProjectRequest): Observable<KitchenProjectResponse> {
    return this.http.post<KitchenProjectResponse>(this.projectCalculate, request);
  }

}
