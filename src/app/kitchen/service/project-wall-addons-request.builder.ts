import { KitchenCabinet, WallWithCabinets } from '../model/kitchen-state.model';
import { CountertopRequest, DEFAULT_COUNTERTOP_REQUEST } from '../model/countertop.model';
import { PlinthRequest, DEFAULT_PLINTH_REQUEST } from '../model/plinth.model';
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

    return {
      enabled: true,
      materialType: config.materialType ?? DEFAULT_COUNTERTOP_REQUEST.materialType,
      colorCode: config.colorCode,
      thicknessMm: config.thicknessMm ?? DEFAULT_COUNTERTOP_REQUEST.thicknessMm,
      manualLengthMm: config.manualLengthMm,
      manualDepthMm: config.manualDepthMm ?? 600,
      frontOverhangMm: config.frontOverhangMm ?? DEFAULT_COUNTERTOP_REQUEST.frontOverhangMm,
      backOverhangMm: DEFAULT_COUNTERTOP_REQUEST.backOverhangMm,
      leftOverhangMm: leftOverhangMm + sideExtra,
      rightOverhangMm: rightOverhangMm + sideExtra,
      jointType,
      frontEdgeType: edgeType,
      leftEdgeType: DEFAULT_COUNTERTOP_REQUEST.leftEdgeType,
      rightEdgeType: DEFAULT_COUNTERTOP_REQUEST.rightEdgeType,
      backEdgeType: DEFAULT_COUNTERTOP_REQUEST.backEdgeType
    };
  }

  buildPlinthRequest(wall: WallWithCabinets): PlinthRequest {
    const config = wall.plinthConfig;
    if (!config || !config.enabled) {
      return { ...DEFAULT_PLINTH_REQUEST, enabled: false };
    }

    return {
      enabled: true,
      feetType: config.feetType ?? DEFAULT_PLINTH_REQUEST.feetType,
      materialType: config.materialType ?? DEFAULT_PLINTH_REQUEST.materialType,
      colorCode: config.colorCode,
      setbackMm: config.setbackMm ?? DEFAULT_PLINTH_REQUEST.setbackMm
    };
  }
}
