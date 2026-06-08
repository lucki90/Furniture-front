import { KitchenCabinet, WallWithCabinets } from '../model/kitchen-state.model';
import { CountertopRequest, DEFAULT_COUNTERTOP_REQUEST } from '../model/countertop.model';
import { PlinthRequest, DEFAULT_PLINTH_REQUEST, pickFeetTypeForPlinthHeight } from '../model/plinth.model';
import { PLATE_THICKNESS_MM } from '../kitchen-layout/kitchen-layout.constants';

export class ProjectWallAddonsRequestBuilder {
  enclosureOuterWidthMm(cab: KitchenCabinet, side: 'left' | 'right', fillerWidthMm: number): number {
    const type = side === 'left' ? cab.leftEnclosureType : cab.rightEnclosureType;
    if (!type || type === 'NONE') return 0;
    if (type === 'PARALLEL_FILLER_STRIP') {
      const override = side === 'left' ? cab.leftFillerWidthOverrideMm : cab.rightFillerWidthOverrideMm;
      return override ?? fillerWidthMm;
    }
    return PLATE_THICKNESS_MM;
  }

  buildCountertopRequest(wall: WallWithCabinets, leftOverhangMm = 0, rightOverhangMm = 0): CountertopRequest {
    const config = wall.countertopConfig;
    if (!config || !config.enabled) {
      return { ...DEFAULT_COUNTERTOP_REQUEST, enabled: false };
    }

    const jointType = config.jointType ?? DEFAULT_COUNTERTOP_REQUEST.jointType;
    const edgeType = config.edgeType ?? DEFAULT_COUNTERTOP_REQUEST.frontEdgeType;
    const sideExtra = config.sideOverhangExtraMm ?? 5;

    const adjacentSide = wall.adjacentToWall ?? 'NONE';
    const sideExtraAppliedLeft = adjacentSide === 'LEFT' ? 0 : sideExtra;
    const sideExtraAppliedRight = adjacentSide === 'RIGHT' ? 0 : sideExtra;
    // FRONT strona wyspy nie może być "adjacent" (user stoi przodem) — overhang zawsze z configu.
    const frontOverhangMm = config.frontOverhangMm ?? DEFAULT_COUNTERTOP_REQUEST.frontOverhangMm;
    const backOverhangMm = adjacentSide === 'BACK'
      ? 0
      : (config.backOverhangMm ?? DEFAULT_COUNTERTOP_REQUEST.backOverhangMm);

    return {
      enabled: true,
      materialType: config.materialType ?? DEFAULT_COUNTERTOP_REQUEST.materialType,
      colorCode: config.colorCode,
      thicknessMm: config.thicknessMm ?? DEFAULT_COUNTERTOP_REQUEST.thicknessMm,
      manualLengthMm: config.manualLengthMm,
      manualDepthMm: config.manualDepthMm ?? wall.islandDepthMm ?? 600,
      frontOverhangMm,
      backOverhangMm,
      leftOverhangMm: adjacentSide === 'LEFT' ? 0 : leftOverhangMm + sideExtraAppliedLeft,
      rightOverhangMm: adjacentSide === 'RIGHT' ? 0 : rightOverhangMm + sideExtraAppliedRight,
      jointType,
      frontEdgeType: edgeType,
      leftEdgeType: DEFAULT_COUNTERTOP_REQUEST.leftEdgeType,
      rightEdgeType: DEFAULT_COUNTERTOP_REQUEST.rightEdgeType,
      backEdgeType: DEFAULT_COUNTERTOP_REQUEST.backEdgeType
    };
  }

  buildPlinthRequest(wall: WallWithCabinets, fallbackPlinthHeightMm: number): PlinthRequest {
    const config = wall.plinthConfig;
    // Bug-fix 2026-06-08: nawet przy wyłączonym panelu cokołu nóżki są obecne — backend
    // (`calculateFeetOnlyResponse`) liczy ich wysokość/model z TEGO requestu. Wcześniej dla
    // enabled=false wysyłaliśmy DEFAULT_PLINTH_REQUEST (height=100mm), więc kalkulacja/BOM nóżek
    // ignorowały realną wysokość cokołu (np. 120/150mm) → "widok OK, produkcja/koszt źle".
    // Teraz zawsze niesiemy realną wysokość; flaga enabled steruje tylko panelem cokołu.
    const heightMm = config?.heightMm ?? fallbackPlinthHeightMm ?? DEFAULT_PLINTH_REQUEST.heightMm;

    return {
      enabled: config?.enabled ?? false,
      heightMm,
      feetType: pickFeetTypeForPlinthHeight(heightMm),
      materialType: config?.materialType ?? DEFAULT_PLINTH_REQUEST.materialType,
      colorCode: config?.colorCode,
      setbackMm: config?.setbackMm ?? DEFAULT_PLINTH_REQUEST.setbackMm
    };
  }
}
