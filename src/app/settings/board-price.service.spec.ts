import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BoardPriceService } from './board-price.service';
import { environment } from '../../environments/environment';

const BASE_URL = `${environment.apiUrl}/prices/boards`;

describe('BoardPriceService', () => {
  let service: BoardPriceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BoardPriceService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BoardPriceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('deactivateBulk sends POST to /prices/boards/deactivate', () => {
    service.deactivateBulk([1, 2, 3]).subscribe();

    const req = http.expectOne(`${BASE_URL}/deactivate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([1, 2, 3]);
    req.flush({ deactivated: 3 });
  });

  it('deactivate sends DELETE to /prices/boards/{id}', () => {
    service.deactivate(42).subscribe();

    const req = http.expectOne(`${BASE_URL}/42`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('update sends PUT to /prices/boards/{id}', () => {
    service.update(5, { pricePerM2: 99 }).subscribe();

    const req = http.expectOne(`${BASE_URL}/5`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ pricePerM2: 99 });
    req.flush({ id: 5 });
  });
});
