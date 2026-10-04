import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PriceAdminService } from './price-admin.service';
import { PriceImportResultResponse } from '../model/price-entry.model';
import { environment } from '../../../../environments/environment';

describe('PriceAdminService', () => {
  let service: PriceAdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PriceAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('importPrices', () => {
    it('wysyła POST multipart z polem file i zwraca rzeczywisty kontrakt BE', () => {
      const file = new File(['materialCode;thicknessMm'], 'ceny.csv', { type: 'text/csv' });
      let result: PriceImportResultResponse | undefined;

      service.importPrices(file).subscribe(response => (result = response));

      const req = http.expectOne(`${environment.apiUrl}/admin/prices/import`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      expect((req.request.body as FormData).get('file')).toBe(file);
      expect(req.request.headers.has('Content-Type')).toBeFalse();

      req.flush({
        added: 1,
        updated: 2,
        errors: [{ lineNumber: 4, line: 'invalid row', message: 'Nieprawidłowa cena' }]
      });

      expect(result).toEqual({
        added: 1,
        updated: 2,
        errors: [{ lineNumber: 4, line: 'invalid row', message: 'Nieprawidłowa cena' }]
      });
      expect(result!.errors![0].lineNumber).toBe(4);
    });
  });
});
