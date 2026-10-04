import { TestBed } from '@angular/core/testing';
import { KitchenStateService } from './kitchen-state.service';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import { KitchenProjectStateMapper } from './kitchen-project-state.mapper';
import { KitchenCabinetStateFactory } from './kitchen-cabinet-state.factory';
import { KitchenGeometryService } from './kitchen-geometry.service';
import { ProjectMetadataService } from './project-metadata.service';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import { ProjectSettingsService } from './project-settings.service';
import { KitchenProjectDetailResponse } from '../model/kitchen-project.model';

/**
 * Ustawienia użytkownika przychodzą asynchronicznie przy starcie aplikacji — także po wczytaniu projektu z adresu
 * strony. Wartości zapisywane w projekcie nie mogą zostać wtedy nadpisane globalnymi domyślnymi.
 */
describe('KitchenStateService — globalne ustawienia domyślne', () => {
  let service: KitchenStateService;

  const userDefaults = {
    plinthHeightMm: 120,
    countertopThicknessMm: 28,
    upperFillerHeightMm: 80,
    distanceFromWallMm: 600
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        KitchenStateService,
        KitchenWorkspaceStore,
        KitchenProjectStateMapper,
        KitchenCabinetStateFactory,
        KitchenGeometryService,
        ProjectMetadataService,
        ProjectRequestBuilderService,
        ProjectSettingsService
      ]
    });
    service = TestBed.inject(KitchenStateService);
  });

  function loadSavedProject(): void {
    service.loadProject({
      id: 31,
      name: 'Projekt z adresu',
      status: 'DRAFT',
      version: 2,
      plinthHeightMm: 150,
      countertopThicknessMm: 20,
      upperFillerHeightMm: 60,
      totalCost: 0,
      totalBoardsCost: 0,
      totalComponentsCost: 0,
      totalJobsCost: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      walls: [{
        id: 1,
        wallType: 'MAIN',
        widthMm: 3600,
        heightMm: 2600,
        wallCost: 0,
        cabinetCount: 0,
        usedWidthMm: 0,
        remainingWidthMm: 3600,
        cabinets: []
      }]
    } as KitchenProjectDetailResponse);
  }

  it('nowy projekt bez zmian przyjmuje ustawienia i nie dostaje niezapisanych zmian', () => {
    service.setGlobalDefaults(userDefaults);

    expect(service.plinthHeightMm()).toBe(120);
    expect(service.countertopThicknessMm()).toBe(28);
    expect(service.upperFillerHeightMm()).toBe(80);
    expect(service.hasUnsavedChanges()).toBeFalse();
  });

  it('otwarty zapisany projekt zachowuje własny cokół, blat i blendę górną', () => {
    loadSavedProject();

    service.setGlobalDefaults(userDefaults);

    expect(service.plinthHeightMm()).toBe(150);
    expect(service.countertopThicknessMm()).toBe(20);
    expect(service.upperFillerHeightMm()).toBe(60);
    expect(service.distanceFromWallMm()).toBe(600);
    expect(service.hasUnsavedChanges()).toBeFalse();
  });

  it('kolejny nowy projekt startuje z ustawień przyjętych przy otwartym projekcie', () => {
    loadSavedProject();
    service.setGlobalDefaults(userDefaults);

    service.startNewProject();

    expect(service.plinthHeightMm()).toBe(120);
    expect(service.countertopThicknessMm()).toBe(28);
    expect(service.upperFillerHeightMm()).toBe(80);
  });

  it('nowy projekt ze zmianami użytkownika nadal ma niezapisane zmiany', () => {
    service.updateRoomDimensions(4000, 3000, { recordHistory: true });

    service.setGlobalDefaults(userDefaults);

    expect(service.plinthHeightMm()).toBe(120);
    expect(service.hasUnsavedChanges()).toBeTrue();
  });
});
