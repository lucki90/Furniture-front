import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SecretLockerComponent} from './secret-locker.component';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {importProvidersFrom} from '@angular/core';
import {MatListModule} from '@angular/material/list';
import {provideAnimations} from '@angular/platform-browser/animations';

describe('SecretLockerComponent', () => {
  let component: SecretLockerComponent;
  let fixture: ComponentFixture<SecretLockerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SecretLockerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(MatListModule),
        provideAnimations()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecretLockerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
