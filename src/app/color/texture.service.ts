import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { Preset } from './model/preset.model';

@Injectable({ providedIn: 'root' })
export class TextureService {
  private loader = new THREE.TextureLoader();
  private cache = new Map<string, THREE.Texture>();

  async loadTexture(url?: string): Promise<THREE.Texture | null> {
    if (!url) return null;
    if (this.cache.has(url)) return this.cache.get(url)!;

    return new Promise<THREE.Texture>((resolve, reject) => {
      this.loader.load(
        url,
        tex => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          this.cache.set(url, tex);
          resolve(tex);
        },
        undefined,
        err => reject(err)
      );
    });
  }

  async applyPresetToMaterial(mat: THREE.MeshStandardMaterial, preset: Preset) {
    if (!mat) return;
    if (preset.baseHex) mat.color.set(preset.baseHex);

    const diffuse = await this.loadTexture(preset.textureUrl);
    if (diffuse) {
      diffuse.repeat.set(preset.repeat?.x ?? 1, preset.repeat?.y ?? 1);
      mat.map = diffuse;
    } else {
      mat.map = null;
    }

    // jeżeli w przyszłości będą normal/roughness maps — można je tu dodać analogicznie
    mat.needsUpdate = true;
  }
}
