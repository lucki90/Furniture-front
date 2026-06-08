import { Injectable, inject } from '@angular/core';
import { KitchenCabinetStateFactory } from './kitchen-cabinet-state.factory';
import { ProjectWallAddonsRequestBuilder } from './project-wall-addons-request.builder';
import { KitchenProjectDetailResponse, WallDetailResponse } from '../model/kitchen-project.model';
import { CountertopConfig, KitchenCabinet, PlinthConfig, WallWithCabinets } from '../model/kitchen-state.model';
import { requiresCountertop } from '../model/kitchen-state.model';

const DEFAULT_SIDE_OVERHANG_EXTRA_MM = 5;

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
  private readonly addonsBuilder = new ProjectWallAddonsRequestBuilder();

  mapProject(project: KitchenProjectDetailResponse, options?: { fillerWidthMm?: number }): ProjectStateMappingResult {
    let wallIdCounter = 0;
    let cabinetIdCounter = 0;
    const fillerWidthMm = options?.fillerWidthMm ?? 50;

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
        islandDepthMm: wallResp.islandDepthMm,
        adjacentToWall: wallResp.adjacentToWall ?? 'NONE',
        leftSidePanelEnabled: wallResp.leftSidePanelEnabled ?? false,
        rightSidePanelEnabled: wallResp.rightSidePanelEnabled ?? false,
        backBlendaEnabled: wallResp.backBlendaEnabled ?? false,
        countertopConfig: this.mapCountertopConfig(wallResp, cabinets, fillerWidthMm),
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
        adjacentToWall: 'NONE',
        countertopConfig: undefined,
        plinthConfig: undefined
      });
    }

    return { walls, wallIdCounter, cabinetIdCounter };
  }

  /**
   * Buduje CountertopConfig z odpowiedzi backendu. `sideOverhangExtraMm` jest wartością
   * pochodną — odtwarzamy ją odejmując szerokość obudowy skrajnych szafek od zapisanego
   * `leftOverhangMm`/`rightOverhangMm`. Dla wyspy bierzemy maksymalną wartość po obu stronach
   * (analogicznie do `computeIslandSideOverhang` w request builderze).
   */
  private mapCountertopConfig(
    wallResp: WallDetailResponse,
    cabinets: KitchenCabinet[],
    fillerWidthMm: number
  ): CountertopConfig | undefined {
    if (!wallResp.countertop) {
      // Backend nie wyslal zadnej informacji o blacie — wall bez konfiguracji (nowy/legacy).
      return undefined;
    }
    const isIsland = wallResp.wallType === 'ISLAND';
    const adjacent = wallResp.adjacentToWall ?? 'NONE';

    const sideOverhangExtraMm = this.recoverSideOverhangExtra(
      wallResp.countertop.leftOverhangMm,
      wallResp.countertop.rightOverhangMm,
      adjacent,
      isIsland,
      cabinets,
      fillerWidthMm
    );

    return {
      enabled: wallResp.countertop.enabled,
      materialType: wallResp.countertop.materialType,
      thicknessMm: wallResp.countertop.thicknessMm || undefined,
      manualLengthMm: wallResp.countertop.manualLengthMm,
      manualDepthMm: wallResp.countertop.depthMm > 0 ? wallResp.countertop.depthMm : undefined,
      frontOverhangMm: wallResp.countertop.frontOverhangMm ?? 30,
      backOverhangMm: wallResp.countertop.backOverhangMm ?? 0,
      sideOverhangExtraMm,
      jointType: wallResp.countertop.jointType,
      edgeType: wallResp.countertop.frontEdgeType
    };
  }

  private recoverSideOverhangExtra(
    leftOverhangMm: number | undefined,
    rightOverhangMm: number | undefined,
    adjacent: string,
    isIsland: boolean,
    cabinets: KitchenCabinet[],
    fillerWidthMm: number
  ): number {
    // Próba odtworzenia z lewej strony (jeśli nie jest "adjacent")
    if (adjacent !== 'LEFT' && leftOverhangMm !== undefined) {
      const leftEnclosure = this.computeEnclosureWidthForRecover('left', isIsland, cabinets, fillerWidthMm);
      const recovered = leftOverhangMm - leftEnclosure;
      if (recovered >= 0) return recovered;
    }
    // Fallback z prawej strony
    if (adjacent !== 'RIGHT' && rightOverhangMm !== undefined) {
      const rightEnclosure = this.computeEnclosureWidthForRecover('right', isIsland, cabinets, fillerWidthMm);
      const recovered = rightOverhangMm - rightEnclosure;
      if (recovered >= 0) return recovered;
    }
    return DEFAULT_SIDE_OVERHANG_EXTRA_MM;
  }

  private computeEnclosureWidthForRecover(
    side: 'left' | 'right',
    isIsland: boolean,
    cabinets: KitchenCabinet[],
    fillerWidthMm: number
  ): number {
    if (isIsland) {
      // ISLAND: max po obu stronach FRONT/BACK (lustro `computeIslandSideOverhang`).
      // Filtr MUSI byc `requiresCountertop` (NIE `!== TOP`) — FULL/freestanding nie trzymaja blatu.
      const sides: Array<'FRONT' | 'BACK'> = ['FRONT', 'BACK'];
      return sides.reduce((maxOverhang, cabinetSide) => {
        const sideCabinets = cabinets.filter(cab =>
          (cab.cabinetSide ?? 'FRONT') === cabinetSide && requiresCountertop(cab.type)
        );
        if (sideCabinets.length === 0) return maxOverhang;
        const edge = side === 'left' ? sideCabinets[0] : sideCabinets[sideCabinets.length - 1];
        return Math.max(maxOverhang, this.addonsBuilder.enclosureOuterWidthMm(edge, side, fillerWidthMm));
      }, 0);
    }
    // Liniowo: enclosure skrajnej szafki, na ktorej faktycznie lezy blat (requiresCountertop=true).
    // Filtr `!== TOP` byl zbyt szeroki — wlaczal FULL (TALL_CABINET, BASE_FRIDGE), ktore PRZERYWAJA blat.
    // Recover MUSI byc symetryczny z `computeLinearSideOverhang` w ProjectRequestBuilderService.
    const supporting = cabinets.filter(cab => requiresCountertop(cab.type));
    if (supporting.length === 0) return 0;
    const edge = side === 'left' ? supporting[0] : supporting[supporting.length - 1];
    return this.addonsBuilder.enclosureOuterWidthMm(edge, side, fillerWidthMm);
  }

  private mapPlinthConfig(wallResp: WallDetailResponse): PlinthConfig | undefined {
    const plinth = wallResp.plinth;
    if (!plinth) {
      return undefined;
    }

    // Bug-fix 2026-06-08: przy wyłączonym panelu cokołu backend zwraca enabled=false, ale wciąż
    // z realną wysokością i modelem nóżek (`calculateFeetOnlyResponse`). Wcześniej mapper zwracał
    // undefined dla enabled=false → po reloadzie projekt traktował cokół jak domyślnie WŁĄCZONY
    // (consumenci czytają `plinthConfig?.enabled !== false`). Teraz zachowujemy enabled=false +
    // wymiary, żeby decyzja użytkownika (panel cokołu off, nóżki on) przetrwała save/load.
    return {
      enabled: plinth.enabled,
      heightMm: plinth.plinthHeightMm,
      feetType: plinth.feetType,
      materialType: plinth.materialType,
      setbackMm: plinth.setbackMm,
      colorCode: plinth.colorCode
    };
  }
}
