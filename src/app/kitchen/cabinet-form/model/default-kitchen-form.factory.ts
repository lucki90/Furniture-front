import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {KitchenCabinetType} from './kitchen-cabinet-type';
import {CornerMechanismType} from './corner-cabinet.model';

export class DefaultKitchenFormFactory {
  static create(fb: FormBuilder): FormGroup {
    return fb.group({
      name: [''],  // opcjonalna nazwa szafki
      kitchenCabinetType: [KitchenCabinetType.BASE_ONE_DOOR],
      openingType: ['HANDLE'],  // domyślnie uchwyt
      width: null,
      height: null,
      depth: null,
      positionY: [0],  // wysokość od podłogi (0 = dolna, np. 1400 = wisząca)
      shelfQuantity: null,
      drawerQuantity: null,
      drawerModel: null,
      segments: fb.array([]),  // FormArray dla segmentów (TALL_CABINET)

      // Pola dla szafki narożnej (CORNER_CABINET)
      cornerWidthA: [900],       // Szerokość na ścianie A (mm)
      cornerWidthB: [900],       // Szerokość na ścianie B (mm) — Type A tylko
      cornerMechanism: [CornerMechanismType.FIXED_SHELVES],  // Typ mechanizmu
      cornerShelfQuantity: [2],  // Liczba półek (dla FIXED_SHELVES lub BLIND_CORNER)
      isUpperCorner: [false],    // true = górna wisząca, false = dolna (Type A tylko)
      cornerOpeningType: ['TWO_DOORS'],   // TWO_DOORS | BIFOLD (Type A base tylko)
      cornerFrontUchylnyWidthMm: [500],  // 400–600mm (Type B tylko)

      // Pola pozycjonowania szafek wiszących (UPPER_*)
      positioningMode: ['RELATIVE_TO_CEILING'],  // RELATIVE_TO_CEILING | RELATIVE_TO_COUNTERTOP
      gapFromCountertopMm: [500],                // Odstęp od blatu (min 450mm)
      gapFromAnchorMm: [0],                      // Odstęp od wierzchołka słupka (0–500mm, tylko nad TALL)

      // Pola kaskadowe (dla UPPER_CASCADE)
      cascadeLowerHeight: [400],   // Wysokość dolnego (głębszego) segmentu
      cascadeLowerDepth: [400],    // Głębokość dolnego segmentu (300-560mm)
      cascadeUpperHeight: [320],   // Wysokość górnego (płytszego) segmentu
      cascadeUpperDepth: [300],    // Głębokość górnego segmentu (250-400mm)
      // Opcje frontu per segment (UPPER_CASCADE)
      cascadeLowerIsLiftUp: [false],          // klapa lift-up segmentu dolnego
      cascadeLowerIsFrontExtended: [false],   // przedłużony front segmentu dolnego
      cascadeUpperIsLiftUp: [false],          // klapa lift-up segmentu górnego

      // Pola obudowy bocznej
      leftEnclosureType: ['NONE'],   // EnclosureType dla lewej strony
      rightEnclosureType: ['NONE'],  // EnclosureType dla prawej strony
      leftSupportPlate: [false],     // Podpora blendy (tylko PARALLEL_FILLER_STRIP)
      rightSupportPlate: [false],    // Podpora blendy (tylko PARALLEL_FILLER_STRIP)
      distanceFromWallMm: [null],    // null = użyj wartości z ustawień globalnych
      leftFillerWidthOverrideMm: [null],   // override szerokości lewej blendy (null = użyj globalnego)
      rightFillerWidthOverrideMm: [null],  // override szerokości prawej blendy (null = użyj globalnego)

      // Nowy sposób liczenia dolnych: dolny wieniec na podłodze
      bottomWreathOnFloor: [false],

      // Blokada szafek wiszących powyżej (TALL_CABINET, BASE_FRIDGE)
      blockUpperAbove: [false],

      // Pola szafki zlewowej (BASE_SINK)
      sinkFrontType:     ['TWO_DOORS'],       // ONE_DOOR | TWO_DOORS | DRAWER
      sinkApronEnabled:  [true],              // blenda maskująca ON/OFF
      sinkApronHeightMm: [150],              // wysokość blendy (50–200mm)
      sinkDrawerModel:   ['ANTARO_TANDEMBOX'], // system szuflad (gdy DRAWER)

      // Pola szafki pod płytę grzewczą (BASE_COOKTOP)
      cooktopType:      ['INDUCTION'],        // GAS | INDUCTION
      cooktopFrontType: ['DRAWERS'],          // DRAWERS | TWO_DOORS | ONE_DOOR

      // Pola szafki wiszącej na okap (UPPER_HOOD)
      hoodFrontType:      ['FLAP'],           // FLAP | TWO_DOORS | OPEN
      hoodScreenEnabled:  [false],            // blenda wewnętrzna maskująca mechanizm okapu
      hoodScreenHeightMm: [100],              // wysokość blendy (50–200mm, domyślnie 100mm)

      // Pola szafki na piekarnik (BASE_OVEN)
      ovenHeightType:      ['STANDARD'],    // STANDARD (595mm) | COMPACT (455mm)
      ovenLowerSectionType:['LOW_DRAWER'],  // LOW_DRAWER | HINGED_DOOR | NONE
      ovenApronEnabled:    [false],         // blenda dekoracyjna nad piekarnikiem
      ovenApronHeightMm:   [60],            // wysokość blendy (30–150mm, domyślnie 60mm)

      // Pola szafki na lodówkę (BASE_FRIDGE)
      fridgeSectionType:   ['TWO_DOORS'],   // ONE_DOOR | TWO_DOORS (domyślnie lodówka + zamrażarka)
      lowerFrontHeightMm:  [713],           // wysokość dolnego frontu (zamrażarka, wg dokumentacji)

      // Pola lodówki wolnostojącej (BASE_FRIDGE_FREESTANDING)
      fridgeFreestandingType: ['TWO_DOORS'], // SINGLE_DOOR | TWO_DOORS | SIDE_BY_SIDE

      // Pola szafek wiszących (UPPER_ONE_DOOR, UPPER_TWO_DOOR)
      isLiftUp:       [false],  // klapa lift-up zamiast drzwi obrotowych
      isFrontExtended:[false],  // front wychodzi ponad górny wieniec o extendedFrontMm

      // Pola szafki wiszącej z ociekaczem (UPPER_DRAINER)
      drainerFrontType: ['OPEN']  // OPEN | ONE_DOOR | TWO_DOORS
    });
  }
}
