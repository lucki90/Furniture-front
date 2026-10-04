import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Subject, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppLanguage, LanguageService } from '../../service/language.service';
import { TranslationService } from '../../translation/translation.service';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { ToastService } from '../../core/error/toast.service';
import { drawersPresetFixture } from '../../kitchen/cabinet-presets/testing/cabinet-preset.fixture';
import { CabinetPresetOption, CabinetPresetResponse } from '../../kitchen/model/cabinet-preset.model';
import { CabinetPresetService } from '../../kitchen/service/cabinet-preset.service';
import { CabinetPresetsSectionComponent } from './cabinet-presets-section.component';

describe('CabinetPresetsSectionComponent', () => {
  const presets = signal<CabinetPresetResponse[]>([]);
  const option = (preset: CabinetPresetResponse): CabinetPresetOption =>
    ({ preset, label: preset.name ?? 'Dolna 600 z 3 szufladami', dimensions: '600×720×500' });
  let presetService: {
    ensureLoaded: jasmine.Spy; rename: jasmine.Spy; remove: jasmine.Spy;
    builtInOptions: ReturnType<typeof computed<CabinetPresetOption[]>>;
    ownOptions: ReturnType<typeof computed<CabinetPresetOption[]>>;
  };
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(() => {
    presets.set([drawersPresetFixture(), drawersPresetFixture({ id: 40, system: false, name: 'Moja' })]);
    presetService = {
      ensureLoaded: jasmine.createSpy('ensureLoaded'),
      rename: jasmine.createSpy('rename').and.returnValue(of({})),
      remove: jasmine.createSpy('remove').and.returnValue(of(undefined)),
      builtInOptions: computed(() => presets().filter(p => p.system).map(option)),
      ownOptions: computed(() => presets().filter(p => !p.system).map(option))
    };
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    TestBed.configureTestingModule({
      imports: [CabinetPresetsSectionComponent],
      providers: [
        { provide: CabinetPresetService, useValue: presetService },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success']) },
        { provide: ApiErrorHandler, useValue: jasmine.createSpyObj('ApiErrorHandler', ['handle']) }
      ]
    });
  });

  function render() {
    const fixture = TestBed.createComponent(CabinetPresetsSectionComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('wbudowane bez akcji, własne ze zmianą nazwy i usunięciem', () => {
    const element = render();

    expect(presetService.ensureLoaded).toHaveBeenCalled();
    expect(element.querySelectorAll('.presets-item--system button').length).toBe(0);
    expect(element.querySelectorAll('.presets-item--own .preset-rename-btn').length).toBe(1);
  });

  it('zmiana nazwy i usunięcie po potwierdzeniu w oknie', () => {
    const element = render();

    dialog.open.and.returnValue({ afterClosed: () => of('Moja nowa') } as never);
    (element.querySelector('.preset-rename-btn') as HTMLButtonElement).click();
    expect(presetService.rename).toHaveBeenCalledWith(40, 'Moja nowa');

    dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);
    (element.querySelector('.preset-remove-btn') as HTMLButtonElement).click();
    expect(presetService.remove).not.toHaveBeenCalled();

    dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
    (element.querySelector('.preset-remove-btn') as HTMLButtonElement).click();
    expect(presetService.remove).toHaveBeenCalledWith(40);
  });
});

describe('CabinetPresetsSectionComponent z prawdziwym serwisem presetów', () => {
  const url = `${environment.apiUrl}/kitchen/cabinet-presets`;

  it('lista jest dostępna przy błędzie tłumaczeń, etykieta wbudowanego reaguje na język, katalog pobrany raz', () => {
    const lang = signal<AppLanguage>('pl');
    const responses: Subject<Record<string, string>>[] = [];
    TestBed.configureTestingModule({
      imports: [CabinetPresetsSectionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LanguageService, useValue: { lang } },
        {
          provide: TranslationService,
          useValue: {
            getByCategories: () => {
              const response = new Subject<Record<string, string>>();
              responses.push(response);
              return response;
            }
          }
        },
        { provide: MatDialog, useValue: jasmine.createSpyObj<MatDialog>('MatDialog', ['open']) },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success']) },
        { provide: ApiErrorHandler, useValue: jasmine.createSpyObj('ApiErrorHandler', ['handle']) }
      ]
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CabinetPresetsSectionComponent);
    fixture.detectChanges();
    http.expectOne(url).flush([drawersPresetFixture(), drawersPresetFixture({ id: 40, system: false, name: 'Moja' })]);
    responses[0].error(new Error('translations down'));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const labels = (selector: string) =>
      Array.from(element.querySelectorAll(`${selector} .presets-item__label`)).map(node => node.textContent?.trim());

    expect(labels('.presets-item--system')).toEqual(['Dolna 600 z 3 szufladami']);
    expect(labels('.presets-item--own')).toEqual(['Moja']);

    lang.set('en');
    fixture.detectChanges();
    responses[1].next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Base 600 drawers' });
    fixture.detectChanges();

    expect(labels('.presets-item--system')).toEqual(['Base 600 drawers']);
    expect(labels('.presets-item--own')).toEqual(['Moja']);
    http.expectNone(url);
    http.verify();
  });
});
