import {ComponentFixture, TestBed} from '@angular/core/testing';

import {AloneCabinetComponent} from './alone-cabinet.component';
import {MaxLengthForNumberDirective} from "../utils/directives/maxLengthForNumberDirective";

import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {importProvidersFrom} from '@angular/core';
import {MatListModule} from '@angular/material/list';
import {provideAnimations} from '@angular/platform-browser/animations';

describe('AloneCabinetComponent', () => {
  let component: AloneCabinetComponent;
  let fixture: ComponentFixture<AloneCabinetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AloneCabinetComponent, MaxLengthForNumberDirective],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(MatListModule),
        provideAnimations()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AloneCabinetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
