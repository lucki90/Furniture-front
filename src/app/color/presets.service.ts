import { Injectable } from '@angular/core';
import { Preset } from './model/preset.model';
import { PRESETS } from './model/presets';

@Injectable({ providedIn: 'root' })
export class PresetsService {
  getAll(): Preset[] {
    return PRESETS;
  }

  getById(id: string): Preset | undefined {
    return PRESETS.find(p => p.id === id);
  }
}
