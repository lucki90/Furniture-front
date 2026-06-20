import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslationService } from './translation.service';
import { environment } from '../../environments/environment';

describe('TranslationService', () => {
  let service: TranslationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TranslationService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(TranslationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('współdzieli równoległe zapytania o tę samą kategorię', () => {
    const firstResult: Record<string, string>[] = [];
    const secondResult: Record<string, string>[] = [];

    service.getByCategory('MATERIAL', 'pl').subscribe(result => firstResult.push(result));
    service.getByCategory('MATERIAL', 'pl').subscribe(result => secondResult.push(result));

    const request = httpMock.expectOne(req =>
      req.url === `${environment.apiUrl}/translation`
      && req.params.get('category') === 'MATERIAL'
      && req.params.get('lang') === 'pl'
    );
    request.flush({ 'MATERIAL.CHIPBOARD': 'Płyta wiórowa' });

    expect(firstResult).toEqual([{ 'MATERIAL.CHIPBOARD': 'Płyta wiórowa' }]);
    expect(secondResult).toEqual(firstResult);
    httpMock.expectNone(`${environment.apiUrl}/translation`);
  });

  it('zwraca zapisany wynik bez ponownego wywołania HTTP', () => {
    service.getByCategory('BOARD_NAME', 'pl').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/translation?category=BOARD_NAME&lang=pl`)
      .flush({ 'BOARD_NAME.SIDE': 'Bok' });

    let cached: Record<string, string> | undefined;
    service.getByCategory('BOARD_NAME', 'pl').subscribe(result => cached = result);

    expect(cached).toEqual({ 'BOARD_NAME.SIDE': 'Bok' });
    httpMock.expectNone(`${environment.apiUrl}/translation?category=BOARD_NAME&lang=pl`);
  });

  it('normalizuje kolejność i duplikaty kategorii w cache batch', () => {
    service.getByCategories(['MATERIAL', 'BOARD_NAME', 'MATERIAL'], 'pl').subscribe();
    service.getByCategories(['BOARD_NAME', 'MATERIAL'], 'pl').subscribe();

    const request = httpMock.expectOne(req =>
      req.url === `${environment.apiUrl}/translation/batch`
      && req.params.get('lang') === 'pl'
    );
    expect(request.request.params.get('categories')).toBe('BOARD_NAME,MATERIAL');
    request.flush({ 'BOARD_NAME.SIDE': 'Bok' });
  });

  it('dla pustej listy kategorii zwraca pusty wynik bez wywołania HTTP', () => {
    let result: Record<string, string> | undefined;

    service.getByCategories([], 'pl').subscribe(translations => result = translations);

    expect(result).toEqual({});
    httpMock.expectNone(`${environment.apiUrl}/translation/batch`);
  });

  it('po upływie TTL pobiera tłumaczenia ponownie', () => {
    const nowSpy = spyOn(Date, 'now');
    nowSpy.and.returnValue(1_000);
    service.getAll('pl').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/translation/all?lang=pl`).flush({ A: 'Pierwsza' });

    nowSpy.and.returnValue(1_000 + 30 * 60 * 1000 + 1);

    let refreshed: Record<string, string> | undefined;
    service.getAll('pl').subscribe(result => refreshed = result);
    httpMock.expectOne(`${environment.apiUrl}/translation/all?lang=pl`).flush({ A: 'Druga' });

    expect(refreshed).toEqual({ A: 'Druga' });
  });

  it('usuwa błędny request z cache i pozwala ponowić zapytanie', () => {
    let errorStatus: number | undefined;
    service.getByCategory('MATERIAL', 'pl').subscribe({
      error: error => errorStatus = error.status
    });
    httpMock.expectOne(`${environment.apiUrl}/translation?category=MATERIAL&lang=pl`)
      .flush('Błąd', { status: 500, statusText: 'Server Error' });

    service.getByCategory('MATERIAL', 'pl').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/translation?category=MATERIAL&lang=pl`)
      .flush({ 'MATERIAL.CHIPBOARD': 'Płyta wiórowa' });

    expect(errorStatus).toBe(500);
  });

  it('upsert unieważnia cache single, batch i all tylko dla zmienionego języka', () => {
    service.getByCategory('MATERIAL', 'pl').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/translation?category=MATERIAL&lang=pl`).flush({ A: 'PL' });
    service.getByCategories(['MATERIAL'], 'pl').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/translation/batch?categories=MATERIAL&lang=pl`).flush({ A: 'PL' });
    service.getAll('pl').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/translation/all?lang=pl`).flush({ A: 'PL' });
    service.getAll('en').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/translation/all?lang=en`).flush({ A: 'EN' });

    service.upsertTranslations('MATERIAL.CHIPBOARD', [{ lang: 'pl', value: 'Nowa wartość' }]).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/translation/upsert`).flush(null);

    service.getByCategory('MATERIAL', 'pl').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/translation?category=MATERIAL&lang=pl`).flush({ A: 'Nowe PL' });
    service.getByCategories(['MATERIAL'], 'pl').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/translation/batch?categories=MATERIAL&lang=pl`).flush({ A: 'Nowe PL' });
    service.getAll('pl').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/translation/all?lang=pl`).flush({ A: 'Nowe PL' });

    let englishResult: Record<string, string> | undefined;
    service.getAll('en').subscribe(result => englishResult = result);
    expect(englishResult).toEqual({ A: 'EN' });
    httpMock.expectNone(`${environment.apiUrl}/translation/all?lang=en`);
  });

  it('clearCache usuwa wszystkie zapisane wyniki', () => {
    service.getByCategory('MATERIAL', 'pl').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/translation?category=MATERIAL&lang=pl`).flush({ A: 'Pierwsza' });

    service.clearCache();
    let refreshed: Record<string, string> | undefined;
    service.getByCategory('MATERIAL', 'pl').subscribe(result => refreshed = result);

    httpMock.expectOne(`${environment.apiUrl}/translation?category=MATERIAL&lang=pl`).flush({ A: 'Druga' });
    expect(refreshed).toEqual({ A: 'Druga' });
  });

  it('zwraca kopię domyślnych tłumaczeń', () => {
    const first = service.getDefaultTranslations();
    const second = service.getDefaultTranslations();

    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });
});
