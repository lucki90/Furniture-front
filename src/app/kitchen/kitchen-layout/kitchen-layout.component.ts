import { Component, inject, computed, Input } from '@angular/core';
import { CommonModule } from "@angular/common";
import { KitchenStateService } from '../service/kitchen-state.service';
import { KitchenCabinet, CabinetZone, getCabinetZone, requiresCountertop } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { SegmentFormData, SegmentType, SegmentFrontType } from '../cabinet-form/model/segment.model';

/**
 * Element frontu przeskalowany do wyświetlania
 */
interface DisplayFront {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hingesSide?: 'LEFT' | 'RIGHT';
}

/**
 * Uchwyt przeskalowany do wyświetlania
 */
interface DisplayHandle {
  type: 'BAR' | 'KNOB';
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
}

/**
 * Nóżka do wyświetlania — pionowy bar od korpusu do podłogi
 */
interface DisplayFoot {
  x: number;
  y1: number;  // górna krawędź nóżki (dół korpusu)
  y2: number;  // dolna krawędź nóżki (podłoga)
}

interface VisualCabinetPosition {
  cabinetId: string;
  name?: string;
  type: KitchenCabinetType;
  // Pozycje w mm (oryginalne)
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  // Pozycje w px (do wyświetlania)
  displayX: number;
  displayY: number;
  displayWidth: number;
  displayHeight: number;
  /** Wysokość korpusu w px (bez strefy cokołu). Dla BOTTOM = displayHeight, dla FULL = displayHeight - feetHeight */
  bodyHeight: number;
  // Typ szafki (dolna/górna/słupek)
  zone: CabinetZone;
  isOverflow: boolean;
  // Czy to szafka narożna
  isCorner: boolean;
  cornerWidthB?: number;
  // Elementy wizualne
  fronts: DisplayFront[];
  handles: DisplayHandle[];
  feet: DisplayFoot[];
  feetHeight: number;
  drawerQuantity?: number;
  segments?: SegmentFormData[];
  // Wskaźniki wymiarów
  heightDiff?: number;
  depthDiff?: number;
  // Obudowy boczne
  leftEnclosureType?: string;
  rightEnclosureType?: string;
  /** Szerokość obudowy w px (0 = brak). Dla płyty bocznej = 18mm×scale, dla blendy = fillerWidth×scale. */
  leftEnclosureDisplayWidth: number;
  rightEnclosureDisplayWidth: number;
  /** Y-pozycja linii separatora piekarnik/sekcja dolna (px). Tylko dla BASE_OVEN gdy jest sekcja dolna. */
  ovenSeparatorDisplayY?: number;
}

@Component({
  selector: 'app-kitchen-layout',
  templateUrl: './kitchen-layout.component.html',
  styleUrls: ['./kitchen-layout.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class KitchenLayoutComponent {

  private stateService = inject(KitchenStateService);

  /** ID aktualnie edytowanej szafki - do podświetlenia */
  @Input() editingCabinetId: string | null = null;

  readonly wall = this.stateService.wall;
  readonly selectedWall = this.stateService.selectedWall;
  readonly cabinetPositions = this.stateService.cabinetPositions;
  readonly fitsOnWall = this.stateService.fitsOnWall;
  readonly totalWidth = this.stateService.totalWidth;
  readonly remainingWidth = this.stateService.remainingWidth;

  // Stałe do wizualizacji
  private readonly BASE_WALL_DISPLAY_WIDTH = 500;
  private readonly WALL_DISPLAY_HEIGHT = 180;

  // Standardowe wymiary dla porównania
  private readonly STANDARD_BOTTOM_HEIGHT = 720;
  private readonly STANDARD_TOP_HEIGHT = 720;
  private readonly STANDARD_BOTTOM_DEPTH = 560;
  private readonly STANDARD_TOP_DEPTH = 320;

  // Minimalna przestrzeń robocza
  private readonly MIN_GAP_MM = 450;

  // ===== Dynamiczne wymiary stref (obliczane z sygnałów projektu) =====

  /** Rzeczywista wysokość strefy dolnej: cokół + max(korpus dolnych, 720) */
  private readonly realBottomZoneMm = computed(() => {
    const plinth = this.stateService.plinthHeightMm();
    // Tylko szafki z blatem — wyklucza wolnostojące AGD (fridge/oven/dishwasher freestanding),
    // żeby ich wysokość nie wpływała na rozmiar strefy dolnej w SVG.
    const bottomCabs = this.stateService.cabinets().filter(c => requiresCountertop(c.type));
    const maxH = bottomCabs.length > 0 ? Math.max(...bottomCabs.map(c => c.height)) : 720;
    return plinth + maxH;
  });

  /** Rzeczywista wysokość strefy górnej: max(korpus górnych, 720) + blenda */
  private readonly realTopZoneMm = computed(() => {
    const filler = this.stateService.upperFillerHeightMm();
    const topCabs = this.stateService.cabinets().filter(c => getCabinetZone(c) === 'TOP');
    const maxH = topCabs.length > 0 ? Math.max(...topCabs.map(c => c.height)) : 720;
    return maxH + filler;
  });

  /** Grubość blatu z ustawień projektu */
  private readonly realCounterMm = computed(() => this.stateService.countertopThicknessMm());

  /** Rzeczywista (nieobcięta) przerwa robocza w mm */
  private readonly actualGapMm = computed(() => {
    const wallH = this.selectedWall()?.heightMm ?? 2400;
    return wallH - this.realTopZoneMm() - this.realCounterMm() - this.realBottomZoneMm();
  });

  /** Czy przerwa robocza narusza minimum 450mm */
  readonly isWorkspaceGapViolation = computed(() =>
    this.hasBottomCabinets() && this.hasHangingCabinets() && this.actualGapMm() < this.MIN_GAP_MM
  );

  /**
   * Ostrzeżenie o minimalnej odległości między płytą grzewczą a szafką/okapem powyżej.
   * Normy: gaz ≥750mm, indukcja ≥600mm (od powierzchni płyty do dołu szafki).
   * Przerwa robocza (actualGapMm) = odległość od blatu do dołu szafek wiszących.
   */
  readonly cooktopGapWarning = computed((): { message: string; minMm: number; actualMm: number } | null => {
    if (!this.hasHangingCabinets()) return null;  // Brak szafek górnych — nie ma czego mierzyć

    const wall = this.selectedWall();
    if (!wall) return null;

    const cooktopCab = wall.cabinets.find(c => c.type === 'BASE_COOKTOP');
    if (!cooktopCab) return null;

    const isGas = cooktopCab.cooktopType === 'GAS';
    const minMm = isGas ? 750 : 600;
    const actualMm = Math.round(this.actualGapMm());

    if (actualMm >= minMm) return null;

    const typeName = isGas ? 'gazowej' : 'indukcyjnej';
    return {
      message: `Odległość między płytą ${typeName} a szafką powyżej: ${actualMm}mm (wymagane min. ${minMm}mm)`,
      minMm,
      actualMm
    };
  });

  /** Przerwa robocza: reszta ściany, min MIN_GAP_MM */
  private readonly realGapMm = computed(() => {
    return Math.max(this.actualGapMm(), this.MIN_GAP_MM);
  });

  /** Łączna wysokość stref w mm */
  private readonly totalRealMm = computed(() =>
    this.realTopZoneMm() + this.realGapMm() + this.realCounterMm() + this.realBottomZoneMm()
  );

  /** Skala pionowa: px/mm */
  private readonly SCALE_VERT = computed(() => this.WALL_DISPLAY_HEIGHT / this.totalRealMm());

  /** Wysokości stref w px */
  private readonly TOP_ZONE_H = computed(() => Math.round(this.realTopZoneMm() * this.SCALE_VERT()));
  private readonly GAP_H = computed(() => Math.round(this.realGapMm() * this.SCALE_VERT()));
  private readonly COUNTER_H = computed(() => Math.round(this.realCounterMm() * this.SCALE_VERT()));
  private readonly BOTTOM_ZONE_H = computed(() => Math.round(this.realBottomZoneMm() * this.SCALE_VERT()));

  /** Wysokość blendy górnej w px */
  readonly fillerHeightPx = computed(() => Math.round(this.stateService.upperFillerHeightMm() * this.SCALE_VERT()));

  /** Przerwa robocza w mm (do wyświetlenia na linii wymiarowej — rzeczywista wartość) */
  readonly gapMm = computed(() => Math.round(this.actualGapMm()));

  // Stałe dla elementów wizualnych
  // Uwaga: FEET_HEIGHT_MM jest getter — używa rzeczywistej wysokości cokołu z ustawień projektu
  private get FEET_HEIGHT_MM(): number { return this.stateService.plinthHeightMm(); }
  /** Szpara między górną krawędzią panelu cokołu a dolną krawędzią korpusu (nóżki są o tyle wyższe) */
  private readonly PLINTH_PANEL_GAP_MM = 3;
  private readonly FRONT_GAP = 1;

  // Nowe sygnały ze state service
  readonly usedWidthBottom = this.stateService.usedWidthBottom;
  readonly usedWidthTop = this.stateService.usedWidthTop;
  readonly remainingWidthBottom = this.stateService.remainingWidthBottom;
  readonly remainingWidthTop = this.stateService.remainingWidthTop;

  // Stałe blatu
  private readonly COUNTERTOP_OVERHANG = 20;  // Nawis blatu z przodu (mm)
  private readonly COUNTERTOP_DEPTH_DEFAULT = 600;  // Domyślna głębokość blatu (mm)

  readonly scaleFactor = computed(() => {
    const wallLength = this.wall().length;
    if (wallLength <= 0) return 1;
    return this.BASE_WALL_DISPLAY_WIDTH / wallLength;
  });

  readonly wallDisplayWidth = computed(() => {
    return this.wall().length * this.scaleFactor();
  });

  readonly wallLabel = computed(() => {
    const wall = this.selectedWall();
    return wall ? this.stateService.getWallLabel(wall.type) : 'Ściana';
  });

  /**
   * Pozycje szafek z uwzględnieniem stref (BOTTOM, TOP, FULL).
   */
  readonly visualPositions = computed((): VisualCabinetPosition[] => {
    const cabinets = this.cabinetPositions();
    const allCabinets = this.stateService.cabinets();
    const scale = this.scaleFactor();
    const wallWidth = this.wallDisplayWidth();
    const sv = this.SCALE_VERT();

    return cabinets.map((cab) => {
      const originalCabinet = allCabinets.find(c => c.id === cab.cabinetId);
      const zone: CabinetZone = originalCabinet ? getCabinetZone(originalCabinet) : 'BOTTOM';
      const cabinetType = originalCabinet?.type || KitchenCabinetType.BASE_ONE_DOOR;
      const depth = originalCabinet?.depth || 560;

      const isCorner = cabinetType === KitchenCabinetType.CORNER_CABINET;
      const cornerWidthB = isCorner ? originalCabinet?.cornerWidthB : undefined;
      const drawerQuantity = originalCabinet?.drawerQuantity;
      const shelfQuantity = originalCabinet?.shelfQuantity;
      const segments = originalCabinet?.segments;
      const cascadeLowerHeight = originalCabinet?.cascadeLowerHeight;
      const cascadeUpperHeight = originalCabinet?.cascadeUpperHeight;

      const displayX = cab.x * scale;
      const displayWidth = cab.width * scale;

      let displayHeight: number;
      let displayY: number;

      switch (zone) {
        case 'FULL':
          displayHeight = Math.round(cab.height * sv);
          displayY = this.WALL_DISPLAY_HEIGHT - displayHeight;
          break;
        case 'TOP':
          displayHeight = Math.round(cab.height * sv);
          // Oblicz Y z rzeczywistego positionY szafki (cab.y = dół szafki od podłogi w mm)
          // SVG: Y=0 = sufit, Y=WALL_DISPLAY_HEIGHT = podłoga
          // Sufit szafki = totalRealMm - (cab.y + cab.height) skalowany do px
          displayY = this.WALL_DISPLAY_HEIGHT - Math.round((cab.y + cab.height) * sv);
          break;
        case 'BOTTOM':
        default:
          displayHeight = Math.round(cab.height * sv);
          // Szafki dolne mają dół przy: podłoga − cokół.
          // Dzięki temu blat dotyka wierzchu najwyższej szafki, a cokół jest poniżej korpusu.
          const feetHeightPxBottom = Math.round(this.FEET_HEIGHT_MM * sv);
          displayY = this.WALL_DISPLAY_HEIGHT - feetHeightPxBottom - displayHeight;
          break;
      }

      const isOverflow = displayX + displayWidth > wallWidth;

      // Nóżki tylko dla dolnych i słupków
      const hasFeet = zone === 'BOTTOM' || zone === 'FULL';
      const feetHeight = hasFeet ? Math.round(this.FEET_HEIGHT_MM * sv) : 0;

      // Wysokość korpusu (bez strefy cokołu/nóżek):
      // - BOTTOM: displayHeight to już sam korpus (nóżki są poniżej, w osobnej strefie)
      // - FULL:   displayHeight obejmuje całą wysokość łącznie z nóżkami — odejmujemy feetHeight
      // - TOP:    feetHeight = 0, więc bodyHeight = displayHeight
      const bodyHeight = zone === 'FULL' ? displayHeight - feetHeight : displayHeight;

      // Generuj nóżki — pozycja: tuż pod korpusem (w szparze nad cokołem)
      const feet = this.generateFeet(displayX, displayY + bodyHeight, displayWidth, feetHeight);

      // Dane piekarnika wbudowanego (dla wizualizacji i separatora)
      const ovenConfig = cabinetType === KitchenCabinetType.BASE_OVEN ? {
        ovenHeightType: originalCabinet?.ovenHeightType,
        ovenLowerSectionType: originalCabinet?.ovenLowerSectionType,
        ovenApronEnabled: originalCabinet?.ovenApronEnabled,
        ovenApronHeightMm: originalCabinet?.ovenApronHeightMm
      } : undefined;

      // Dane lodówki (dla wizualizacji podziału na strefy)
      const fridgeConfig = (cabinetType === KitchenCabinetType.BASE_FRIDGE || cabinetType === KitchenCabinetType.BASE_FRIDGE_FREESTANDING) ? {
        fridgeSectionType: originalCabinet?.fridgeSectionType,
        lowerFrontHeightMm: originalCabinet?.lowerFrontHeightMm,
        fridgeFreestandingType: originalCabinet?.fridgeFreestandingType,
        heightMm: originalCabinet?.height,
        upperSections: originalCabinet?.segments  // sekcje nad lodówką (opcjonalne)
      } : undefined;

      // Generuj fronty i uchwyty
      const { fronts, handles } = this.generateVisualElements(
        cabinetType,
        displayX,
        displayY,
        displayWidth,
        bodyHeight,
        drawerQuantity,
        segments,
        shelfQuantity,
        cascadeLowerHeight,
        cascadeUpperHeight,
        ovenConfig,
        fridgeConfig
      );

      // Separator piekarnik / sekcja dolna (tylko BASE_OVEN, gdy jest sekcja dolna)
      let ovenSeparatorDisplayY: number | undefined;
      if (cabinetType === KitchenCabinetType.BASE_OVEN && ovenConfig?.ovenLowerSectionType !== 'NONE') {
        const T = 18; // grubość płyty (default, wystarczająca dokładność dla wizualizacji)
        const apronH = ovenConfig?.ovenApronEnabled ? (ovenConfig?.ovenApronHeightMm ?? 0) : 0;
        const ovenSlotH = ovenConfig?.ovenHeightType === 'COMPACT' ? 455 : 595;
        ovenSeparatorDisplayY = displayY + Math.round((T + apronH + ovenSlotH) * sv);
        // Ogranicz do obszaru korpusu (zapobiegaj wyjściu poza szafkę)
        if (ovenSeparatorDisplayY >= displayY + bodyHeight || ovenSeparatorDisplayY <= displayY) {
          ovenSeparatorDisplayY = undefined;
        }
      }

      // Oblicz różnice wymiarów
      const standardHeight = zone === 'TOP' ? this.STANDARD_TOP_HEIGHT : this.STANDARD_BOTTOM_HEIGHT;
      const standardDepth = zone === 'TOP' ? this.STANDARD_TOP_DEPTH : this.STANDARD_BOTTOM_DEPTH;
      const heightDiff = cab.height - standardHeight;
      const depthDiff = depth - standardDepth;

      // Oblicz szerokość obudów w px (0 = brak)
      const globalFillerW = this.stateService.fillerWidthMm();
      const PLATE_MM = 18;
      const leftFillerMm = originalCabinet?.leftFillerWidthOverrideMm ?? globalFillerW;
      const rightFillerMm = originalCabinet?.rightFillerWidthOverrideMm ?? globalFillerW;
      const leftEncType = originalCabinet?.leftEnclosureType;
      const rightEncType = originalCabinet?.rightEnclosureType;
      const calcEncW = (type: string | undefined, fillerMm: number): number => {
        if (!type || type === 'NONE') return 0;
        const widthMm = type === 'PARALLEL_FILLER_STRIP' ? fillerMm : PLATE_MM;
        return Math.max(1, Math.round(widthMm * scale));
      };
      const leftEnclosureDisplayWidth = calcEncW(leftEncType, leftFillerMm);
      const rightEnclosureDisplayWidth = calcEncW(rightEncType, rightFillerMm);

      return {
        cabinetId: cab.cabinetId,
        name: cab.name,
        type: cabinetType,
        x: cab.x,
        y: cab.y,
        width: cab.width,
        height: cab.height,
        depth,
        displayX,
        displayY,
        displayWidth,
        displayHeight,
        bodyHeight,
        zone,
        isOverflow,
        isCorner,
        cornerWidthB,
        fronts,
        handles,
        feet,
        feetHeight,
        drawerQuantity,
        segments,
        heightDiff: heightDiff !== 0 ? heightDiff : undefined,
        depthDiff: depthDiff !== 0 ? depthDiff : undefined,
        leftEnclosureType: leftEncType,
        rightEnclosureType: rightEncType,
        leftEnclosureDisplayWidth,
        rightEnclosureDisplayWidth,
        ovenSeparatorDisplayY
      };
    });
  });

  /**
   * Generuje pozycje nóżek dla szafki.
   * Dwie nóżki (lewa i prawa) — pionowe bary od dołu korpusu do podłogi.
   * Cokół (półprzezroczysty) zasłania większość ich długości,
   * ale szpara nad cokołem (1px) pozostaje widoczna.
   */
  private generateFeet(displayX: number, bottomY: number, displayWidth: number, feetHeight: number): DisplayFoot[] {
    if (feetHeight <= 0) return [];

    const margin = Math.max(3, displayWidth * 0.1);
    const floorY = this.WALL_DISPLAY_HEIGHT;

    // Dwie nóżki: lewa i prawa — od dołu korpusu do podłogi
    return [
      { x: displayX + margin,               y1: bottomY, y2: floorY },
      { x: displayX + displayWidth - margin, y1: bottomY, y2: floorY }
    ];
  }

  /**
   * Generuje elementy wizualne (fronty i uchwyty) dla szafki.
   * bodyHeight = wysokość korpusu w px (bez strefy nóżek, obliczona zewnętrznie).
   */
  private generateVisualElements(
    type: KitchenCabinetType,
    displayX: number,
    displayY: number,
    displayWidth: number,
    bodyHeight: number,
    drawerQuantity?: number,
    segments?: SegmentFormData[],
    shelfQuantity?: number,
    cascadeLowerHeight?: number,
    cascadeUpperHeight?: number,
    ovenConfig?: { ovenHeightType?: string; ovenLowerSectionType?: string; ovenApronEnabled?: boolean; ovenApronHeightMm?: number },
    fridgeConfig?: { fridgeSectionType?: string; lowerFrontHeightMm?: number; fridgeFreestandingType?: string; heightMm?: number; upperSections?: SegmentFormData[] }
  ): { fronts: DisplayFront[]; handles: DisplayHandle[] } {
    const fronts: DisplayFront[] = [];
    const handles: DisplayHandle[] = [];

    const gap = this.FRONT_GAP;
    const bodyY = displayY;

    switch (type) {
      case KitchenCabinetType.BASE_ONE_DOOR:
        this.addSingleDoor(fronts, handles, displayX, bodyY, displayWidth, bodyHeight, gap);
        break;

      case KitchenCabinetType.BASE_TWO_DOOR:
        this.addDoubleDoor(fronts, handles, displayX, bodyY, displayWidth, bodyHeight, gap);
        break;

      case KitchenCabinetType.BASE_WITH_DRAWERS:
        this.addDrawers(fronts, handles, displayX, bodyY, displayWidth, bodyHeight, gap, drawerQuantity || 3);
        break;

      case KitchenCabinetType.TALL_CABINET:
        this.addTallCabinetSegments(fronts, handles, displayX, bodyY, displayWidth, bodyHeight, gap, segments);
        break;

      case KitchenCabinetType.CORNER_CABINET:
        // TODO [wizualizacja narożnika — niski priorytet]:
        //
        // 1) WIDOK Z GÓRY (kształt L):
        //    Aktualnie: prostokąt (widthA) — uproszczenie.
        //    Docelowo: wielokąt SVG w kształcie L (ramię A + ramię B pod kątem 90°).
        //    Dane: pos.cornerWidthB już dostępne w VisualCabinetPosition.
        //    Metoda: nowy `addLShapedCornerTopView()` rysujący polygon zamiast rect.
        //
        // 2) WIDOK OD FRONTU — zaznaczenie załamania:
        //    Docelowo: widoczna linia pionowa w miejscu zgięcia narożnika (po widthA - depth od lewej krawędzi).
        //    Prosta pionowa kreska w innym kolorze/stylu — wskazuje granicę ramienia A i ramienia B.
        //
        // 3) ŚLEPY FRONT (cornerOpeningType === 'BLIND'):
        //    Aktualnie: renderuje standardowe drzwi na całej szerokości.
        //    Docelowo: 1 drzwi na ramieniu A (szer. ≈ depth - T), ramię B bez frontu (puste lub szare wypełnienie).
        //    Dane: pos.cornerOpeningType (CornerOpeningType) — dodać to pole do VisualCabinetPosition.
        this.addSingleDoor(fronts, handles, displayX, bodyY, displayWidth, bodyHeight, gap);
        break;

      case KitchenCabinetType.UPPER_ONE_DOOR:
        this.addSingleDoor(fronts, handles, displayX, bodyY, displayWidth, bodyHeight, gap);
        break;

      case KitchenCabinetType.UPPER_TWO_DOOR:
        this.addDoubleDoor(fronts, handles, displayX, bodyY, displayWidth, bodyHeight, gap);
        break;

      case KitchenCabinetType.UPPER_OPEN_SHELF:
        this.addOpenShelf(fronts, displayX, bodyY, displayWidth, bodyHeight, gap, shelfQuantity);
        break;

      case KitchenCabinetType.UPPER_CASCADE:
        this.addCascadeSegments(fronts, handles, displayX, bodyY, displayWidth, bodyHeight, gap, cascadeLowerHeight, cascadeUpperHeight);
        break;

      case KitchenCabinetType.BASE_DISHWASHER_FREESTANDING:
      case KitchenCabinetType.BASE_OVEN_FREESTANDING:
        // Wolnostojące AGD — tylko korpus, bez frontu (wizualizacja AGD)
        break;

      case KitchenCabinetType.BASE_FRIDGE_FREESTANDING:
        // Lodówka wolnostojąca — linie podziału dla TWO_DOORS i SIDE_BY_SIDE
        this.addFridgeFreestandingElements(fronts, displayX, bodyY, displayWidth, bodyHeight, gap, fridgeConfig?.fridgeFreestandingType);
        break;

      case KitchenCabinetType.BASE_FRIDGE:
        // Lodówka w zabudowie — jedna lub dwie sekcje (góra=lodówka, dół=zamrażarka)
        this.addFridgeBuiltInElements(fronts, handles, displayX, bodyY, displayWidth, bodyHeight, gap, fridgeConfig);
        break;

      case KitchenCabinetType.BASE_OVEN:
        this.addOvenElements(fronts, handles, displayX, bodyY, displayWidth, bodyHeight, gap, ovenConfig);
        break;

      default:
        this.addSingleDoor(fronts, handles, displayX, bodyY, displayWidth, bodyHeight, gap);
    }

    return { fronts, handles };
  }

  /**
   * Wizualizacja lodówki w zabudowie (BASE_FRIDGE).
   * Strefa FULL — od podłogi do sufitu.
   * ONE_DOOR: jedno duże drzwi.
   * TWO_DOORS: dwie sekcje — górna (lodówka) i dolna (zamrażarka), proporcjonalnie do lowerFrontHeightMm.
   */
  private addFridgeBuiltInElements(
    fronts: DisplayFront[],
    handles: DisplayHandle[],
    displayX: number,
    bodyY: number,
    displayWidth: number,
    bodyHeight: number,
    gap: number,
    fridgeConfig?: { fridgeSectionType?: string; lowerFrontHeightMm?: number; heightMm?: number; upperSections?: SegmentFormData[] }
  ): void {
    const sectionType = fridgeConfig?.fridgeSectionType ?? 'TWO_DOORS';
    const upperSections = fridgeConfig?.upperSections ?? [];
    const totalHeightMm = fridgeConfig?.heightMm ?? 2000;

    // Oblicz wysokość sekcji górnych (px)
    const upperSectionsHeightMm = upperSections.reduce((sum, s) => sum + (s.height ?? 0), 0);
    const upperSectionsTotalPx = upperSections.length > 0
      ? Math.round((upperSectionsHeightMm / totalHeightMm) * bodyHeight)
      : 0;

    // Renderuj sekcje górne (od góry)
    if (upperSections.length > 0) {
      const sortedUpperSections = [...upperSections].sort((a, b) => a.orderIndex - b.orderIndex);
      let currentUpperY = bodyY + gap;

      for (const section of sortedUpperSections) {
        const sectionPx = Math.round((section.height / totalHeightMm) * bodyHeight) - gap;

        if (section.segmentType === SegmentType.OPEN_SHELF) {
          fronts.push({
            type: 'OPEN',
            x: displayX + gap,
            y: currentUpperY,
            width: displayWidth - gap * 2,
            height: Math.max(1, sectionPx)
          });
        } else {
          // DOOR (ONE_DOOR lub TWO_DOORS)
          if (section.frontType === SegmentFrontType.TWO_DOORS) {
            const doorWidth = (displayWidth - gap * 3) / 2;
            fronts.push(
              { type: 'DOOR_SINGLE', x: displayX + gap, y: currentUpperY, width: doorWidth, height: Math.max(1, sectionPx), hingesSide: 'LEFT' },
              { type: 'DOOR_SINGLE', x: displayX + gap + doorWidth + gap, y: currentUpperY, width: doorWidth, height: Math.max(1, sectionPx), hingesSide: 'RIGHT' }
            );
            handles.push(
              this.createVerticalHandle(displayX + gap + doorWidth - 3, currentUpperY + 3, sectionPx - 6),
              this.createVerticalHandle(displayX + gap + doorWidth + gap + 3, currentUpperY + 3, sectionPx - 6)
            );
          } else {
            fronts.push({ type: 'DOOR_SINGLE', x: displayX + gap, y: currentUpperY, width: displayWidth - gap * 2, height: Math.max(1, sectionPx), hingesSide: 'LEFT' });
            handles.push(this.createVerticalHandle(displayX + displayWidth - gap - 4, currentUpperY + 3, sectionPx - 6));
          }
        }

        currentUpperY += sectionPx + gap;
      }
    }

    // Sekcja lodówki — poniżej sekcji górnych
    const fridgeSectionY = bodyY + upperSectionsTotalPx;
    const fridgeSectionPx = bodyHeight - upperSectionsTotalPx;

    if (sectionType === 'ONE_DOOR') {
      this.addSingleDoor(fronts, handles, displayX, fridgeSectionY, displayWidth, fridgeSectionPx, gap);
    } else {
      // TWO_DOORS: górny front (lodówka) + dolny front (zamrażarka)
      // Proporcja odwołuje się do SAMEJ sekcji lodówki (nie całej szafki)
      const fridgeHeightMm = totalHeightMm - upperSectionsHeightMm;
      const lowerH = fridgeConfig?.lowerFrontHeightMm ?? 713;
      const lowerRatio = Math.min(Math.max(lowerH / Math.max(fridgeHeightMm, 1), 0.1), 0.9);
      const lowerDisplayH = Math.round(fridgeSectionPx * lowerRatio);
      const upperDisplayH = fridgeSectionPx - lowerDisplayH;

      // Górny front (lodówka)
      fronts.push({
        type: 'DOOR_SINGLE',
        x: displayX + gap,
        y: fridgeSectionY + gap,
        width: displayWidth - gap * 2,
        height: Math.max(1, upperDisplayH - gap * 2),
        hingesSide: 'LEFT'
      });
      handles.push(this.createVerticalHandle(
        displayX + displayWidth - gap - 4,
        fridgeSectionY + gap + 3,
        upperDisplayH - gap * 2 - 6
      ));

      // Dolny front (zamrażarka)
      const lowerY = fridgeSectionY + upperDisplayH + gap;
      fronts.push({
        type: 'DOOR_SINGLE',
        x: displayX + gap,
        y: lowerY,
        width: displayWidth - gap * 2,
        height: Math.max(1, lowerDisplayH - gap * 2),
        hingesSide: 'LEFT'
      });
      handles.push(this.createVerticalHandle(
        displayX + displayWidth - gap - 4,
        lowerY + 3,
        lowerDisplayH - gap * 2 - 6
      ));
    }
  }

  /**
   * Wizualizacja lodówki wolnostojącej (BASE_FRIDGE_FREESTANDING).
   * Korpus ma kolor AGD (srebrny). Dodaje linie podziału dla TWO_DOORS i SIDE_BY_SIDE.
   */
  private addFridgeFreestandingElements(
    fronts: DisplayFront[],
    displayX: number,
    bodyY: number,
    displayWidth: number,
    bodyHeight: number,
    gap: number,
    fridgeFreestandingType?: string
  ): void {
    if (!fridgeFreestandingType || fridgeFreestandingType === 'SINGLE_DOOR') {
      return; // Tylko srebrny prostokąt — brak elementów dodatkowych
    }

    if (fridgeFreestandingType === 'TWO_DOORS') {
      // Pozioma linia podziału na ~2/3 wysokości od góry (zamrażarka u dołu)
      const splitY = bodyY + Math.round(bodyHeight * 2 / 3);
      fronts.push({
        type: 'SHELF_LINE',
        x: displayX + gap,
        y: splitY,
        width: displayWidth - gap * 2,
        height: 1
      });
    } else if (fridgeFreestandingType === 'SIDE_BY_SIDE') {
      // Pionowa linia w połowie szerokości (dwa osobne sektory)
      fronts.push({
        type: 'VERT_DIVIDER',
        x: displayX + displayWidth / 2,
        y: bodyY + gap,
        width: 0,
        height: bodyHeight - gap * 2
      });
    }
  }

  /**
   * Dodaje pojedyncze drzwi
   */
  private addSingleDoor(
    fronts: DisplayFront[],
    handles: DisplayHandle[],
    displayX: number,
    bodyY: number,
    displayWidth: number,
    bodyHeight: number,
    gap: number
  ): void {
    fronts.push({
      type: 'DOOR_SINGLE',
      x: displayX + gap,
      y: bodyY + gap,
      width: displayWidth - gap * 2,
      height: bodyHeight - gap * 2,
      hingesSide: 'LEFT'
    });
    handles.push(this.createVerticalHandle(
      displayX + displayWidth - gap - 4,
      bodyY + gap + 3,
      bodyHeight - gap * 2 - 6
    ));
  }

  /**
   * Dodaje podwójne drzwi - POPRAWIONE
   */
  private addDoubleDoor(
    fronts: DisplayFront[],
    handles: DisplayHandle[],
    displayX: number,
    bodyY: number,
    displayWidth: number,
    bodyHeight: number,
    gap: number
  ): void {
    // Szerokość każdych drzwi - dzielimy dostępną przestrzeń na 2
    const doorWidth = (displayWidth - gap * 3) / 2;

    // Lewe drzwi
    fronts.push({
      type: 'DOOR_SINGLE',
      x: displayX + gap,
      y: bodyY + gap,
      width: doorWidth,
      height: bodyHeight - gap * 2,
      hingesSide: 'LEFT'
    });

    // Prawe drzwi
    fronts.push({
      type: 'DOOR_SINGLE',
      x: displayX + gap + doorWidth + gap,
      y: bodyY + gap,
      width: doorWidth,
      height: bodyHeight - gap * 2,
      hingesSide: 'RIGHT'
    });

    // Uchwyt na lewych drzwiach - przy środku szafki (prawa strona lewych drzwi)
    handles.push(this.createVerticalHandle(
      displayX + gap + doorWidth - 3,
      bodyY + gap + 3,
      bodyHeight - gap * 2 - 6
    ));

    // Uchwyt na prawych drzwiach - przy środku szafki (lewa strona prawych drzwi)
    handles.push(this.createVerticalHandle(
      displayX + gap + doorWidth + gap + 3,
      bodyY + gap + 3,
      bodyHeight - gap * 2 - 6
    ));
  }

  /**
   * Dodaje szuflady
   */
  private addDrawers(
    fronts: DisplayFront[],
    handles: DisplayHandle[],
    displayX: number,
    bodyY: number,
    displayWidth: number,
    bodyHeight: number,
    gap: number,
    drawerCount: number
  ): void {
    const drawerHeight = (bodyHeight - gap * (drawerCount + 1)) / drawerCount;
    for (let i = 0; i < drawerCount; i++) {
      const drawerY = bodyY + gap + i * (drawerHeight + gap);
      fronts.push({
        type: 'DRAWER',
        x: displayX + gap,
        y: drawerY,
        width: displayWidth - gap * 2,
        height: drawerHeight
      });
      handles.push(this.createHorizontalHandle(
        displayX + displayWidth / 2,
        drawerY + drawerHeight / 2,
        Math.min(displayWidth * 0.4, 15)
      ));
    }
  }

  /**
   * Wizualizacja piekarnika wbudowanego (BASE_OVEN).
   * Struktura (od góry):
   *  - blenda dekoracyjna (opcjonalna, DOOR_SINGLE)
   *  - wnęka piekarnika (APPLIANCE — szaro-srebrna)
   *  - sekcja dolna: szuflada (DRAWER) | drzwi (DOOR_SINGLE) | brak (NONE)
   * Separator między wnęką a sekcją dolną jest rysowany w HTML jako osobna linia (ovenSeparatorDisplayY).
   */
  private addOvenElements(
    fronts: DisplayFront[],
    handles: DisplayHandle[],
    displayX: number,
    bodyY: number,
    displayWidth: number,
    bodyHeight: number,
    gap: number,
    ovenConfig?: { ovenHeightType?: string; ovenLowerSectionType?: string; ovenApronEnabled?: boolean; ovenApronHeightMm?: number }
  ): void {
    const sv = this.SCALE_VERT();
    const T = 18; // grubość płyty — ta sama stała co po stronie Java
    const apronH = ovenConfig?.ovenApronEnabled ? (ovenConfig?.ovenApronHeightMm ?? 0) : 0;
    const ovenSlotH = ovenConfig?.ovenHeightType === 'COMPACT' ? 455 : 595;
    const lowerSectionType = ovenConfig?.ovenLowerSectionType ?? 'NONE';

    const apronDisplayH = Math.round(apronH * sv);
    const ovenSlotDisplayH = Math.round(ovenSlotH * sv);

    // Blenda dekoracyjna (opcjonalna) — nad wnęką piekarnika
    if (apronH > 0 && apronDisplayH > gap) {
      fronts.push({
        type: 'DOOR_SINGLE',
        x: displayX + gap,
        y: bodyY + gap,
        width: displayWidth - gap * 2,
        height: apronDisplayH - gap,
        hingesSide: 'LEFT'
      });
    }

    // Wnęka piekarnika — szaro-srebrna (APPLIANCE)
    const ovenSlotY = bodyY + Math.round(T * sv) + apronDisplayH;
    fronts.push({
      type: 'APPLIANCE',
      x: displayX + gap,
      y: ovenSlotY,
      width: displayWidth - gap * 2,
      height: ovenSlotDisplayH
    });

    // Sekcja dolna: szuflada lub drzwi
    const lowerStartPx = bodyY + Math.round((T + apronH + ovenSlotH + T) * sv);
    const lowerH = bodyY + bodyHeight - gap - lowerStartPx;

    if (lowerSectionType !== 'NONE' && lowerH > gap * 2) {
      if (lowerSectionType === 'LOW_DRAWER') {
        fronts.push({
          type: 'DRAWER',
          x: displayX + gap,
          y: lowerStartPx,
          width: displayWidth - gap * 2,
          height: lowerH
        });
        handles.push(this.createHorizontalHandle(
          displayX + displayWidth / 2,
          lowerStartPx + lowerH / 2,
          Math.min(displayWidth * 0.4, 15)
        ));
      } else if (lowerSectionType === 'HINGED_DOOR') {
        fronts.push({
          type: 'DOOR_SINGLE',
          x: displayX + gap,
          y: lowerStartPx,
          width: displayWidth - gap * 2,
          height: lowerH,
          hingesSide: 'LEFT'
        });
        handles.push(this.createVerticalHandle(
          displayX + displayWidth - gap - 4,
          lowerStartPx + 3,
          lowerH - 6
        ));
      }
    }
  }

  /**
   * Dodaje otwartą półkę (dla UPPER_OPEN_SHELF)
   */
  private addOpenShelf(
    fronts: DisplayFront[],
    displayX: number,
    bodyY: number,
    displayWidth: number,
    bodyHeight: number,
    gap: number,
    shelfQuantity?: number
  ): void {
    const shelves = shelfQuantity || 2;
    // Rysujemy otwartą szafkę z półkami jako linie
    fronts.push({
      type: 'OPEN',
      x: displayX + gap,
      y: bodyY + gap,
      width: displayWidth - gap * 2,
      height: bodyHeight - gap * 2
    });

    // Dodaj półki wewnątrz
    const shelfSpacing = (bodyHeight - gap * 2) / (shelves + 1);
    for (let i = 1; i <= shelves; i++) {
      const shelfY = bodyY + gap + i * shelfSpacing;
      fronts.push({
        type: 'SHELF_LINE',
        x: displayX + gap + 1,
        y: shelfY,
        width: displayWidth - gap * 2 - 2,
        height: 1
      });
    }
  }

  /**
   * Dodaje segmenty słupka - używa rzeczywistych danych segmentów
   */
  private addTallCabinetSegments(
    fronts: DisplayFront[],
    handles: DisplayHandle[],
    displayX: number,
    bodyY: number,
    displayWidth: number,
    bodyHeight: number,
    gap: number,
    segments?: SegmentFormData[]
  ): void {
    if (!segments || segments.length === 0) {
      // Domyślnie 3 sekcje jeśli brak danych
      const defaultSegments: SegmentFormData[] = [
        { segmentType: SegmentType.DOOR, height: 600, orderIndex: 0, frontType: SegmentFrontType.ONE_DOOR },
        { segmentType: SegmentType.DOOR, height: 600, orderIndex: 1, frontType: SegmentFrontType.ONE_DOOR },
        { segmentType: SegmentType.DRAWER, height: 400, orderIndex: 2, drawerQuantity: 2 }
      ];
      segments = defaultSegments;
    }

    // Sortuj segmenty po orderIndex
    const sortedSegments = [...segments].sort((a, b) => a.orderIndex - b.orderIndex);

    // Oblicz całkowitą wysokość segmentów w mm
    const totalSegmentHeight = sortedSegments.reduce((sum, s) => sum + s.height, 0);

    // Skaluj do dostępnej wysokości w px
    const scale = bodyHeight / totalSegmentHeight;

    let currentY = bodyY + gap;

    for (const segment of sortedSegments) {
      const segmentHeightPx = segment.height * scale - gap;

      switch (segment.segmentType) {
        case SegmentType.DRAWER:
          // Segment z szufladami
          const drawerCount = segment.drawerQuantity || 2;
          const drawerHeight = (segmentHeightPx - gap * (drawerCount - 1)) / drawerCount;
          for (let i = 0; i < drawerCount; i++) {
            const drawerY = currentY + i * (drawerHeight + gap);
            fronts.push({
              type: 'DRAWER',
              x: displayX + gap,
              y: drawerY,
              width: displayWidth - gap * 2,
              height: drawerHeight
            });
            handles.push(this.createHorizontalHandle(
              displayX + displayWidth / 2,
              drawerY + drawerHeight / 2,
              Math.min(displayWidth * 0.4, 12)
            ));
          }
          break;

        case SegmentType.DOOR:
          // Segment z drzwiami
          if (segment.frontType === SegmentFrontType.TWO_DOORS) {
            const doorWidth = (displayWidth - gap * 3) / 2;
            fronts.push(
              {
                type: 'DOOR_SINGLE',
                x: displayX + gap,
                y: currentY,
                width: doorWidth,
                height: segmentHeightPx,
                hingesSide: 'LEFT'
              },
              {
                type: 'DOOR_SINGLE',
                x: displayX + gap + doorWidth + gap,
                y: currentY,
                width: doorWidth,
                height: segmentHeightPx,
                hingesSide: 'RIGHT'
              }
            );
            handles.push(
              this.createVerticalHandle(displayX + gap + doorWidth - 3, currentY + 3, segmentHeightPx - 6),
              this.createVerticalHandle(displayX + gap + doorWidth + gap + 3, currentY + 3, segmentHeightPx - 6)
            );
          } else {
            fronts.push({
              type: 'DOOR_SINGLE',
              x: displayX + gap,
              y: currentY,
              width: displayWidth - gap * 2,
              height: segmentHeightPx,
              hingesSide: 'LEFT'
            });
            handles.push(this.createVerticalHandle(
              displayX + displayWidth - gap - 4,
              currentY + 3,
              segmentHeightPx - 6
            ));
          }
          break;

        case SegmentType.OPEN_SHELF:
          // Segment otwarty - tylko obrys
          fronts.push({
            type: 'OPEN',
            x: displayX + gap,
            y: currentY,
            width: displayWidth - gap * 2,
            height: segmentHeightPx
          });
          break;

        case SegmentType.OVEN:
        case SegmentType.MICROWAVE:
          // Wnęka AGD — srebrno-szary kolor (wypełnienie przez typ 'APPLIANCE')
          fronts.push({
            type: 'APPLIANCE',
            x: displayX + gap,
            y: currentY,
            width: displayWidth - gap * 2,
            height: segmentHeightPx
          });
          break;
      }

      currentY += segmentHeightPx + gap;
    }
  }

  /**
   * Dodaje segmenty szafki kaskadowej (UPPER_CASCADE):
   * - dolny segment (głębszy) – wyższy, z drzwiami
   * - górny segment (płytszy) – niższy, z drzwiami
   */
  private addCascadeSegments(
    fronts: DisplayFront[],
    handles: DisplayHandle[],
    displayX: number,
    bodyY: number,
    displayWidth: number,
    bodyHeight: number,
    gap: number,
    cascadeLowerHeight?: number,
    cascadeUpperHeight?: number
  ): void {
    const lower = cascadeLowerHeight ?? 400;
    const upper = cascadeUpperHeight ?? 320;
    const total = lower + upper;

    const lowerHeightPx = Math.round((lower / total) * bodyHeight);
    const upperHeightPx = bodyHeight - lowerHeightPx;

    // Górny segment (płytszy) – rysowany na górze
    const upperY = bodyY + gap;
    const upperH = upperHeightPx - gap;
    fronts.push({
      type: 'DOOR_SINGLE',
      x: displayX + gap,
      y: upperY,
      width: displayWidth - gap * 2,
      height: upperH,
      hingesSide: 'LEFT'
    });
    handles.push(this.createVerticalHandle(
      displayX + displayWidth - gap - 4,
      upperY + 3,
      upperH - 6
    ));

    // Dolny segment (głębszy) – rysowany poniżej, z linią oddzielającą
    const lowerY = bodyY + upperHeightPx + gap;
    const lowerH = lowerHeightPx - gap * 2;
    fronts.push({
      type: 'DOOR_SINGLE',
      x: displayX + gap,
      y: lowerY,
      width: displayWidth - gap * 2,
      height: lowerH,
      hingesSide: 'LEFT'
    });
    handles.push(this.createVerticalHandle(
      displayX + displayWidth - gap - 4,
      lowerY + 3,
      lowerH - 6
    ));
  }

  /**
   * Tworzy uchwyt pionowy (dla drzwi)
   */
  private createVerticalHandle(x: number, y: number, length: number): DisplayHandle {
    return {
      type: 'BAR',
      x1: x,
      y1: y,
      x2: x,
      y2: y + Math.min(length, 12)
    };
  }

  /**
   * Tworzy uchwyt poziomy (dla szuflad)
   */
  private createHorizontalHandle(centerX: number, centerY: number, halfLength: number): DisplayHandle {
    return {
      type: 'BAR',
      x1: centerX - halfLength,
      y1: centerY,
      x2: centerX + halfLength,
      y2: centerY
    };
  }

  // Czy są szafki górne (TOP lub FULL)
  readonly hasHangingCabinets = computed(() => {
    return this.visualPositions().some(p => p.zone === 'TOP' || p.zone === 'FULL');
  });

  // Czy są szafki dolne (BOTTOM lub FULL)
  readonly hasBottomCabinets = computed(() => {
    return this.visualPositions().some(p => p.zone === 'BOTTOM' || p.zone === 'FULL');
  });

  /**
   * Oblicza wymiary blatu na podstawie szafek dolnych.
   * Zwraca długość i głębokość w mm.
   * Głębokość pobierana z countertopConfig.manualDepthMm (default 600mm).
   * Długość = szerokość szafek + blendy boczne + naddatek boczny (sideOverhangExtraMm, default 5mm z każdej strony).
   */
  readonly countertopDimensions = computed(() => {
    const cabinets = this.stateService.cabinets();
    // Tylko szafki z blatem — wyklucza wolnostojące AGD i BASE_FRIDGE (brak blatu nad nimi).
    const bottomCabinets = cabinets.filter(cab => requiresCountertop(cab.type));

    if (bottomCabinets.length === 0) {
      return null;
    }

    // Głębokość z config (default 600mm)
    const wall = this.selectedWall();
    const depthMm = wall?.countertopConfig?.manualDepthMm ?? this.COUNTERTOP_DEPTH_DEFAULT;

    // Naddatek boczny z config (default 5mm z każdej strony)
    const sideExtra = wall?.countertopConfig?.sideOverhangExtraMm ?? 5;

    // Całkowita szerokość szafek dolnych
    const totalCabinetWidth = bottomCabinets.reduce((sum, cab) => sum + cab.width, 0);

    // Szerokości blend bocznych (z visualPositions) — przeliczone mm
    const sf = this.scaleFactor();
    const bottomPositions = this.visualPositions()
      .filter(p => p.zone === 'BOTTOM')
      .sort((a, b) => a.displayX - b.displayX);

    const leftEnclosureW = (bottomPositions.length > 0 && sf > 0)
      ? Math.round(bottomPositions[0].leftEnclosureDisplayWidth / sf)
      : 0;
    const rightEnclosureW = (bottomPositions.length > 0 && sf > 0)
      ? Math.round(bottomPositions[bottomPositions.length - 1].rightEnclosureDisplayWidth / sf)
      : 0;

    const lengthMm = totalCabinetWidth + leftEnclosureW + rightEnclosureW + 2 * sideExtra;

    return { lengthMm, depthMm };
  });

  /**
   * Prostokąty strefy blatu w pikselach SVG — podzielone w miejscach, gdzie stoją słupki (FULL/TALL_CABINET).
   * Bez słupków: jeden prostokąt obejmuje całą szerokość ściany.
   * Ze słupkami: luki w miejscach szafek FULL (słupek zajmuje całą wysokość ściany — nie ma blatu nad słupkiem).
   *
   * Celowo NIE używa visualPositions() (heavy signal) — korzysta bezpośrednio z cabinetPositions().
   */
  readonly countertopZoneRects = computed((): { x: number; width: number }[] => {
    const cabPositions = this.cabinetPositions();
    const allCabinets = this.stateService.cabinets();
    const sf = this.scaleFactor();
    const wallW = this.wallDisplayWidth();

    // Span każdego słupka (FULL) oraz urządzeń wolnostojących w pikselach SVG.
    // Urządzenia wolnostojące (freestanding) też blokują blat — traktowane jak FULL zone.
    const freestandingTypes = new Set<KitchenCabinetType>([
      KitchenCabinetType.BASE_FRIDGE_FREESTANDING,
      KitchenCabinetType.BASE_OVEN_FREESTANDING,
      KitchenCabinetType.BASE_DISHWASHER_FREESTANDING
    ]);
    const fullSpans = cabPositions
      .filter(cab => {
        const orig = allCabinets.find(c => c.id === cab.cabinetId);
        if (!orig) return false;
        return getCabinetZone(orig) === 'FULL' || freestandingTypes.has(orig.type);
      })
      .map(cab => ({ displayX: cab.x * sf, displayW: cab.width * sf }))
      .sort((a, b) => a.displayX - b.displayX);

    if (fullSpans.length === 0) {
      return [{ x: 0, width: wallW }];
    }

    const rects: { x: number; width: number }[] = [];
    let cursor = 0;

    for (const span of fullSpans) {
      if (span.displayX > cursor + 1) {
        rects.push({ x: cursor, width: span.displayX - cursor });
      }
      cursor = span.displayX + span.displayW;
    }

    if (cursor < wallW - 1) {
      rects.push({ x: cursor, width: wallW - cursor });
    }

    return rects.length > 0 ? rects : [{ x: 0, width: wallW }];
  });

  /**
   * Etykiety wymiarów blatu — jedna per segment (podzielona przy słupkach FULL).
   *
   * - Jeden segment → jak dotychczas: `countertopDimensions()` (cała ściana, z blendami i naddatkami)
   * - Wiele segmentów → per-segment: suma szafek BOTTOM w danym przedziale + naddatek boczny dla
   *   skrajnych segmentów + blendy obudów dla pierwszego (left) i ostatniego (right) segmentu.
   */
  readonly countertopSegmentLabels = computed((): { x: number; lengthMm: number; depthMm: number }[] => {
    if (!this.hasBottomCabinets()) return [];

    const segs = this.countertopZoneRects();
    if (segs.length === 0) return [];

    const wall = this.selectedWall();
    if (!wall) return [];

    const depthMm = wall.countertopConfig?.manualDepthMm ?? this.COUNTERTOP_DEPTH_DEFAULT;

    // Jeden segment — użyj istniejącego countertopDimensions (z blendami + naddatkami)
    if (segs.length === 1) {
      const dim = this.countertopDimensions();
      if (!dim) return [];
      return [{ x: this.wallDisplayWidth() / 2, lengthMm: dim.lengthMm, depthMm }];
    }

    // Wiele segmentów — oblicz długość per segment
    const cabPositions = this.cabinetPositions();
    const allCabinets = this.stateService.cabinets();
    const sf = this.scaleFactor();
    const sideExtra = wall.countertopConfig?.sideOverhangExtraMm ?? 5;

    // Blendy obudów — tylko skrajne szafki dolne z blatem (bez wolnostojących AGD)
    const vPos = this.visualPositions().filter(p => p.zone === 'BOTTOM' && requiresCountertop(p.type)).sort((a, b) => a.displayX - b.displayX);
    const leftEncMm = (vPos.length > 0 && sf > 0) ? Math.round(vPos[0].leftEnclosureDisplayWidth / sf) : 0;
    const rightEncMm = (vPos.length > 0 && sf > 0) ? Math.round(vPos[vPos.length - 1].rightEnclosureDisplayWidth / sf) : 0;

    return segs.map((seg, i) => {
      const isFirst = i === 0;
      const isLast = i === segs.length - 1;

      // Zakres segmentu w mm
      const segStartMm = sf > 0 ? seg.x / sf : 0;
      const segEndMm = sf > 0 ? (seg.x + seg.width) / sf : 0;

      // Szafki z blatem w zakresie segmentu (środek szafki musi być w przedziale).
      // Wyklucza wolnostojące AGD — nie wnoszą do długości blatu.
      const segCabs = cabPositions.filter(cab => {
        const orig = allCabinets.find(c => c.id === cab.cabinetId);
        if (!orig || !requiresCountertop(orig.type)) return false;
        const cabCenter = cab.x + cab.width / 2;
        return cabCenter >= segStartMm - 1 && cabCenter <= segEndMm + 1;
      });

      // Pomiń segment bez szafek dolnych (np. pusty segment za szafką FULL)
      if (segCabs.length === 0) return null;

      const segCabsWidth = segCabs.reduce((sum, p) => sum + p.width, 0);
      const leftExtra  = isFirst ? leftEncMm + sideExtra : 0;
      const rightExtra = isLast  ? rightEncMm + sideExtra : 0;
      const lengthMm   = segCabsWidth + leftExtra + rightExtra;

      return { x: seg.x + seg.width / 2, lengthMm, depthMm };
    }).filter((label): label is { x: number; lengthMm: number; depthMm: number } => label !== null);
  });

  /**
   * Oblicza pozycje i wymiary paneli cokołu pod szafkami dolnymi.
   * Zwraca tablicę segmentów — gdy wolnostojące AGD tworzy lukę między szafkami,
   * powstają dwa osobne odcinki cokołu.
   * Panel cokołu jest o PLINTH_PANEL_GAP_MM (3mm) niższy niż nóżki —
   * przez tę szparę widoczne są końcówki nóżek tuż pod korpusem.
   */
  readonly plinthSegments = computed(() => {
    const positions = this.visualPositions();
    // Tylko szafki mające cokół (nie wolnostojące AGD)
    const plinthPositions = positions.filter(p =>
      (p.zone === 'BOTTOM' || p.zone === 'FULL') &&
      p.type !== KitchenCabinetType.BASE_FRIDGE_FREESTANDING &&
      p.type !== KitchenCabinetType.BASE_OVEN_FREESTANDING &&
      p.type !== KitchenCabinetType.BASE_DISHWASHER_FREESTANDING
    ).sort((a, b) => a.displayX - b.displayX);

    if (plinthPositions.length === 0) return [];

    const feetHeight = plinthPositions[0]?.feetHeight ?? 0;
    if (feetHeight <= 0) return [];

    const sv = this.SCALE_VERT();
    const plinthGapPx = Math.max(Math.round(this.PLINTH_PANEL_GAP_MM * sv), 1);
    const plinthPanelH = feetHeight - plinthGapPx;
    const plinthY = this.WALL_DISPLAY_HEIGHT - plinthPanelH;

    // Wyznacz efektywną lewą/prawą krawędź każdej szafki (uwzględniając blendy boczne)
    const effectivePositions = plinthPositions.map(p => ({
      left: this.plinthExtendsInto(p.leftEnclosureType)
        ? p.displayX - p.leftEnclosureDisplayWidth
        : p.displayX,
      right: this.plinthExtendsInto(p.rightEnclosureType)
        ? p.displayX + p.displayWidth + p.rightEnclosureDisplayWidth
        : p.displayX + p.displayWidth
    })).sort((a, b) => a.left - b.left);

    // Grupuj ciągłe zakresy — luka (np. wolnostojące AGD) tworzy osobny odcinek cokołu
    const runs: Array<{ x: number; endX: number }> = [];
    let current = { x: effectivePositions[0].left, endX: effectivePositions[0].right };
    for (let i = 1; i < effectivePositions.length; i++) {
      const pos = effectivePositions[i];
      if (pos.left > current.endX + 0.5) {
        runs.push(current);
        current = { x: pos.left, endX: pos.right };
      } else {
        current.endX = Math.max(current.endX, pos.right);
      }
    }
    runs.push(current);

    return runs.map(r => ({
      x: r.x,
      y: plinthY,
      width: r.endX - r.x,
      height: plinthPanelH
    }));
  });

  /**
   * Zwraca pierwszy segment cokołu (lub null) — używany jako punkt odniesienia
   * dla linii podziału cokołu (Y-koordynat) oraz jako guard w plinthJoinXPositions.
   */
  readonly plinthPosition = computed(() => {
    const segs = this.plinthSegments();
    return segs.length > 0 ? segs[0] : null;
  });

  // Pozostałe miejsce - dolne szafki
  readonly remainingBottomSpaceX = computed(() => {
    return this.usedWidthBottom() * this.scaleFactor();
  });

  readonly remainingBottomSpaceWidth = computed(() => {
    return this.remainingWidthBottom() * this.scaleFactor();
  });

  // Pozostałe miejsce - górne szafki
  readonly remainingTopSpaceX = computed(() => {
    return this.usedWidthTop() * this.scaleFactor();
  });

  readonly remainingTopSpaceWidth = computed(() => {
    if (!this.hasHangingCabinets()) return 0;
    return this.remainingWidthTop() * this.scaleFactor();
  });

  // Pozycje stref (dynamiczne)
  get topZoneY(): number { return 0; }
  get topZoneHeight(): number { return this.TOP_ZONE_H(); }
  get gapZoneY(): number { return this.TOP_ZONE_H(); }
  get gapZoneHeight(): number { return this.GAP_H(); }
  get counterZoneY(): number { return this.TOP_ZONE_H() + this.GAP_H(); }
  get counterZoneHeight(): number { return this.COUNTER_H(); }
  get bottomZoneY(): number { return this.TOP_ZONE_H() + this.GAP_H() + this.COUNTER_H(); }
  get bottomZoneHeight(): number { return this.BOTTOM_ZONE_H(); }
  get totalHeight(): number { return this.WALL_DISPLAY_HEIGHT; }

  /**
   * Pozycja blendy górnej (filler) nad szafkami wiszącymi.
   * Wyświetlana tylko gdy upperFillerHeightMm > 0 i są szafki wiszące.
   */
  readonly fillerPosition = computed(() => {
    const filler = this.stateService.upperFillerHeightMm();
    if (filler <= 0) return null;

    const topPositions = this.visualPositions().filter(p => p.zone === 'TOP');
    if (topPositions.length === 0) return null;

    // Blenda górna rozciąga się od pierwszej do ostatniej szafki wiszącej — uwzględnij blendy boczne.
    // SIDE_PLATE_TO_FLOOR (tu: do sufitu) → płyta sięga sama do sufitu; blenda górna NIE wchodzi w jej obszar.
    const minX = Math.min(...topPositions.map(p =>
      this.plinthExtendsInto(p.leftEnclosureType)
        ? p.displayX - p.leftEnclosureDisplayWidth
        : p.displayX
    ));
    const maxX = Math.max(...topPositions.map(p =>
      this.plinthExtendsInto(p.rightEnclosureType)
        ? p.displayX + p.displayWidth + p.rightEnclosureDisplayWidth
        : p.displayX + p.displayWidth
    ));
    const fillerH = this.fillerHeightPx();

    return {
      x: minX,
      y: 0,   // Blenda jest na samej górze strefy TOP
      width: maxX - minX,
      height: fillerH
    };
  });

  /**
   * Czy cokół globalny (lub blenda górna) ma rozciągać się nad/pod danym typem obudowy bocznej.
   *
   * Reguła:
   * - SIDE_PLATE_WITH_PLINTH, PARALLEL_FILLER_STRIP → cokół/blenda ROZCIĄGAJĄ SIĘ nad blendą boczną (✓)
   * - SIDE_PLATE_TO_FLOOR (dla dolnych: do podłogi; dla górnych: do sufitu) → płyta sama dociera do
   *   podłogi/sufitu, cokół/blenda globalna NIE wchodzi w jej obszar (↔ 18mm mniej z tej strony)
   * - NONE / undefined → brak obudowy, nie ma znaczenia (i tak enclosureDisplayWidth = 0)
   */
  private plinthExtendsInto(type: string | undefined): boolean {
    return !!type && type !== 'NONE' && type !== 'SIDE_PLATE_TO_FLOOR';
  }

  /** Maksymalna długość segmentu płyty (cokół, blenda górna) w mm — limit standardowej płyty. */
  private readonly MAX_BOARD_SEGMENT_MM = 2800;

  /**
   * Pozycje spojenia cokołu (w pikselach SVG) — z preferencją styku szafek (jak backend).
   * Algorytm: szuka końca szafki najbliżej 2800mm; jeśli nie ma — szuka za 2800mm.
   * Wyświetlane jako przerywane czerwone linie na wizualizacji.
   */
  readonly plinthJoinXPositions = computed(() => {
    const plinth = this.plinthPosition();
    if (!plinth) return [];
    return this.computePlinthJoinPositions();
  });

  /**
   * Pozycje spojenia blendy górnej (w pikselach SVG) — co 2800mm od lewej krawędzi blendy.
   * Blenda górna nie ma preferencji styku szafek — prosta formuła co 2800mm.
   * Wyświetlane jako przerywane czerwone linie na wizualizacji.
   */
  readonly fillerJoinXPositions = computed(() => {
    const filler = this.fillerPosition();
    if (!filler) return [];
    return this.computeJoinPositions(filler.x, filler.width);
  });

  /**
   * Oblicza pozycje spojenia cokołu z preferencją styków szafek (dolnych i słupków).
   * Replikuje algorytm backendowy findOptimalSplitPoints() z PlinthCalculationService.
   * Zwraca absolutne pozycje X w pikselach SVG.
   */
  private computePlinthJoinPositions(): number[] {
    const sf = this.scaleFactor();
    const maxSegPx = this.MAX_BOARD_SEGMENT_MM * sf;

    // Szafki dolne i słupki (te które mają cokół)
    const bottomPositions = this.visualPositions()
      .filter(p => p.zone === 'BOTTOM' || p.zone === 'FULL')
      .sort((a, b) => a.displayX - b.displayX);

    if (bottomPositions.length === 0) return [];

    const startXPx = bottomPositions[0].displayX;
    const endXPx = Math.max(...bottomPositions.map(p => p.displayX + p.displayWidth));
    const totalWidthPx = endXPx - startXPx;

    if (totalWidthPx <= maxSegPx) return [];

    // Końce prawych krawędzi korpusów szafek (absolutne pozycje w px SVG)
    const cabinetEndPxs = [...new Set(
      bottomPositions.map(p => p.displayX + p.displayWidth)
    )].sort((a, b) => a - b);

    const joinPositions: number[] = [];
    let currentX = startXPx;
    let remaining = totalWidthPx;

    while (remaining > maxSegPx) {
      const targetX = currentX + maxSegPx;

      // Znajdź ostatni koniec szafki w przedziale (currentX, targetX]
      let bestX = targetX;
      let foundEnd = false;
      for (const endX of cabinetEndPxs) {
        if (endX > currentX && endX <= targetX) {
          bestX = endX;
          foundEnd = true;
        }
      }

      // Jeśli nie znaleziono — szukaj pierwszego końca szafki za targetX
      if (!foundEnd) {
        for (const endX of cabinetEndPxs) {
          if (endX > targetX) {
            bestX = endX;
            break;
          }
        }
      }

      joinPositions.push(bestX);
      remaining -= (bestX - currentX);
      currentX = bestX;
    }

    return joinPositions;
  }

  /**
   * Oblicza pozycje X linii spojenia dla elementu o podanym początku i szerokości (w px).
   * Prosta formuła: linie co 2800mm od startXPx (używana dla blendy górnej).
   */
  private computeJoinPositions(startXPx: number, totalWidthPx: number): number[] {
    const maxSegPx = this.MAX_BOARD_SEGMENT_MM * this.scaleFactor();
    const positions: number[] = [];
    let x = startXPx + maxSegPx;
    while (x < startXPx + totalWidthPx - 1) {
      positions.push(x);
      x += maxSegPx;
    }
    return positions;
  }

  /**
   * Linia wymiarowa gap (przestrzeń robocza między blatem a szafkami wiszącymi).
   * Wyświetlana gdy są zarówno szafki dolne jak i wiszące.
   */
  readonly gapDimensionLine = computed(() => {
    if (!this.hasBottomCabinets() || !this.hasHangingCabinets()) return null;

    const topH = this.TOP_ZONE_H();
    const gapH = this.GAP_H();
    const wallW = this.wallDisplayWidth();

    const actualGap = this.actualGapMm();
    const isWarning = actualGap < this.MIN_GAP_MM;
    return {
      x: wallW + 4,           // Po prawej stronie wizualizacji
      y1: topH,                // Dolna krawędź szafek wiszących
      y2: topH + gapH,         // Górna krawędź blatu
      label: `${Math.round(actualGap)} mm`,
      isWarning
    };
  });

  getCabinetLabel(pos: VisualCabinetPosition, index: number): string {
    const num = index + 1;
    const suffix = this.getCabinetTypeSuffix(pos.type);
    if (suffix) {
      return `${num}(${suffix})`;
    }
    return pos.name || `${num}`;
  }

  private getCabinetTypeSuffix(type: KitchenCabinetType): string | null {
    switch (type) {
      case KitchenCabinetType.BASE_DISHWASHER:
      case KitchenCabinetType.BASE_DISHWASHER_FREESTANDING:
        return 'zmyw.';
      case KitchenCabinetType.BASE_SINK:
        return 'zlew';
      case KitchenCabinetType.UPPER_HOOD:
        return 'okap';
      case KitchenCabinetType.BASE_OVEN:
      case KitchenCabinetType.BASE_OVEN_FREESTANDING:
        return 'piek.';
      case KitchenCabinetType.BASE_FRIDGE:
        return 'lod.';
      case KitchenCabinetType.BASE_FRIDGE_FREESTANDING:
        return 'lod.wol.';
      default:
        return null;
    }
  }

  /**
   * Pozycja Y prostokąta obudowy w SVG (w px).
   *
   * Reguła dla SIDE_PLATE_TO_FLOOR:
   * - strefa TOP (szafka wisząca) → płyta sięga DO SUFITU, zaczyna od y=0
   * - strefa BOTTOM/FULL → zaczyna od displayY (góra korpusu), sięga do podłogi
   *
   * Pozostałe typy → zawsze displayY (góra korpusu)
   */
  enclosureDisplayY(type: string | undefined, zone: CabinetZone, displayY: number): number {
    return type === 'SIDE_PLATE_TO_FLOOR' && zone === 'TOP' ? 0 : displayY;
  }

  /**
   * Wysokość prostokąta obudowy w px.
   *
   * Reguła dla SIDE_PLATE_TO_FLOOR:
   * - strefa TOP → od sufitu (y=0) do dołu korpusu = displayY + bodyHeight
   * - strefa BOTTOM/FULL → od góry korpusu do podłogi = bodyHeight + feetHeight
   *
   * Pozostałe typy → tylko wysokość korpusu (bodyHeight)
   */
  enclosureDisplayHeight(
    type: string | undefined,
    zone: CabinetZone,
    displayY: number,
    bodyHeight: number,
    feetHeight: number
  ): number {
    if (type === 'SIDE_PLATE_TO_FLOOR') {
      return zone === 'TOP' ? displayY + bodyHeight : bodyHeight + feetHeight;
    }
    return bodyHeight;
  }

  /**
   * @deprecated Użyj enclosureDisplayHeight z parametrem zone.
   */
  enclosureHeight(type: string | undefined, bodyHeight: number, feetHeight: number): number {
    return type === 'SIDE_PLATE_TO_FLOOR' ? bodyHeight + feetHeight : bodyHeight;
  }

  /**
   * Sprawdza czy szafka jest aktualnie edytowana
   */
  isEditing(cabinetId: string): boolean {
    return this.editingCabinetId === cabinetId;
  }

  /**
   * Formatuje różnicę wymiaru do wyświetlenia
   */
  formatDimensionDiff(diff: number | undefined): string {
    if (!diff) return '';
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff}`;
  }

  /**
   * Sprawdza czy różnica jest znacząca (wymaga uwagi)
   */
  isSignificantDiff(diff: number | undefined): boolean {
    if (!diff) return false;
    return Math.abs(diff) > 50; // Powyżej 50mm to znacząca różnica
  }
}
