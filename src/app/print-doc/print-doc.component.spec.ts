import {ComponentFixture, TestBed} from '@angular/core/testing';

import {PrintDocComponent} from './print-doc.component';
import {MaxLengthForNumberDirective} from "../utils/directives/maxLengthForNumberDirective";
import {PrintDocService} from "../services/print-doc.service";
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { provideAnimations } from '@angular/platform-browser/animations';

describe('PrintDocComponent', () => {
  let component: PrintDocComponent;
  let fixture: ComponentFixture<PrintDocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrintDocComponent, MaxLengthForNumberDirective],
      providers: [PrintDocService,
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(MatListModule),
        provideAnimations()
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PrintDocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
