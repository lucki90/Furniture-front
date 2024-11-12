import { TestBed } from '@angular/core/testing';

import { AloneCabinetService } from './alone-cabinet.service';

describe('AloneCabinetService', () => {
  let service: AloneCabinetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AloneCabinetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
