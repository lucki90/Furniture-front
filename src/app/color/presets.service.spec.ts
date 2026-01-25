import { TestBed } from '@angular/core/testing';

import { PresetsService } from './presets.service';

describe('PresetsService', () => {
  let service: PresetsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PresetsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
