import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { MaterialAdminService } from '../admin/material/service/material-admin.service';
import { LanguageService } from '../service/language.service';
import { KitchenStateService } from '../kitchen/service/kitchen-state.service';
import { MaterialPresetService } from '../kitchen/service/material-preset.service';
import { TranslationService } from '../translation/translation.service';
import { DEFAULT_USER_SETTINGS } from './settings.model';
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
