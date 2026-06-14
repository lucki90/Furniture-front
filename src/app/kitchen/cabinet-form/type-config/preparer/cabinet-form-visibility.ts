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
  pantryPassageFrontType: boolean;

  // BASE_WITH_DRAWERS — drawer layout selector (Równe / 1 niska + N wysokich / Custom)
  drawerLayoutType: boolean;
  drawerCustomHeights: boolean;

  // Upper one/two door options
  liftUp: boolean;
  extendedFront: boolean;
  // UPPER_LIFT_UP — wybór mechanizmu podnośnika klapy (GAS_GTV / Aventos HK top / HK-S / HF top)
  liftMechanismType: boolean;
  // UPPER_LIFT_UP — checkbox: zezwól na trzeci mechanizm Aventos dla zbyt ciężkiego frontu
  allowThirdLiftMechanism: boolean;
  // UPPER_LIFT_UP — pole wysokości górnego frontu HF (fronty asymetryczne, tylko AVENTOS_HF_TOP)
  hfUpperFrontHeightMm: boolean;

  // Opening type
  openingType: boolean;
}
