import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { CabinetVisualizationComponent } from '../cabinet-visualization/cabinet-visualization.component';
import { PrintDocComponent } from '../print-doc/print-doc.component';
import { PrintDocService } from '../print-doc/service/print-doc.service';
import { LanguageService } from '../service/language.service';
import { TranslationService } from '../translation/translation.service';
import { MaxLengthForNumberDirective } from '../utils/directives/maxLengthForNumberDirective';
import { DropdownComponent } from '../utils/dropdown/dropdown.component';
import { NumericInputComponent } from '../utils/numeric-input/numeric-input.component';
import { RadioButtonComponent } from '../utils/radio-button/radio-button.component';
import { AloneCabinetComponent } from './alone-cabinet.component';
import { CabinetResponse } from './model/cabinet-form.model';
import { AloneCabinetService } from './service/alone-cabinet.service';
import { HttpErrorResponse } from '@angular/common/http';

describe('AloneCabinetComponent', () => {
  let component: AloneCabinetComponent;
  let fixture: ComponentFixture<AloneCabinetComponent>;
  let cabinetService: jasmine.SpyObj<AloneCabinetService>;

  const translations = {
    'UI.cabinetType': 'Typ szafki',
    'UI.openingType': 'Typ otwierania',
    'UI.frontType': 'Uklad frontu',
    'UI.height': 'Wysokosc',
    'UI.width': 'Szerokosc',
    'UI.depth': 'Glebokosc',
    'BOARD_NAME.SIDE': 'Bok',
    'COMPONENT_CATEGORY.HINGE': 'Zawias',
    'JOB_CATEGORY.BOARD_CUTTING': 'Ciecie',
    'UNIT.PCS': 'szt.'
  };

  const language = signal<'pl' | 'en'>('pl');
  const languageService = {
    lang: language.asReadonly(),
    setLanguage: jasmine.createSpy('setLanguage').and.callFake((langCode: 'pl' | 'en') => language.set(langCode))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        AloneCabinetComponent,
        CabinetVisualizationComponent,
        PrintDocComponent,
        DropdownComponent,
        NumericInputComponent,
        RadioButtonComponent,
        MaxLengthForNumberDirective
      ],
      imports: [
        FormsModule,
        ReactiveFormsModule,
        MatIconModule,
        NoopAnimationsModule
      ],
      providers: [
        {
          provide: AloneCabinetService,
          useValue: jasmine.createSpyObj<AloneCabinetService>('AloneCabinetService', ['calculateCabinet', 'calculateMany'])
        },
        {
          provide: TranslationService,
          useValue: {
            getByCategories: () => of(translations),
            getDefaultTranslations: () => translations
          }
        },
        { provide: LanguageService, useValue: languageService },
        {
          provide: PrintDocService,
          useValue: jasmine.createSpyObj<PrintDocService>('PrintDocService', ['downloadExcel'])
        }
      ]
    }).compileComponents();

    cabinetService = TestBed.inject(AloneCabinetService) as jasmine.SpyObj<AloneCabinetService>;
    fixture = TestBed.createComponent(AloneCabinetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders the redesigned page shell and primary actions', () => {
    const title = fixture.nativeElement.querySelector('.alone-cabinet-page-title') as HTMLElement;
    const buttons = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.alone-cabinet-footer .btn, .alone-cabinet-footer .btn-footer'));

    expect(component).toBeTruthy();
    expect(title.textContent).toContain('Pojedyncza szafka');
    expect(buttons.some(button => button.textContent?.includes('Oblicz'))).toBeTrue();
    expect(buttons.some(button => button.textContent?.includes('Dodaj do serii'))).toBeTrue();
  });

  it('renders prepared requests in the queue panel', () => {
    component.multiRequests = [component['prepareRequestBody']()];
    fixture.detectChanges();

    const queueItems = fixture.nativeElement.querySelectorAll('.alone-cabinet-request-item');
    const queueChip = fixture.nativeElement.querySelector('.alone-cabinet-side-section .workspace-meta-chip') as HTMLElement;

    expect(queueItems.length).toBe(1);
    expect(queueChip.textContent).toContain('1 konfiguracja');
  });

  it('renders cost summary and result tables when response exists', () => {
    const response: CabinetResponse = {
      boards: [{
        boardName: 'SIDE',
        quantity: 2,
        sideX: 720,
        veneerX: 0,
        sideY: 500,
        veneerY: 0,
        boardThickness: 18,
        color: 'WHITE',
        veneerColor: 'WHITE',
        priceEntry: { price: 25, unit: 'UNIT.PCS' },
        totalPrice: 50,
        remarks: '',
        translationKey: 'BOARD_NAME.SIDE'
      }],
      components: [{
        category: 'HINGE',
        model: 'MODEL-A',
        quantity: 4,
        additionalInfo: null,
        priceEntry: { price: 2.5, unit: 'UNIT.PCS' },
        totalPrice: 10,
        translationKey: 'COMPONENT.HINGE.MODEL-A'
      }],
      jobs: [{
        category: 'BOARD_CUTTING',
        type: 'STRAIGHT',
        quantity: 2,
        additionalInfo: undefined,
        priceEntry: { price: 8, unit: 'UNIT.PCS' },
        totalPrice: 16,
        translationKey: 'JOB_TYPE.STRAIGHT'
      }],
      summaryCosts: 76,
      boardTotalCost: 50,
      componentTotalCost: 10,
      jobTotalCost: 16
    };

    component.response = response;
    component.view = 'costs';
    fixture.detectChanges();

    const summaryCards = fixture.nativeElement.querySelectorAll('.alone-cabinet-summary-card');
    const tables = fixture.nativeElement.querySelectorAll('.alone-cabinet-result-table');

    expect(summaryCards.length).toBe(4);
    expect(summaryCards[0].textContent).toContain('76.00 PLN');
    expect(tables.length).toBe(3);
  });

  it('maps backend validation errors to the matching field summary', () => {
    cabinetService.calculateCabinet.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              title: 'VALIDATION_ERROR',
              status: 400,
              path: '/api/furniture/alone/calculate',
              errorId: 'FA-4RFT4UXL',
              timestamp: '2026-05-14T18:25:29+02:00',
              errors: [
                {
                  field: 'drawerRequest.drawerQuantity',
                  code: 'ex.drawer.quantity.min',
                  message: 'Drawer quantity is below minimum allowed.',
                  arguments: { min: '1' }
                }
              ],
              code: 'ex.validation.failed',
              message: 'Validation failed.'
            }
          })
      )
    );

    component.calculate(false);
    fixture.detectChanges();

    const summary = fixture.nativeElement.querySelector('.alone-cabinet-validation-summary') as HTMLElement;
    expect(summary.textContent).toContain('Liczba szuflad');
    expect(summary.textContent).toContain('Drawer quantity is below minimum allowed.');
  });
});
