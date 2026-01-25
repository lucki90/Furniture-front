import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KitchenService {

  private readonly addKitchenCabinet = 'http://localhost:8080/api/furniture/kitchen/add';
  private readonly kitchenLayout = 'http://localhost:8080/api/furniture/kitchen/layout';

  constructor(private readonly http: HttpClient) {
  }

  calculateCabinet(data: any): Observable<any> {
    return this.http.post<any>(this.addKitchenCabinet, data);
  }

  postKitchenLayout(data: any): Observable<any> {
    return this.http.post<any>(this.kitchenLayout, data);
  }

}
