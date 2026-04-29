import { FormBuilder, FormGroup } from '@angular/forms';
import { KitchenCabinetType } from './kitchen-cabinet-type';
import { CornerMechanismType } from './corner-cabinet.model';

export class DefaultKitchenFormFactory {
  static create(fb: FormBuilder): FormGroup {
    return fb.group({
      name: [''],
      kitchenCabinetType: [KitchenCabinetType.BASE_ONE_DOOR],
      openingType: ['HANDLE'],
      width: null,
      height: null,
      depth: null,
      positionY: [0],
      shelfQuantity: null,
      drawerQuantity: null,
      drawerModel: null,
      cargoVariant: ['MECHANISM'],
      cargoBrand: ['BLUM'],
      segments: fb.array([]),

      // Corner cabinet
      cornerWidthA: [900],
      cornerWidthB: [900],
      cornerMechanism: [CornerMechanismType.FIXED_SHELVES],
      cornerShelfQuantity: [2],
      isUpperCorner: [false],
      cornerOpeningType: ['TWO_DOORS'],
      cornerFrontUchylnyWidthMm: [500],

      // Upper positioning
      positioningMode: ['RELATIVE_TO_CEILING'],
      gapFromCountertopMm: [500],
      gapFromAnchorMm: [0],
      cabinetSide: ['FRONT'],
      gapBeforeMm: [0],

      // Cascade
      cascadeLowerHeight: [400],
      cascadeLowerDepth: [400],
      cascadeUpperHeight: [320],
      cascadeUpperDepth: [300],
      cascadeLowerIsLiftUp: [false],
      cascadeLowerIsFrontExtended: [false],
      cascadeUpperIsLiftUp: [false],

      // Enclosures
      leftEnclosureType: ['NONE'],
      rightEnclosureType: ['NONE'],
      leftSupportPlate: [false],
      rightSupportPlate: [false],
      distanceFromWallMm: [null],
      leftFillerWidthOverrideMm: [null],
      rightFillerWidthOverrideMm: [null],

      // Base cabinet structure
      bottomWreathOnFloor: [false],
      blockUpperAbove: [false],

      // Sink
      sinkFrontType: ['TWO_DOORS'],
      sinkApronEnabled: [true],
      sinkApronHeightMm: [150],
      sinkDrawerModel: ['ANTARO_TANDEMBOX'],

      // Cooktop
      cooktopType: ['INDUCTION'],
      cooktopFrontType: ['DRAWERS'],

      // Hood
      hoodFrontType: ['FLAP'],
      hoodScreenEnabled: [false],
      hoodScreenHeightMm: [100],

      // Oven
      ovenHeightType: ['STANDARD'],
      ovenLowerSectionType: ['LOW_DRAWER'],
      ovenApronEnabled: [false],
      ovenApronHeightMm: [60],

      // Built-in fridge
      fridgeSectionType: ['TWO_DOORS'],
      lowerFrontHeightMm: [713],

      // Freestanding fridge
      fridgeFreestandingType: ['TWO_DOORS'],

      // Upper one/two door
      isLiftUp: [false],
      isFrontExtended: [false],

      // Drainer
      drainerFrontType: ['OPEN']
    });
  }
}
