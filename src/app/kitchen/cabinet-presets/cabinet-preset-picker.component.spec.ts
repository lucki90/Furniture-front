import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CabinetPresetOption, CabinetPresetResponse } from '../model/cabinet-preset.model';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { CabinetPresetService } from '../service/cabinet-preset.service';
import { CabinetPresetPickerComponent } from './cabinet-preset-picker.component';
import { drawersPresetFixture } from './testing/cabinet-preset.fixture';

describe('CabinetPresetPickerComponent', () => {
  const presets = signal<CabinetPresetResponse[]>([]);
  const option = (preset: CabinetPresetResponse): CabinetPresetOption =>
    ({ preset, label: preset.name ?? 'Dolna 600 z 3 szufladami', dimensions: '600×720×500' });
  const presetService = {
    presets,
    options: computed(() => presets().map(option)),
    builtInOptions: computed(() => presets().filter(p => p.system).map(option)),
    ownOptions: computed(() => presets().filter(p => !p.system).map(option)),
    ensureLoaded: jasmine.createSpy('ensureLoaded')
  };

  beforeEach(() => {
    presets.set([drawersPresetFixture(), drawersPresetFixture({ id: 40, system: false, name: 'Moja' })]);
    TestBed.configureTestingModule({
      imports: [CabinetPresetPickerComponent],
      providers: [{ provide: CabinetPresetService, useValue: presetService }]
    });
  });

  it('wybór presetu przekazuje szafkę do formularza i czyści listę', () => {
    const fixture = TestBed.createComponent(CabinetPresetPickerComponent);
    const selected: KitchenCabinet[] = [];
    fixture.componentInstance.presetSelected.subscribe(cabinet => selected.push(cabinet));
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;

    expect(presetService.ensureLoaded).toHaveBeenCalled();
    expect(select.querySelectorAll('optgroup').length).toBe(2);

    fixture.componentInstance.selection.setValue(1);
    fixture.detectChanges();

    expect(selected).toHaveSize(1);
    expect(selected[0].type).toBe('BASE_WITH_DRAWERS');
    expect(selected[0].width).toBe(600);
    expect(selected[0].id).toBe('preset-1');
    expect(fixture.componentInstance.selection.value).toBeNull();
  });

  it('bez presetów wybór jest ukryty', () => {
    presets.set([]);
    const fixture = TestBed.createComponent(CabinetPresetPickerComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });
});
