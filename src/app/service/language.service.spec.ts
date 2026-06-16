import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  const storageKey = 'app-language';

  beforeEach(() => {
    localStorage.removeItem(storageKey);
  });

  afterEach(() => {
    localStorage.removeItem(storageKey);
    TestBed.resetTestingModule();
  });

  it('powinien odtworzyć wspierany język z localStorage', () => {
    localStorage.setItem(storageKey, 'en');

    const service = TestBed.inject(LanguageService);

    expect(service.lang()).toBe('en');
  });

  it('powinien zapisać wybrany język w browser storage', () => {
    const service = TestBed.inject(LanguageService);

    service.setLanguage('en');

    expect(service.lang()).toBe('en');
    expect(localStorage.getItem(storageKey)).toBe('en');
  });

  it('nie powinien używać browser storage poza platformą przeglądarkową', () => {
    const getItemSpy = spyOn(Storage.prototype, 'getItem').and.callThrough();
    const setItemSpy = spyOn(Storage.prototype, 'setItem').and.callThrough();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });

    const service = TestBed.inject(LanguageService);
    service.setLanguage('en');

    expect(service.lang()).toBe('en');
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
