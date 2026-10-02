import { TestBed } from '@angular/core/testing';
import { KitchenProjectLayoutService } from './kitchen-project-layout.service';
import { ProjectSettingsService } from './project-settings.service';

describe('KitchenProjectLayoutService — ustawienia narożnika', () => {
  let layoutService: KitchenProjectLayoutService;
  let settingsService: ProjectSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    layoutService = TestBed.inject(KitchenProjectLayoutService);
    settingsService = TestBed.inject(ProjectSettingsService);
  });

  it('wcięcie łyżwy pochodzi z ustawień użytkownika, a bez nich wynosi 30 mm', () => {
    expect(layoutService.cornerSettings().lyzwaRecessMm).toBe(30);

    settingsService.setCountertopJointDefaults({ countertopLyzwaRecessMm: 20 });
    expect(layoutService.cornerSettings().lyzwaRecessMm).toBe(20);

    settingsService.setCountertopJointDefaults({ countertopLyzwaRecessMm: null });
    expect(layoutService.cornerSettings().lyzwaRecessMm).toBe(30);
  });
});
