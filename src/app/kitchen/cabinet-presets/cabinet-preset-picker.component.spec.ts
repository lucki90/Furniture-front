import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppLanguage, LanguageService } from '../../service/language.service';
import { TranslationService } from '../../translation/translation.service';
import { CabinetPresetOption, CabinetPresetResponse } from '../model/cabinet-preset.model';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { CabinetPresetService } from '../service/cabinet-preset.service';
import { CabinetPresetPickerComponent } from './cabinet-preset-picker.component';
import { drawersPresetFixture } from './testing/cabinet-preset.fixture';

describe('CabinetPresetPickerComponent', () => {
  const presets = signal<CabinetPresetResponse[]>([]);
  const option = (preset: CabinetPresetResponse): CabinetPresetOption =>
    ({ preset, label: preset.name ?? 'Dolna 600 z 3 szufladami', dimensions: '600×720×500' });
  const presetService = {
    presets,
    options: computed(() => presets().map(option)),
    builtInOptions: computed(() => presets().filter(p => p.system).map(option)),
    ownOptions: computed(() => presets().filter(p => !p.system).map(option)),
    ensureLoaded: jasmine.createSpy('ensureLoaded')
  };

  beforeEach(() => {
    presets.set([drawersPresetFixture(), drawersPresetFixture({ id: 40, system: false, name: 'Moja' })]);
    TestBed.configureTestingModule({
      imports: [CabinetPresetPickerComponent],
      providers: [{ provide: CabinetPresetService, useValue: presetService }]
    });
  });

  it('wybór presetu przekazuje szafkę do formularza i czyści listę', () => {
    const fixture = TestBed.createComponent(CabinetPresetPickerComponent);
    const selected: KitchenCabinet[] = [];
    fixture.componentInstance.presetSelected.subscribe(cabinet => selected.push(cabinet));
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;

    expect(presetService.ensureLoaded).toHaveBeenCalled();
    expect(select.querySelectorAll('optgroup').length).toBe(2);

    fixture.componentInstance.selection.setValue(1);
    fixture.detectChanges();

    expect(selected).toHaveSize(1);
    expect(selected[0].type).toBe('BASE_WITH_DRAWERS');
    expect(selected[0].width).toBe(600);
    expect(selected[0].id).toBe('preset-1');
    expect(fixture.componentInstance.selection.value).toBeNull();
  });

  it('bez presetów wybór jest ukryty', () => {
    presets.set([]);
    const fixture = TestBed.createComponent(CabinetPresetPickerComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });
});

describe('CabinetPresetPickerComponent z prawdziwym serwisem presetów', () => {
  const url = `${environment.apiUrl}/kitchen/cabinet-presets`;
  let lang: ReturnType<typeof signal<AppLanguage>>;
  let translationResponses: Subject<Record<string, string>>[];

  beforeEach(() => {
    lang = signal<AppLanguage>('pl');
    translationResponses = [];
    TestBed.configureTestingModule({
      imports: [CabinetPresetPickerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LanguageService, useValue: { lang } },
        {
          provide: TranslationService,
          useValue: {
            getByCategories: () => {
              const response = new Subject<Record<string, string>>();
              translationResponses.push(response);
              return response;
            }
          }
        }
      ]
    });
  });

  it('presety są dostępne przy błędzie tłumaczeń, a etykieta wbudowanego reaguje na język', () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CabinetPresetPickerComponent);
    fixture.detectChanges();
    http.expectOne(url).flush([drawersPresetFixture(), drawersPresetFixture({ id: 40, system: false, name: 'Moja' })]);
    translationResponses[0].error(new Error('translations down'));
    fixture.detectChanges();

    const optionTexts = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('option'))
      .map(element => element.textContent?.trim());
    expect(optionTexts()).toEqual([
      'Wybierz preset…', 'Dolna 600 z 3 szufladami · 600×720×500', 'Moja · 600×720×500'
    ]);

    lang.set('en');
    fixture.detectChanges();
    translationResponses[1].next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Base 600 drawers' });
    fixture.detectChanges();

    expect(optionTexts()).toEqual(['Wybierz preset…', 'Base 600 drawers · 600×720×500', 'Moja · 600×720×500']);
    http.expectNone(url);
    http.verify();
  });
});
