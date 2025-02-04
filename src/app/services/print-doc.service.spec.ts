import { TestBed } from '@angular/core/testing';

import { PrintDocService } from './print-doc.service';

describe('PrintDocService', () => {
  let service: PrintDocService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrintDocService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
