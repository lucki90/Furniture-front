import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../service/language.service';
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
