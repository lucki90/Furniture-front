import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, Subject, of } from 'rxjs';
import { MaterialAdminService } from '../admin/material/service/material-admin.service';
import { LanguageService } from '../service/language.service';
import { KitchenStateService } from '../kitchen/service/kitchen-state.service';
import { MaterialPresetService } from '../kitchen/service/material-preset.service';
import { TranslationService } from '../translation/translation.service';
import { BoardPriceService } from './board-price.service';
import { ComponentPriceService } from './component-price.service';
import { JobPriceService } from './job-price.service';
import { DEFAULT_USER_SETTINGS, UpdateUserSettingsRequest, UserSettings } from './settings.model';
import { SettingsService } from './settings.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent — rzaz', () => {
  let settingsService: jasmine.SpyObj<SettingsService>;
  let component: SettingsComponent;

  beforeEach(() => {
    settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', ['getSettings', 'updateSettings']);

    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: settingsService },
        { provide: KitchenStateService, useValue: { setGlobalDefaults: () => {}, setMaterialDefaults: () => {} } },
        { provide: TranslationService, useValue: { getByCategories: () => of({}) } },
        { provide: LanguageService, useValue: { lang: signal('pl') } },
        { provide: MaterialAdminService, useValue: {} },
        { provide: MaterialPresetService, useValue: {} }
      ]
    });

    component = TestBed.runInInjectionContext(() => new SettingsComponent());
  });

  it('wczytuje rzaz i zachowuje go razem z priorytetem w żądaniu zapisu', () => {
    settingsService.getSettings.and.returnValue(of({
      ...DEFAULT_USER_SETTINGS,
      cuttingKerfMm: 5,
      cuttingOptimizationPriority: 'FEWEST_CUTS'
    }));
    settingsService.updateSettings.and.returnValue(NEVER);

    component.loadSettings();

    expect(component.cuttingKerfMm).toBe(5);
    expect(component.cuttingOptimizationPriority).toBe('FEWEST_CUTS');

    component.cuttingKerfMm = 7;
    component.saveSettings();

    expect(settingsService.updateSettings).toHaveBeenCalledWith(jasmine.objectContaining({
      cuttingKerfMm: 7,
      cuttingOptimizationPriority: 'FEWEST_CUTS'
    }));
  });

  it('wczytuje i zapisuje wcięcie łyżwy oraz zapas na docięcie blatu', () => {
    settingsService.getSettings.and.returnValue(of({
      ...DEFAULT_USER_SETTINGS,
      countertopLyzwaRecessMm: 25,
      countertopCutAllowanceMm: 10
    }));
    settingsService.updateSettings.and.returnValue(NEVER);

    component.loadSettings();

    expect(component.countertopLyzwaRecessMm).toBe(25);
    expect(component.countertopCutAllowanceMm).toBe(10);

    component.countertopCutAllowanceMm = 15;
    component.saveSettings();

    expect(settingsService.updateSettings).toHaveBeenCalledWith(jasmine.objectContaining({
      countertopLyzwaRecessMm: 25,
      countertopCutAllowanceMm: 15
    }));
  });
});

describe('SettingsComponent — dane firmy w pełnym widoku', () => {
  const COMPANY = {
    companyName: 'Pracownia Test',
    companyAddress: 'Testowa 1',
    companyPhone: '123456789',
    companyEmail: 'firma@example.com',
    offerValidityDays: 30
  };
  const SAVED_SETTINGS: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    defaultPlinthHeightMm: 150,
    cuttingKerfMm: 5,
    markupMaterialsPct: 12,
    ...COMPANY
  };

  let fixture: ComponentFixture<SettingsComponent>;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let settings$: Subject<UserSettings>;
  let createObjectUrlSpy: jasmine.Spy;
  let revokeObjectUrlSpy: jasmine.Spy;

  beforeEach(async () => {
    settings$ = new Subject<UserSettings>();
    settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', [
      'getSettings', 'getOptions', 'getLogo', 'updateSettings', 'uploadLogo', 'deleteLogo'
    ]);
    settingsService.getSettings.and.returnValue(settings$);
    settingsService.getOptions.and.returnValue(NEVER);
    settingsService.getLogo.and.callFake(() => of(new Blob(['logo'], { type: 'image/png' })));
    settingsService.updateSettings.and.returnValue(NEVER);

    let blobCounter = 0;
    createObjectUrlSpy = spyOn(URL, 'createObjectURL').and.callFake(() => `blob:logo-${++blobCounter}`);
    revokeObjectUrlSpy = spyOn(URL, 'revokeObjectURL');

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: SettingsService, useValue: settingsService },
        { provide: BoardPriceService, useValue: { list: () => of([]) } },
        { provide: ComponentPriceService, useValue: { list: () => of([]) } },
        { provide: JobPriceService, useValue: { list: () => of([]) } },
        { provide: MaterialAdminService, useValue: { getMaterialOptions: () => of([]) } },
        { provide: MaterialPresetService, useValue: { listActive: () => of([]) } },
        { provide: TranslationService, useValue: { getByCategories: () => of({}) } },
        { provide: LanguageService, useValue: { lang: signal('pl') } },
        {
          provide: KitchenStateService,
          useValue: jasmine.createSpyObj<KitchenStateService>('KitchenStateService', [
            'setGlobalDefaults', 'setMaterialDefaults', 'setCountertopJointDefaults', 'setGrainDirectionDefaults'
          ])
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Odpowiedź GET przychodzi dopiero po pierwszym renderze (stan ładowania). */
  async function loadAsync(settings: UserSettings): Promise<void> {
    await render();
    expect(fixture.nativeElement.querySelector('.state-loading')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-company-info-section')).toBeNull();

    settings$.next(settings);
    settings$.complete();
    await render();
  }

  /** Pola formularza firmy w kolejności z template: nazwa, adres, telefon, e-mail, ważność oferty. */
  function companyInputs(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('app-company-info-section .form-grid input'));
  }

  function companyValues(): string[] {
    return companyInputs().map(input => input.value);
  }

  async function typeInto(index: number, value: string): Promise<void> {
    const input = companyInputs()[index];
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await render();
  }

  async function toggleCompanySection(): Promise<void> {
    (fixture.nativeElement.querySelector('#sec-company .panel-header') as HTMLButtonElement).click();
    await render();
  }

  function clickSave(): UpdateUserSettingsRequest {
    (fixture.nativeElement.querySelector('.settings-header-actions .btn-primary') as HTMLButtonElement).click();
    expect(settingsService.updateSettings).toHaveBeenCalledTimes(1);
    return settingsService.updateSettings.calls.mostRecent().args[0];
  }

  it('po asynchronicznym GET pokazuje zapisane dane firmy i wysyła je przy zapisie', async () => {
    await loadAsync(SAVED_SETTINGS);

    expect(companyValues()).toEqual(['Pracownia Test', 'Testowa 1', '123456789', 'firma@example.com', '30']);

    const request = clickSave();
    expect(request).toEqual(jasmine.objectContaining(COMPANY));
    expect(request).toEqual(jasmine.objectContaining({
      defaultPlinthHeightMm: 150, cuttingKerfMm: 5, markupMaterialsPct: 12
    }));
  });

  it('po synchronicznym GET pokazuje zapisane dane firmy', async () => {
    settingsService.getSettings.and.returnValue(of(SAVED_SETTINGS));

    await render();

    expect(companyValues()).toEqual(['Pracownia Test', 'Testowa 1', '123456789', 'firma@example.com', '30']);
    expect(clickSave()).toEqual(jasmine.objectContaining(COMPANY));
  });

  it('zachowuje niezapisane edycje firmy po zwinięciu i rozwinięciu sekcji', async () => {
    await loadAsync(SAVED_SETTINGS);

    await typeInto(0, 'Pracownia Nowa');
    await typeInto(4, '45');

    await toggleCompanySection();
    expect(fixture.nativeElement.querySelector('app-company-info-section')).toBeNull();
    await toggleCompanySection();

    expect(companyValues()).toEqual(['Pracownia Nowa', 'Testowa 1', '123456789', 'firma@example.com', '45']);
  });

  it('zapis przy zwiniętej sekcji firmy wysyła aktualny model firmy i pozostałe ustawienia', async () => {
    await loadAsync(SAVED_SETTINGS);

    await typeInto(0, 'Pracownia Nowa');
    await typeInto(4, '45');
    await toggleCompanySection();
    expect(fixture.nativeElement.querySelector('app-company-info-section')).toBeNull();

    const request = clickSave();

    expect(request).toEqual(jasmine.objectContaining({
      companyName: 'Pracownia Nowa',
      companyAddress: 'Testowa 1',
      companyPhone: '123456789',
      companyEmail: 'firma@example.com',
      offerValidityDays: 45,
      defaultPlinthHeightMm: 150,
      cuttingKerfMm: 5,
      markupMaterialsPct: 12
    }));
  });

  it('przechodzi przez kilka cykli zwijania z wyczyszczonym polem i zachowuje mapowanie pustych pól', async () => {
    await loadAsync(SAVED_SETTINGS);

    await typeInto(1, '');
    for (let cycle = 0; cycle < 3; cycle++) {
      await toggleCompanySection();
      await toggleCompanySection();
      expect(companyValues()).toEqual(['Pracownia Test', '', '123456789', 'firma@example.com', '30']);
    }
    await typeInto(2, '987654321');
    await toggleCompanySection();

    const request = clickSave();
    expect(request.companyAddress).toBeUndefined();
    expect(request).toEqual(jasmine.objectContaining({
      companyName: 'Pracownia Test',
      companyPhone: '987654321',
      companyEmail: 'firma@example.com',
      offerValidityDays: 30
    }));
  });

  it('pusta firma z backendu daje puste pola i request bez danych firmy jak dotąd', async () => {
    await loadAsync({
      ...DEFAULT_USER_SETTINGS,
      companyName: undefined,
      companyAddress: undefined,
      companyPhone: undefined,
      companyEmail: undefined,
      offerValidityDays: undefined as unknown as number
    });

    expect(companyValues()).toEqual(['', '', '', '', '14']);
    await toggleCompanySection();

    const request = clickSave();
    expect(request.companyName).toBeUndefined();
    expect(request.companyAddress).toBeUndefined();
    expect(request.companyPhone).toBeUndefined();
    expect(request.companyEmail).toBeUndefined();
    expect(request.offerValidityDays).toBe(14);
  });

  it('wczytuje logo po utworzeniu sekcji po asynchronicznym GET i zwalnia URL blob przy zwinięciu', async () => {
    await loadAsync(SAVED_SETTINGS);

    expect(settingsService.getLogo).toHaveBeenCalledTimes(1);
    const logo = (): HTMLImageElement | null => fixture.nativeElement.querySelector('app-company-info-section img.logo-img');
    expect(logo()?.getAttribute('src')).toBe('blob:logo-1');

    await toggleCompanySection();
    expect(revokeObjectUrlSpy).toHaveBeenCalledOnceWith('blob:logo-1');

    await toggleCompanySection();
    expect(settingsService.getLogo).toHaveBeenCalledTimes(2);
    expect(logo()?.getAttribute('src')).toBe('blob:logo-2');

    fixture.destroy();
    expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([['blob:logo-1'], ['blob:logo-2']]);
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(2);
  });
});
