import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { Board } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { CuttingLayoutResponse } from '../model/cutting-layout.model';
import { CuttingLayoutService } from './cutting-layout.service';

describe('CuttingLayoutService', () => {
  let service: CuttingLayoutService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/cutting/layout`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CuttingLayoutService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CuttingLayoutService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('nie wywołuje endpointu przed jawnym żądaniem layoutu', () => {
    http.expectNone(url);
    expect(service.layout()).toBeNull();
    expect(service.isLoading()).toBeFalse();
  });

  it('wysyła scalone BoardDto i zapisuje odpowiedź', () => {
    service.loadLayout([board({ quantity: 2 }), board({ quantity: 3 })]);

    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.length).toBe(1);
    expect(request.request.body[0]).toEqual(jasmine.objectContaining({
      quantity: 5,
      material: 'CHIPBOARD',
      boardName: 'SIDE_NAME',
      sideX: 500,
      sideY: 700
    }));
    expect(service.isLoading()).toBeTrue();

    request.flush(layoutResponse(1));

    expect(service.layout()?.sheetCount).toBe(1);
    expect(service.error()).toBeNull();
    expect(service.isLoading()).toBeFalse();
  });

  it('anuluje starsze żądanie i przyjmuje wyłącznie nowszy wynik', () => {
    service.loadLayout([board()]);
    const olderRequest = http.expectOne(url);

    service.loadLayout([board({ boardName: 'SHELF_NAME' })]);
    const newerRequest = http.expectOne(url);

    expect(olderRequest.cancelled).toBeTrue();
    expect(service.isLoading()).toBeTrue();

    newerRequest.flush(layoutResponse(2));

    expect(service.layout()?.sheetCount).toBe(2);
    expect(service.isLoading()).toBeFalse();
  });

  it('finalize czyści loading po błędzie i udostępnia komunikat', () => {
    service.loadLayout([board()]);

    http.expectOne(url).flush('awaria', { status: 500, statusText: 'Server Error' });

    expect(service.layout()).toBeNull();
    expect(service.error()).toContain('Nie udało się');
    expect(service.isLoading()).toBeFalse();
  });

  it('reset anuluje żądanie i czyści cały stan', () => {
    service.loadLayout([board()]);
    const request = http.expectOne(url);

    service.reset();

    expect(request.cancelled).toBeTrue();
    expect(service.layout()).toBeNull();
    expect(service.error()).toBeNull();
    expect(service.isLoading()).toBeFalse();
  });
});

function board(overrides: Partial<Board> = {}): Board {
  return {
    boardName: 'SIDE_NAME',
    boardNameLabel: 'Bok',
    material: 'CHIPBOARD',
    varnished: false,
    quantity: 1,
    sideX: 500,
    sideY: 700,
    boardThickness: 18,
    color: 'WHITE',
    priceEntry: { price: 10, unit: 'm2' },
    totalPrice: 10,
    remarks: '',
    ...overrides
  };
}

function layoutResponse(sheetCount: number): CuttingLayoutResponse {
  return {
    sheets: [],
    sheetCount,
    totalCutLengthMm: 0,
    totalCutCount: 0,
    totalSheetAreaMm2: 0,
    totalUsedAreaMm2: 0,
    totalWasteAreaMm2: 0,
    totalKerfAreaMm2: 0,
    utilization: 0
  };
}
