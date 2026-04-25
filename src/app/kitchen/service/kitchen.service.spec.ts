import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KitchenService } from './kitchen.service';

describe('KitchenService', () => {
  let service: KitchenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(KitchenService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
