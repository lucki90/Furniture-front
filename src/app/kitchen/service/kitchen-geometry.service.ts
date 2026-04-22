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

    // Pre-scan: collect FULL-zone anchor positions for UPPER auto-repositioning.
    const anchors = this.buildAnchorPositions(cabinets, settings);

    for (const cabinet of cabinets) {
      const zone = getCabinetZone(cabinet);
      let x: number;
      let y: number;

      switch (zone) {
        case 'FULL': {
          // Słupek / lodówka w zabudowie — zajmuje tylko strefę BOTTOM pod kątem pozycji X.
          // NIE przesuwamy currentXTop: szafki wiszące mogą leżeć nad słupkiem w tym samym X gdy się mieszczą.
          const leftW = this.requestBuilder.enclosureOuterWidthMm(cabinet, 'left', settings.fillerWidthMm);
          const rightW = this.requestBuilder.enclosureOuterWidthMm(cabinet, 'right', settings.fillerWidthMm);
          x = currentXBottom + leftW;
          currentXBottom = x + cabinet.width + rightW;
          y = settings.plinthHeightMm;
          break;
        }
        case 'TOP': {
          const leftW = this.requestBuilder.enclosureOuterWidthMm(cabinet, 'left', settings.fillerWidthMm);
          const rightW = this.requestBuilder.enclosureOuterWidthMm(cabinet, 'right', settings.fillerWidthMm);

          // CEILING mode: auto-reposition UPPER beside any anchor it can't fit above.
          // leftW is passed so the overlap check targets the UPPER body, not the raw cursor.
          const rawX = (cabinet.positioningMode !== 'RELATIVE_TO_COUNTERTOP')
            ? this.skipPastConflictingAnchors(currentXTop, leftW, cabinet.width, cabinet.height, settings, anchors)
            : currentXTop;

          x = rawX + leftW;
          currentXTop = x + cabinet.width + rightW;

          if (cabinet.positioningMode === 'RELATIVE_TO_COUNTERTOP') {
            y = countertopHeight + (cabinet.gapFromCountertopMm ?? 500);
          } else {
            // RELATIVE_TO_CEILING: szafka wisząca zawsze od sufitu w dół.
            // gapFromAnchorMm służy wyłącznie do walidacji — nie wpływa na pozycję Y.
            y = settings.wallHeightMm - settings.upperFillerHeightMm - cabinet.height;
          }
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

  /**
   * Pre-scan: compute FULL-zone anchor (TALL / BASE_FRIDGE) body positions
   * in sequential bottom-X order. Used for UPPER auto-repositioning.
   */
  private buildAnchorPositions(
    cabinets: KitchenCabinet[],
    settings: KitchenGeometrySettings
  ): Array<{ xBodyStart: number; xBodyEnd: number; xAfterAnchor: number; tallTop: number }> {
    let scanX = 0;
    const result: Array<{ xBodyStart: number; xBodyEnd: number; xAfterAnchor: number; tallTop: number }> = [];

    for (const cabinet of cabinets) {
      const zone = getCabinetZone(cabinet);
      if (zone === 'TOP') continue; // TOP cabs don't advance the bottom X cursor
      const leftW = this.requestBuilder.enclosureOuterWidthMm(cabinet, 'left', settings.fillerWidthMm);
      const rightW = this.requestBuilder.enclosureOuterWidthMm(cabinet, 'right', settings.fillerWidthMm);
      const xBodyStart = scanX + leftW;
      const xBodyEnd = xBodyStart + cabinet.width;
      const xAfterAnchor = xBodyEnd + rightW;

      if (zone === 'FULL') {
        result.push({ xBodyStart, xBodyEnd, xAfterAnchor, tallTop: settings.plinthHeightMm + cabinet.height });
      }
      scanX = xAfterAnchor;
    }
    return result;
  }

  /**
   * Returns the raw start-X (before adding UPPER's left enclosure) past all FULL-zone
   * anchors that this UPPER cannot fit above in CEILING mode.
   * When positionY from ceiling < anchor.tallTop, jump past the anchor.
   */
  /**
   * @param leftBodyOffset - UPPER's left enclosure width; body starts this far from rawX.
   *   Overlap is checked against the actual UPPER body [rawX+offset, rawX+offset+width]
   *   to avoid false conflicts when a left filler pushes the body clear of an anchor.
   */
  private skipPastConflictingAnchors(
    startX: number,
    leftBodyOffset: number,
    upperWidth: number,
    upperHeight: number,
    settings: KitchenGeometrySettings,
    anchors: Array<{ xBodyStart: number; xBodyEnd: number; xAfterAnchor: number; tallTop: number }>
  ): number {
    const upperCeilingY = settings.wallHeightMm - settings.upperFillerHeightMm - upperHeight;
    let candidateX = startX;
    let changed = true;
    while (changed) {
      changed = false;
      for (const anchor of anchors) {
        const upperBodyStart = candidateX + leftBodyOffset;
        const upperBodyEnd = upperBodyStart + upperWidth;
        if (anchor.xBodyStart < upperBodyEnd && anchor.xBodyEnd > upperBodyStart) {
          if (anchor.tallTop > upperCeilingY) {
            candidateX = anchor.xAfterAnchor;
            changed = true;
            break;
          }
        }
      }
    }
    return candidateX;
  }

  private calculateCountertopHeight(cabinets: KitchenCabinet[], settings: KitchenGeometrySettings): number {
    const baseCabinets = cabinets.filter(cabinet => requiresCountertop(cabinet.type));
    const maxBaseCorpusHeight = baseCabinets.length > 0
      ? Math.max(...baseCabinets.map(cabinet => cabinet.height))
      : 720;

    return settings.plinthHeightMm + maxBaseCorpusHeight + settings.countertopThicknessMm;
  }
}
