import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LanguageService } from '../../service/language.service';
import { TranslationService } from '../../translation/translation.service';
import { ApiErrorDisplayOptions, ApiErrorResponse } from './api-error.model';
import { ErrorTranslationService } from './error-translation.service';

describe('ErrorTranslationService display options', () => {
  let service: ErrorTranslationService;
  let translationService: jasmine.SpyObj<TranslationService>;

  const displayOptions: ApiErrorDisplayOptions = {
    formatArgument: (key, value) => {
      const labels: Record<string, string> = {
        'cabinet-3': '#2 „Zlew”',
        'cabinet-8': '#3',
        'cabinet-30': '#4'
      };
      return /^cabinetId\d*$/.test(key) ? labels[value] ?? value : value;
    }
  };

  beforeEach(() => {
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getByCategories']);
    translationService.getByCategories.and.returnValue(of({
      'ex.cabinets.overlap': 'Szafki {{cabinetId1}} i {{cabinetId2}} nachodzą na siebie'
    }));

    TestBed.configureTestingModule({
      providers: [
        ErrorTranslationService,
        { provide: TranslationService, useValue: translationService },
        { provide: LanguageService, useValue: { lang: signal('pl') } }
      ]
    });

    service = TestBed.inject(ErrorTranslationService);
    service.loadForLang('pl');
  });

  it('formats cabinet identifiers before interpolating a translated message', () => {
    const [translated] = service.translateApiError(apiError({
      code: 'ex.cabinets.overlap',
      arguments: { cabinetId1: 'cabinet-3', cabinetId2: 'cabinet-8' }
    }), displayOptions);

    expect(translated.message).toBe('Szafki #2 „Zlew” i #3 nachodzą na siebie');
    expect(translated.details).toEqual([]);
  });

  it('formats cabinet identifiers in fallback messages and details', () => {
    const [translated] = service.translateApiError(apiError({
      code: 'ex.untranslated.layout',
      message: "Cabinets 'cabinet-3' and 'cabinet-30' overlap",
      arguments: { cabinetId1: 'cabinet-3', cabinetId2: 'cabinet-30' }
    }), displayOptions);

    expect(translated.message).toBe("Cabinets '#2 „Zlew”' and '#4' overlap");
    expect(translated.details).toEqual([
      'Szafka 1: #2 „Zlew”',
      'Szafka 2: #4'
    ]);
  });
});

function apiError(overrides: Pick<ApiErrorResponse, 'code' | 'arguments'> & Partial<ApiErrorResponse>): ApiErrorResponse {
  return {
    title: 'VALIDATION_ERROR',
    status: 400,
    path: '/api/kitchen/projects/calculate',
    errorId: 'error-1',
    timestamp: '2026-10-01T00:00:00Z',
    ...overrides
  };
}
