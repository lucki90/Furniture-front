import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { CabinetFormEditingService } from './cabinet-form-editing.service';
import { KitchenCabinetTypeConfig } from './type-config/kitchen-cabinet-type-config';
import { CabinetFormVisibility } from './type-config/preparer/cabinet-form-visibility';
import { CornerMechanismType } from './model/corner-cabinet.model';
import {
  LiftMechanismType,
  ProjectSettingsConstraints,
  supportsHfAsymmetricFront,
  supportsThirdLiftMechanism
} from './model/kitchen-cabinet-constants';
import { hfUpperFrontHeightValidator } from './types/upper-lift-up/upper-lift-up.validators';

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

  /**
   * Aktualizuje widoczność opcji wiszącego ślepego narożnika po zmianie mechanizmu narożnikowego.
   * Wywołać gdy `cornerMechanism` zmienia wartość wewnątrz istniejącego formularza (preparer nie jest wtedy
   * ponownie uruchamiany, żeby nie resetować wymiarów).
   * Mutuje `form` (wstawia wartości domyślne dla trybu wiszącej blendy) i zwraca zaktualizowaną widoczność.
   */
  refreshCornerHangingVisibility(
    form: FormGroup,
    visibility: CabinetFormVisibility,
    mechanism: CornerMechanismType | null
  ): CabinetFormVisibility {
    const wantsUpper = form.get('isUpperCorner')?.value ?? false;
    const upperBlind = mechanism === CornerMechanismType.BLIND_CORNER && wantsUpper;

    if (upperBlind) {
      form.patchValue({
        positioningMode: form.get('positioningMode')?.value ?? 'RELATIVE_TO_CEILING',
        gapFromCountertopMm: form.get('gapFromCountertopMm')?.value
          ?? ProjectSettingsConstraints.UPPER_GAP_FROM_COUNTERTOP_DEFAULT,
        isFrontExtended: form.get('isFrontExtended')?.value ?? false,
        isLiftUp: false
      }, { emitEvent: false });
    }

    return {
      ...visibility,
      positioningMode: upperBlind,
      gapFromCountertopMm: upperBlind,
      gapFromAnchorMm: upperBlind,
      extendedFront: upperBlind,
      liftUp: false,
      blockUpperAbove: !upperBlind
    };
  }

  /**
   * Aktualizuje widoczność opcji zależnych od mechanizmu podnośnika klapy (UPPER_LIFT_UP).
   * Wywołać gdy `liftMechanismType` zmienia wartość wewnątrz istniejącego formularza.
   * Mutuje `form` (zeruje opcje nieobsługiwane przez nowy mechanizm) i zwraca zaktualizowaną widoczność.
   */
  refreshLiftMechanismDependentVisibility(
    form: FormGroup,
    visibility: CabinetFormVisibility,
    mechanism: LiftMechanismType | null
  ): CabinetFormVisibility {
    const allowsThird = supportsThirdLiftMechanism(mechanism);
    const allowsHfAsymmetry = supportsHfAsymmetricFront(mechanism);

    if (!allowsThird && form.get('allowThirdLiftMechanism')?.value) {
      form.get('allowThirdLiftMechanism')?.setValue(false, { emitEvent: false });
    }

    const hfControl = form.get('hfUpperFrontHeightMm');
    if (allowsHfAsymmetry) {
      hfControl?.setValidators(hfUpperFrontHeightValidator);
    } else {
      hfControl?.clearValidators();
      if (hfControl?.value != null) {
        hfControl.setValue(null, { emitEvent: false });
      }
    }
    hfControl?.updateValueAndValidity({ emitEvent: false });

    return {
      ...visibility,
      allowThirdLiftMechanism: allowsThird,
      hfUpperFrontHeightMm: allowsHfAsymmetry
    };
  }

  createBaseVisibility(): CabinetFormVisibility {
    return {
      width: false,
      shelfQuantity: false,
      drawerQuantity: false,
      drawerModel: false,
      cargoVariant: false,
      cargoBrand: false,
      segments: false,
      cornerWidthA: false,
      cornerWidthB: false,
      cornerMechanism: false,
      cornerShelfQuantity: false,
      isUpperCorner: false,
      positioningMode: false,
      gapFromCountertopMm: false,
      gapFromAnchorMm: false,
      blockUpperAbove: false,
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
      liftMechanismType: false,
      allowThirdLiftMechanism: false,
      hfUpperFrontHeightMm: false,
      drainerFrontType: false,
      drainerWidthSelect: false,
      cargoWidthSelect: false,
      pantryPassageFrontType: false,
      drawerLayoutType: false,
      drawerCustomHeights: false,
      openingType: true
    };
  }
}
