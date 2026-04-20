import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { KitchenCabinet, cabinetHasSegments } from '../model/kitchen-state.model';
import { CabinetSegmentsFormService } from './cabinet-segments-form.service';

@Injectable({ providedIn: 'root' })
export class CabinetFormEditingService {
  private readonly fb = inject(FormBuilder);
  private readonly segmentsFormService = inject(CabinetSegmentsFormService);

  patchFormForEditing(form: FormGroup, cabinet: KitchenCabinet): void {
    form.patchValue(this.buildEditPatch(cabinet, true), { emitEvent: false });
  }

  restoreAfterTypePrepared(form: FormGroup, cabinet: KitchenCabinet): void {
    form.patchValue(this.buildEditPatch(cabinet, false), { emitEvent: false });

    if (cabinetHasSegments(cabinet) && cabinet.segments?.length) {
      this.segmentsFormService.replaceSegments(this.fb, form.get('segments') as any, cabinet.segments);
    }
  }

  private buildEditPatch(cabinet: KitchenCabinet, includeType: boolean): Record<string, unknown> {
    const c = cabinet as any;

    return {
      ...(includeType ? { kitchenCabinetType: cabinet.type } : {}),
      name: c.name || '',
      openingType: c.openingType,
      width: c.width,
      height: c.height,
      depth: c.depth,
      positionY: c.positionY ?? 0,
      shelfQuantity: c.shelfQuantity,
      drawerQuantity: c.drawerQuantity,
      drawerModel: c.drawerModel,
      positioningMode: c.positioningMode ?? 'RELATIVE_TO_CEILING',
      gapFromCountertopMm: c.gapFromCountertopMm ?? 500,
      cascadeLowerHeight: c.cascadeLowerHeight ?? 400,
      cascadeLowerDepth: c.cascadeLowerDepth ?? 400,
      cascadeUpperHeight: c.cascadeUpperHeight ?? 320,
      cascadeUpperDepth: c.cascadeUpperDepth ?? 300,
      cascadeLowerIsLiftUp: c.cascadeLowerIsLiftUp ?? false,
      cascadeLowerIsFrontExtended: c.cascadeLowerIsFrontExtended ?? false,
      cascadeUpperIsLiftUp: c.cascadeUpperIsLiftUp ?? false,
      leftEnclosureType: c.leftEnclosureType ?? 'NONE',
      rightEnclosureType: c.rightEnclosureType ?? 'NONE',
      leftSupportPlate: c.leftSupportPlate ?? false,
      rightSupportPlate: c.rightSupportPlate ?? false,
      distanceFromWallMm: c.distanceFromWallMm ?? null,
      leftFillerWidthOverrideMm: c.leftFillerWidthOverrideMm ?? null,
      rightFillerWidthOverrideMm: c.rightFillerWidthOverrideMm ?? null,
      bottomWreathOnFloor: c.bottomWreathOnFloor ?? false,
      sinkFrontType: c.sinkFrontType ?? 'TWO_DOORS',
      sinkApronEnabled: c.sinkApronEnabled ?? true,
      sinkApronHeightMm: c.sinkApronHeightMm ?? 150,
      sinkDrawerModel: c.sinkDrawerModel ?? 'ANTARO_TANDEMBOX',
      cooktopType: c.cooktopType ?? 'INDUCTION',
      cooktopFrontType: c.cooktopFrontType ?? 'DRAWERS',
      hoodFrontType: c.hoodFrontType ?? 'FLAP',
      hoodScreenEnabled: c.hoodScreenEnabled ?? false,
      hoodScreenHeightMm: c.hoodScreenHeightMm ?? 100,
      ovenHeightType: c.ovenHeightType ?? 'STANDARD',
      ovenLowerSectionType: c.ovenLowerSectionType ?? 'LOW_DRAWER',
      ovenApronEnabled: c.ovenApronEnabled ?? false,
      ovenApronHeightMm: c.ovenApronHeightMm ?? 60,
      fridgeSectionType: c.fridgeSectionType ?? 'TWO_DOORS',
      lowerFrontHeightMm: c.lowerFrontHeightMm ?? 713,
      fridgeFreestandingType: c.fridgeFreestandingType ?? 'TWO_DOORS',
      cornerWidthA: c.cornerWidthA,
      cornerWidthB: c.cornerWidthB,
      cornerMechanism: c.cornerMechanism,
      cornerShelfQuantity: c.cornerShelfQuantity,
      isUpperCorner: c.isUpperCorner,
      cornerOpeningType: c.cornerOpeningType ?? 'TWO_DOORS',
      cornerFrontUchylnyWidthMm: c.cornerFrontUchylnyWidthMm ?? 500,
      isLiftUp: c.isLiftUp ?? false,
      isFrontExtended: c.isFrontExtended ?? false,
      drainerFrontType: c.drainerFrontType ?? 'OPEN'
    };
  }
}
