import { Injectable, inject } from '@angular/core';
import { KitchenCabinetStateFactory } from './kitchen-cabinet-state.factory';
import { KitchenProjectDetailResponse, WallDetailResponse } from '../model/kitchen-project.model';
import { CountertopConfig, PlinthConfig, WallWithCabinets } from '../model/kitchen-state.model';

export interface ProjectStateMappingResult {
  walls: WallWithCabinets[];
  wallIdCounter: number;
  cabinetIdCounter: number;
}

@Injectable({
  providedIn: 'root'
})
export class KitchenProjectStateMapper {
  private cabinetFactory = inject(KitchenCabinetStateFactory);

  mapProject(project: KitchenProjectDetailResponse): ProjectStateMappingResult {
    let wallIdCounter = 0;
    let cabinetIdCounter = 0;

    const walls: WallWithCabinets[] = project.walls.map(wallResp => {
      wallIdCounter++;
      const wallId = `wall-${wallIdCounter}`;

      const cabinets = wallResp.cabinets.map(cabResp => {
        cabinetIdCounter++;
        return this.cabinetFactory.fromPlacementResponse(cabResp, `cabinet-${cabinetIdCounter}`);
      });

      return {
        id: wallId,
        type: wallResp.wallType,
        widthMm: wallResp.widthMm,
        heightMm: wallResp.heightMm,
        cabinets,
        countertopConfig: this.mapCountertopConfig(wallResp),
        plinthConfig: this.mapPlinthConfig(wallResp)
      };
    });

    if (walls.length === 0) {
      wallIdCounter++;
      walls.push({
        id: `wall-${wallIdCounter}`,
        type: 'MAIN',
        widthMm: 3600,
        heightMm: 2600,
        cabinets: [],
        countertopConfig: undefined,
        plinthConfig: undefined
      });
    }

    return { walls, wallIdCounter, cabinetIdCounter };
  }

  // TODO(CODEX): Odtwarzanie countertopConfig po loadProject nie jest w pelni wierne zapisowi. Backend response nie zwraca wszystkich frontendowych pol konfiguracji (np. sideOverhangExtraMm, jawne edge/joint per formularz), wiec front musi zgadywac czesc wartosci fallbackami.
  private mapCountertopConfig(wallResp: WallDetailResponse): CountertopConfig | undefined {
    if (!wallResp.countertop?.enabled) {
      return undefined;
    }

    return {
      enabled: true,
      materialType: wallResp.countertop.materialType,
      thicknessMm: wallResp.countertop.thicknessMm,
      manualDepthMm: wallResp.countertop.depthMm ?? 600,
      sideOverhangExtraMm: 5
    };
  }

  private mapPlinthConfig(wallResp: WallDetailResponse): PlinthConfig | undefined {
    if (!wallResp.plinth?.enabled) {
      return undefined;
    }

    return {
      enabled: true,
      feetType: wallResp.plinth.feetType,
      materialType: wallResp.plinth.materialType
    };
  }
}
