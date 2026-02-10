// src/app/data/presets.ts
import { Preset } from './preset.model';

export const PRESETS: Preset[] = [
  {
    id: 'BLACK',
    name: 'Czarny',
    baseHex: '#000000',
    textureUrl: 'assets/textures/black.png',
    thumbnailUrl: 'assets/textures/black.png',
    isTileable: true,
    repeat: { x: 1, y: 1 }
  },
  {
    id: 'WHITE',
    name: 'Biały',
    baseHex: '#ffffff',
    textureUrl: 'assets/textures/white.png',
    thumbnailUrl: 'assets/textures/white.png',
    isTileable: true,
    repeat: { x: 1, y: 1 }
  },
  {
    id: 'k003',
    name: 'Dąb Craft Złoty',
    baseHex: '#c79a5e',
    textureUrl: 'assets/textures/k003.png',
    thumbnailUrl: 'assets/textures/k003.png',
    isTileable: true,
    repeat: { x: 2, y: 2 }
  }
];
