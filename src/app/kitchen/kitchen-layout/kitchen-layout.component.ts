import { Component, inject, computed, Input } from '@angular/core';
import { CommonModule } from "@angular/common";
import { KitchenStateService } from '../service/kitchen-state.service';
import { KitchenCabinet, CabinetZone, getCabinetZone } from '../model/kitchen-state.model';
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
 * Nóżka do wyświetlania
 */
interface DisplayFoot {
  x: number;
  y: number;
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
    const bottomCabs = this.stateService.cabinets().filter(c => getCabinetZone(c) === 'BOTTOM');
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

      // Generuj nóżki
      const feet = this.generateFeet(displayX, displayY + displayHeight, displayWidth, feetHeight);

      // Generuj fronty i uchwyty
      const { fronts, handles } = this.generateVisualElements(
        cabinetType,
        displayX,
        displayY,
        displayWidth,
        displayHeight,
        feetHeight,
        drawerQuantity,
        segments,
        shelfQuantity,
        cascadeLowerHeight,
        cascadeUpperHeight
      );

      // Oblicz różnice wymiarów
      const standardHeight = zone === 'TOP' ? this.STANDARD_TOP_HEIGHT : this.STANDARD_BOTTOM_HEIGHT;
      const standardDepth = zone === 'TOP' ? this.STANDARD_TOP_DEPTH : this.STANDARD_BOTTOM_DEPTH;
      const heightDiff = cab.height - standardHeight;
      const depthDiff = depth - standardDepth;

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
        depthDiff: depthDiff !== 0 ? depthDiff : undefined
      };
    });
  });

  /**
   * Generuje pozycje nóżek dla szafki
   */
  private generateFeet(displayX: number, bottomY: number, displayWidth: number, feetHeight: number): DisplayFoot[] {
    if (feetHeight <= 0) return [];

    const feet: DisplayFoot[] = [];
    const footY = bottomY - 2; // Trochę wyżej od samego dołu

    // 4 nóżki - na rogach z lekkim marginesem
    const margin = Math.max(3, displayWidth * 0.1);
    feet.push(
      { x: displayX + margin, y: footY },
      { x: displayX + displayWidth - margin, y: footY }
    );

    // Dodatkowe nóżki dla szerszych szafek
    if (displayWidth > 40) {
      feet.push(
        { x: displayX + margin, y: footY - feetHeight + 4 },
        { x: displayX + displayWidth - margin, y: footY - feetHeight + 4 }
      );
    }

    return feet;
  }

  /**
   * Generuje elementy wizualne (fronty i uchwyty) dla szafki
   */
  private generateVisualElements(
    type: KitchenCabinetType,
    displayX: number,
    displayY: number,
    displayWidth: number,
    displayHeight: number,
    feetHeight: number,
    drawerQuantity?: number,
    segments?: SegmentFormData[],
    shelfQuantity?: number,
    cascadeLowerHeight?: number,
    cascadeUpperHeight?: number
  ): { fronts: DisplayFront[]; handles: DisplayHandle[] } {
    const fronts: DisplayFront[] = [];
    const handles: DisplayHandle[] = [];

    const gap = this.FRONT_GAP;
    const bodyHeight = displayHeight - feetHeight;
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

      default:
        this.addSingleDoor(fronts, handles, displayX, bodyY, displayWidth, bodyHeight, gap);
    }

    return { fronts, handles };
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
   */
  readonly countertopDimensions = computed(() => {
    const cabinets = this.stateService.cabinets();
    const bottomCabinets = cabinets.filter(cab => {
      const zone = getCabinetZone(cab);
      return zone === 'BOTTOM' || zone === 'FULL';
    });

    if (bottomCabinets.length === 0) {
      return null;
    }

    // Całkowita szerokość szafek dolnych
    const totalWidth = bottomCabinets.reduce((sum, cab) => sum + cab.width, 0);

    // Blat ma standardową głębokość 600mm i nawis z przodu
    const lengthMm = totalWidth + this.COUNTERTOP_OVERHANG;
    const depthMm = this.COUNTERTOP_DEPTH_DEFAULT;

    return { lengthMm, depthMm };
  });

  /**
   * Oblicza pozycję i wymiary cokołu pod szafkami dolnymi.
   */
  readonly plinthPosition = computed(() => {
    const positions = this.visualPositions();
    // Znajdź szafki dolne i słupki które mają cokół
    const bottomPositions = positions.filter(p => p.zone === 'BOTTOM' || p.zone === 'FULL');

    if (bottomPositions.length === 0) {
      return null;
    }

    // Cokół ciągnie się od pierwszej do ostatniej szafki dolnej
    const minX = Math.min(...bottomPositions.map(p => p.displayX));
    const maxX = Math.max(...bottomPositions.map(p => p.displayX + p.displayWidth));

    // Wysokość cokołu w px
    const feetHeight = bottomPositions[0]?.feetHeight ?? 0;

    // Cokół zawsze przy podłodze: Y = WALL_DISPLAY_HEIGHT - feetHeight
    // (niezależnie od wysokości konkretnych szafek — stały punkt odniesienia)
    const plinthY = this.WALL_DISPLAY_HEIGHT - feetHeight;

    return {
      x: minX,
      y: plinthY,
      width: maxX - minX,
      height: feetHeight
    };
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

    const minX = Math.min(...topPositions.map(p => p.displayX));
    const maxX = Math.max(...topPositions.map(p => p.displayX + p.displayWidth));
    const fillerH = this.fillerHeightPx();

    return {
      x: minX,
      y: 0,   // Blenda jest na samej górze strefy TOP
      width: maxX - minX,
      height: fillerH
    };
  });

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
    if (pos.name) {
      return pos.name;
    }
    return `${index + 1}`;
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
