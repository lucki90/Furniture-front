import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LanguageService } from '../../service/language.service';
import { TranslationService } from '../../translation/translation.service';
import { KitchenBomTranslationsService } from './kitchen-bom-translations.service';

describe('KitchenBomTranslationsService', () => {
  it('pobiera nazwy płyt, materiały oraz materiały blatu i cokołu w aktywnym języku', () => {
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getByCategories']);
    translationService.getByCategories.and.returnValue(of({ 'PLINTH_MATERIAL.PVC': 'PVC (standard)' }));
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslationService, useValue: translationService },
        { provide: LanguageService, useValue: { lang: signal('en') } }
      ]
    });

    const received: Record<string, string>[] = [];
    TestBed.runInInjectionContext(() => TestBed.inject(KitchenBomTranslationsService).watchTranslations())
      .subscribe(translations => received.push(translations));
    TestBed.tick();

    expect(translationService.getByCategories).toHaveBeenCalledOnceWith(
      ['BOARD_NAME', 'MATERIAL', 'COUNTERTOP_MATERIAL', 'PLINTH_MATERIAL'],
      'en'
    );
    expect(received).toEqual([{ 'PLINTH_MATERIAL.PVC': 'PVC (standard)' }]);
  });
});
