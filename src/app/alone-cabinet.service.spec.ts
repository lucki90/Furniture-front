import {TestBed} from '@angular/core/testing';

import {AloneCabinetService} from './alone-cabinet.service';
import {provideHttpClient} from "@angular/common/http";
import {provideHttpClientTesting} from "@angular/common/http/testing";
import {importProvidersFrom} from "@angular/core";
import {MatListModule} from "@angular/material/list";
import {provideAnimations} from "@angular/platform-browser/animations";

describe('AloneCabinetService', () => {
  let service: AloneCabinetService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(MatListModule),
        provideAnimations()
      ]
    });
    service = TestBed.inject(AloneCabinetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
