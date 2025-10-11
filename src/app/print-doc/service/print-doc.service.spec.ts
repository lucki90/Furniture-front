import {TestBed} from '@angular/core/testing';

import {PrintDocService} from './print-doc.service';
import {HttpClientTestingModule, provideHttpClientTesting} from "@angular/common/http/testing";
import {provideHttpClient} from '@angular/common/http';

describe('PrintDocService', () => {
  let service: PrintDocService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], // ← TO JEST KLUCZ
      providers: [
        PrintDocService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PrintDocService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
