export interface CabinetFormVisibility {
  shelfQuantity: boolean;
  drawerQuantity: boolean;
  drawerModel: boolean;
  cargoVariant: boolean;
  cargoBrand: boolean;
  segments: boolean;

  // Corner cabinet fields
  width: boolean;
  cornerWidthA: boolean;
  cornerWidthB: boolean;
  cornerMechanism: boolean;
  cornerShelfQuantity: boolean;
  isUpperCorner: boolean;
  cornerOpeningType: boolean;
  cornerFrontUchylnyWidth: boolean;

  // Upper cabinet positioning
  positioningMode: boolean;
  gapFromCountertopMm: boolean;
  gapFromAnchorMm: boolean;

  // Blocking uppers above a cabinet
  blockUpperAbove: boolean;

  // Upper cascade
  cascadeSegments: boolean;

  // Side enclosures
  enclosureSection: boolean;

  // Base cabinet structural variants
  bottomWreathOnFloor: boolean;

  // Sink cabinet
  sinkFrontType: boolean;
  sinkApron: boolean;
  sinkApronHeight: boolean;
  sinkDrawerModel: boolean;

  // Cooktop cabinet
  cooktopType: boolean;
  cooktopFrontType: boolean;

  // Hood cabinet
  hoodFrontType: boolean;
  hoodScreenEnabled: boolean;
  hoodScreenHeight: boolean;

  // Oven cabinet
  ovenHeightType: boolean;
  ovenLowerSectionType: boolean;
  ovenApronEnabled: boolean;
  ovenApronHeight: boolean;
  ovenDrawerModel: boolean;

  // Built-in fridge
  fridgeSectionType: boolean;
  lowerFrontHeightMm: boolean;

  // Freestanding fridge
  fridgeFreestandingType: boolean;

  // Drainer
  drainerFrontType: boolean;
  drainerWidthSelect: boolean;

  // Cargo
  cargoWidthSelect: boolean;

  // Upper one/two door options
  liftUp: boolean;
  extendedFront: boolean;

  // Opening type
  openingType: boolean;
}
