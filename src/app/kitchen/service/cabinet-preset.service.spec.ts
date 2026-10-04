import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppLanguage, LanguageService } from '../../service/language.service';
import { TranslationService } from '../../translation/translation.service';
import { drawersPresetFixture } from '../cabinet-presets/testing/cabinet-preset.fixture';
import { ProjectCabinetRequest } from '../model/kitchen-project.model';
import { CabinetPresetService, cabinetPresetLabel } from './cabinet-preset.service';

describe('CabinetPresetService', () => {
  const url = `${environment.apiUrl}/kitchen/cabinet-presets`;
  let service: CabinetPresetService;
  let http: HttpTestingController;
  let translations: jasmine.SpyObj<TranslationService>;

  beforeEach(() => {
    translations = jasmine.createSpyObj<TranslationService>('TranslationService', ['getByCategories']);
    translations.getByCategories.and.returnValue(of({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Base 600 drawers' }));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TranslationService, useValue: translations },
        { provide: LanguageService, useValue: { lang: signal('en') } }
      ]
    });
    service = TestBed.inject(CabinetPresetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function loadWith(): void {
    service.ensureLoaded();
    http.expectOne(url).flush([
      drawersPresetFixture(),
      drawersPresetFixture({ id: 2, translationKey: 'CABINET_PRESET.UPPER_ONE_DOOR_600', widthMm: 600, depthMm: 340 }),
      drawersPresetFixture({ id: 40, system: false, translationKey: null, name: 'Moja szuflada', widthMm: 800 })
    ]);
  }

  it('P1: etykiety z tłumaczeń w języku interfejsu, zapasowo domyślne; podział na wbudowane i własne', () => {
    loadWith();

    expect(translations.getByCategories).toHaveBeenCalledWith(['CABINET_PRESET'], 'en');
    expect(service.builtInOptions().map(option => option.label)).toEqual(['Base 600 drawers', 'Wisząca 600 z drzwiami']);
    expect(service.builtInOptions()[1].dimensions).toBe('600×720×340');
    expect(service.ownOptions().map(option => option.label)).toEqual(['Moja szuflada']);
    expect(service.loaded()).toBeTrue();

    service.ensureLoaded();
    http.expectNone(url);
  });

  it('zapis, zmiana nazwy i usunięcie aktualizują listę', () => {
    loadWith();
    const cabinet = { cabinetId: 'cab-1' } as ProjectCabinetRequest;

    service.create('Narożna', cabinet).subscribe();
    const create = http.expectOne(url);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ name: 'Narożna', cabinet });
    create.flush(drawersPresetFixture({ id: 41, system: false, translationKey: null, name: 'Narożna' }));
    expect(service.ownOptions().map(option => option.label)).toEqual(['Moja szuflada', 'Narożna']);

    service.rename(41, 'Narożna 900').subscribe();
    const rename = http.expectOne(`${url}/41`);
    expect(rename.request.method).toBe('PATCH');
    rename.flush(drawersPresetFixture({ id: 41, system: false, translationKey: null, name: 'Narożna 900' }));
    expect(service.ownOptions()[1].label).toBe('Narożna 900');

    service.remove(40).subscribe();
    const remove = http.expectOne(`${url}/40`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
    expect(service.ownOptions().map(option => option.preset.id)).toEqual([41]);
  });

  it('zapis przy niewczytanej liście wczytuje całą listę zamiast dopisywać', () => {
    service.ensureLoaded();
    http.expectOne(url).flush('błąd', { status: 500, statusText: 'Server Error' });
    expect(service.loaded()).toBeFalse();

    service.create('Narożna', { cabinetId: 'cab-1' } as ProjectCabinetRequest).subscribe();
    http.expectOne(request => request.method === 'POST').flush(
      drawersPresetFixture({ id: 41, system: false, translationKey: null, name: 'Narożna' }));
    http.expectOne(request => request.method === 'GET').flush([
      drawersPresetFixture(), drawersPresetFixture({ id: 41, system: false, translationKey: null, name: 'Narożna' })
    ]);

    expect(service.builtInOptions()).toHaveSize(1);
    expect(service.ownOptions().map(option => option.label)).toEqual(['Narożna']);
  });

  it('nieznany klucz tłumaczenia — etykietą jest klucz', () => {
    expect(cabinetPresetLabel(drawersPresetFixture({ translationKey: 'CABINET_PRESET.X' }), {}))
      .toBe('CABINET_PRESET.X');
  });
});

describe('CabinetPresetService — tłumaczenia i język', () => {
  const url = `${environment.apiUrl}/kitchen/cabinet-presets`;
  const builtIn = drawersPresetFixture();
  const own = drawersPresetFixture({ id: 40, system: false, translationKey: null, name: 'Moja szuflada' });
  let service: CabinetPresetService;
  let http: HttpTestingController;
  let lang: ReturnType<typeof signal<AppLanguage>>;
  let requests: { lang: string; response: Subject<Record<string, string>> }[];

  beforeEach(() => {
    requests = [];
    lang = signal<AppLanguage>('pl');
    const translations = {
      getByCategories: jasmine.createSpy('getByCategories').and.callFake((_: string[], requestedLang: string) => {
        const response = new Subject<Record<string, string>>();
        requests.push({ lang: requestedLang, response });
        return response;
      })
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TranslationService, useValue: translations },
        { provide: LanguageService, useValue: { lang } }
      ]
    });
    service = TestBed.inject(CabinetPresetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const labels = () => service.options().map(option => option.label);

  function loadCatalog(): void {
    service.ensureLoaded();
    http.expectOne(url).flush([builtIn, own]);
  }

  function changeLanguage(next: AppLanguage): void {
    lang.set(next);
    TestBed.tick();
  }

  it('błąd tłumaczeń nie gubi katalogu — presety są dostępne z zapasowymi etykietami', () => {
    loadCatalog();
    requests[0].response.error(new Error('translations down'));

    expect(service.loaded()).toBeTrue();
    expect(service.presets()).toHaveSize(2);
    expect(labels()).toEqual(['Dolna 600 z 3 szufladami', 'Moja szuflada']);
  });

  it('błąd tłumaczeń przed odpowiedzią katalogu też nie blokuje katalogu', () => {
    service.ensureLoaded();
    requests[0].response.error(new Error('translations down'));
    http.expectOne(url).flush([builtIn, own]);

    expect(service.loaded()).toBeTrue();
    expect(labels()).toEqual(['Dolna 600 z 3 szufladami', 'Moja szuflada']);
  });

  it('błąd katalogu pozostaje błędem pobrania i pozwala na świadome ponowne wczytanie', () => {
    let error: unknown;
    service.load().subscribe({ error: e => error = e });
    requests[0].response.next({});
    http.expectOne(url).flush('błąd', { status: 500, statusText: 'Server Error' });

    expect(error).toBeDefined();
    expect(service.loaded()).toBeFalse();
    expect(service.presets()).toEqual([]);

    service.ensureLoaded();
    http.expectOne(url).flush([builtIn]);
    requests[1].response.next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Base 600 drawers' });
    expect(service.loaded()).toBeTrue();
    expect(labels()).toEqual(['Base 600 drawers']);
  });

  it('zmiana języka po udanym wczytaniu przestawia etykiety wbudowanych bez ponownego GET katalogu', () => {
    loadCatalog();
    requests[0].response.next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Dolna 600 PL' });
    expect(labels()).toEqual(['Dolna 600 PL', 'Moja szuflada']);

    changeLanguage('en');
    expect(requests[1].lang).toBe('en');
    requests[1].response.next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Base 600 drawers' });
    expect(labels()).toEqual(['Base 600 drawers', 'Moja szuflada']);

    changeLanguage('pl');
    requests[2].response.next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Dolna 600 PL' });
    expect(labels()).toEqual(['Dolna 600 PL', 'Moja szuflada']);

    expect(service.ownOptions()[0].preset).toEqual(own);
    http.expectNone(url);
  });

  it('zmiana języka działa także po wcześniejszym błędzie tłumaczeń, a obserwacja nie kończy się na błędzie', () => {
    loadCatalog();
    requests[0].response.error(new Error('translations down'));

    changeLanguage('en');
    requests[1].response.next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Base 600 drawers' });
    expect(labels()).toEqual(['Base 600 drawers', 'Moja szuflada']);

    changeLanguage('pl');
    requests[2].response.error(new Error('again'));
    expect(labels()).toEqual(['Dolna 600 z 3 szufladami', 'Moja szuflada']);

    changeLanguage('en');
    requests[3].response.next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Base 600 drawers' });
    expect(labels()).toEqual(['Base 600 drawers', 'Moja szuflada']);
  });

  it('najnowszy język wygrywa — spóźniona odpowiedź starego języka nie nadpisuje słownika', () => {
    loadCatalog();
    requests[0].response.next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Dolna 600 PL' });

    changeLanguage('en');
    changeLanguage('pl');
    changeLanguage('en');
    expect(requests.map(request => request.lang)).toEqual(['pl', 'en', 'pl', 'en']);

    requests[3].response.next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Base 600 drawers' });
    requests[2].response.next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Dolna 600 PL (spóźnione)' });
    requests[1].response.error(new Error('stary błąd'));

    expect(labels()).toEqual(['Base 600 drawers', 'Moja szuflada']);
  });

  it('język zmieniony w trakcie pierwszego wczytania — stary słownik nie trafia do katalogu', () => {
    service.ensureLoaded();
    changeLanguage('en');
    http.expectOne(url).flush([builtIn]);
    requests[1].response.next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Base 600 drawers' });
    requests[0].response.next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Dolna 600 PL' });

    expect(service.loaded()).toBeTrue();
    expect(labels()).toEqual(['Base 600 drawers']);
  });

  it('bez użycia serwisu zmiana języka nie pobiera niczego', () => {
    changeLanguage('en');

    expect(requests).toHaveSize(0);
    http.expectNone(url);
  });

  it('create, rename i remove po zmianie języka aktualizują listę, a zmiana języka ich nie anuluje', () => {
    loadCatalog();
    requests[0].response.next({});

    service.create('Narożna', { cabinetId: 'cab-1' } as ProjectCabinetRequest).subscribe();
    const create = http.expectOne(request => request.method === 'POST');
    changeLanguage('en');
    requests[1].response.next({ 'CABINET_PRESET.BASE_WITH_DRAWERS_600': 'Base 600 drawers' });
    expect(create.cancelled).toBeFalse();
    create.flush(drawersPresetFixture({ id: 41, system: false, translationKey: null, name: 'Narożna' }));

    expect(labels()).toEqual(['Base 600 drawers', 'Moja szuflada', 'Narożna']);

    service.remove(40).subscribe();
    http.expectOne(`${url}/40`).flush(null);
    expect(labels()).toEqual(['Base 600 drawers', 'Narożna']);
    http.expectNone(url);
  });

  it('zniszczenie injectora kończy obserwację języka i oczekujące żądanie tłumaczeń', () => {
    loadCatalog();
    const pending = requests[0].response;
    expect(pending.observed).toBeTrue();

    TestBed.resetTestingModule();

    expect(pending.observed).toBeFalse();
    lang.set('en');
    expect(requests).toHaveSize(1);
  });
});
