import {ComponentFixture, TestBed} from '@angular/core/testing';

import {CabinetVisualizationComponent} from './cabinet-visualization.component';
import {MaxLengthForNumberDirective} from "../utils/directives/maxLengthForNumberDirective";
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { provideAnimations } from '@angular/platform-browser/animations';

describe('CabinetVisualizationComponent', () => {
  let component: CabinetVisualizationComponent;
  let fixture: ComponentFixture<CabinetVisualizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CabinetVisualizationComponent, MaxLengthForNumberDirective],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(MatListModule),
        provideAnimations()
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(CabinetVisualizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
