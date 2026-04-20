import { Injectable, inject } from '@angular/core';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import { CabinetPosition, CabinetZone, KitchenCabinet, getCabinetZone, requiresCountertop } from '../model/kitchen-state.model';

export interface KitchenGeometrySettings {
  wallHeightMm: number;
  plinthHeightMm: number;
  countertopThicknessMm: number;
  upperFillerHeightMm: number;
  fillerWidthMm: number;
}

@Injectable({
  providedIn: 'root'
})
export class KitchenGeometryService {
  private requestBuilder = inject(ProjectRequestBuilderService);

  calculateUsedWidth(cabinets: KitchenCabinet[], zone: Extract<CabinetZone, 'BOTTOM' | 'TOP'>, fillerWidthMm: number): number {
    let currentX = 0;

    for (const cabinet of cabinets) {
      const cabinetZone = getCabinetZone(cabinet);
      if (zone === 'BOTTOM' && cabinetZone !== 'BOTTOM' && cabinetZone !== 'FULL') continue;
      if (zone === 'TOP' && cabinetZone !== 'TOP' && cabinetZone !== 'FULL') continue;

      currentX += this.requestBuilder.enclosureOuterWidthMm(cabinet, 'left', fillerWidthMm)
        + cabinet.width
        + this.requestBuilder.enclosureOuterWidthMm(cabinet, 'right', fillerWidthMm);
    }

    return currentX;
  }

  calculateCabinetPositions(cabinets: KitchenCabinet[], settings: KitchenGeometrySettings): CabinetPosition[] {
    const positions: CabinetPosition[] = [];
    let currentXBottom = 0;
    let currentXTop = 0;
    const countertopHeight = this.calculateCountertopHeight(cabinets, settings);

    for (const cabinet of cabinets) {
      const zone = getCabinetZone(cabinet);
      let x: number;
      let y: number;

      switch (zone) {
        case 'FULL': {
          const leftW = this.requestBuilder.enclosureOuterWidthMm(cabinet, 'left', settings.fillerWidthMm);
          const rightW = this.requestBuilder.enclosureOuterWidthMm(cabinet, 'right', settings.fillerWidthMm);
          x = Math.max(currentXBottom, currentXTop) + leftW;
          currentXBottom = x + cabinet.width + rightW;
          currentXTop = x + cabinet.width + rightW;
          y = settings.plinthHeightMm;
          break;
        }
        case 'TOP': {
          const leftW = this.requestBuilder.enclosureOuterWidthMm(cabinet, 'left', settings.fillerWidthMm);
          x = currentXTop + leftW;
          currentXTop = x + cabinet.width + this.requestBuilder.enclosureOuterWidthMm(cabinet, 'right', settings.fillerWidthMm);
          y = cabinet.positioningMode === 'RELATIVE_TO_COUNTERTOP'
            ? countertopHeight + (cabinet.gapFromCountertopMm ?? 500)
            : settings.wallHeightMm - settings.upperFillerHeightMm - cabinet.height;
          break;
        }
        case 'BOTTOM':
        default: {
          const leftW = this.requestBuilder.enclosureOuterWidthMm(cabinet, 'left', settings.fillerWidthMm);
          x = currentXBottom + leftW;
          currentXBottom = x + cabinet.width + this.requestBuilder.enclosureOuterWidthMm(cabinet, 'right', settings.fillerWidthMm);
          y = settings.plinthHeightMm;
          break;
        }
      }

      positions.push({
        cabinetId: cabinet.id,
        name: cabinet.name,
        x,
        y,
        width: cabinet.width,
        height: cabinet.height
      });
    }

    return positions;
  }

  private calculateCountertopHeight(cabinets: KitchenCabinet[], settings: KitchenGeometrySettings): number {
    const baseCabinets = cabinets.filter(cabinet => requiresCountertop(cabinet.type));
    const maxBaseCorpusHeight = baseCabinets.length > 0
      ? Math.max(...baseCabinets.map(cabinet => cabinet.height))
      : 720;

    return settings.plinthHeightMm + maxBaseCorpusHeight + settings.countertopThicknessMm;
  }
}
