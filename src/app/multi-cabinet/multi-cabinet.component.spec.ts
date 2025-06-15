import {ComponentFixture, TestBed} from '@angular/core/testing';

import {MultiCabinetComponent} from './multi-cabinet.component';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { provideAnimations } from '@angular/platform-browser/animations';

describe('MultiCabinetComponent', () => {
  let component: MultiCabinetComponent;
  let fixture: ComponentFixture<MultiCabinetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MultiCabinetComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(MatListModule),
        provideAnimations()
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MultiCabinetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
