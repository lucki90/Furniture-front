import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { CabinetFormEditingService } from './cabinet-form-editing.service';
import { KitchenCabinetTypeConfig } from './type-config/kitchen-cabinet-type-config';
import { CabinetFormVisibility } from './type-config/preparer/cabinet-form-visibility';

export interface CabinetFormTypeLifecycleResult {
  visibility: CabinetFormVisibility;
  restoreApplied: boolean;
}

@Injectable({ providedIn: 'root' })
export class CabinetFormTypeLifecycleService {
  private readonly cabinetFormEditingService = inject(CabinetFormEditingService);

  applyTypeChange(
    form: FormGroup,
    type: KitchenCabinetType,
    editingCabinet: KitchenCabinet | null
  ): CabinetFormTypeLifecycleResult {
    const visibility = this.createBaseVisibility();
    const config = KitchenCabinetTypeConfig[type];

    config.preparer.prepare(form, visibility);
    config.validator.validate(form);

    const restoreApplied = !!editingCabinet && editingCabinet.type === type;
    if (restoreApplied) {
      this.cabinetFormEditingService.restoreAfterTypePrepared(form, editingCabinet);
    }

    return { visibility, restoreApplied };
  }

  createBaseVisibility(): CabinetFormVisibility {
    return {
      width: false,
      shelfQuantity: false,
      drawerQuantity: false,
      drawerModel: false,
      segments: false,
      cornerWidthA: false,
      cornerWidthB: false,
      cornerMechanism: false,
      cornerShelfQuantity: false,
      isUpperCorner: false,
      positioningMode: false,
      gapFromCountertopMm: false,
      cascadeSegments: false,
      enclosureSection: false,
      bottomWreathOnFloor: false,
      sinkFrontType: false,
      sinkApron: false,
      sinkApronHeight: false,
      sinkDrawerModel: false,
      cooktopType: false,
      cooktopFrontType: false,
      hoodFrontType: false,
      hoodScreenEnabled: false,
      hoodScreenHeight: false,
      ovenHeightType: false,
      ovenLowerSectionType: false,
      ovenApronEnabled: false,
      ovenApronHeight: false,
      ovenDrawerModel: false,
      fridgeSectionType: false,
      lowerFrontHeightMm: false,
      fridgeFreestandingType: false,
      cornerOpeningType: false,
      cornerFrontUchylnyWidth: false,
      liftUp: false,
      extendedFront: false,
      drainerFrontType: false,
      drainerWidthSelect: false,
      openingType: true
    };
  }
}
