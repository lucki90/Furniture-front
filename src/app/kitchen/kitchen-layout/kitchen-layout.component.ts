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

  // Rzeczywiste wymiary w mm (do obliczeń skali)
  private readonly REAL_BOTTOM_ZONE_MM = 860;
  private readonly REAL_TOP_ZONE_MM = 720;
  private readonly REAL_COUNTER_MM = 38;
  private readonly REAL_GAP_MM = 500;

  // Standardowe wymiary dla porównania
  private readonly STANDARD_BOTTOM_HEIGHT = 720;
  private readonly STANDARD_TOP_HEIGHT = 720;
  private readonly STANDARD_BOTTOM_DEPTH = 560;
  private readonly STANDARD_TOP_DEPTH = 320;

  // Proporcjonalne wysokości stref w px
  private readonly SCALE_VERTICAL = this.WALL_DISPLAY_HEIGHT / 2118;
  private readonly BOTTOM_ZONE_HEIGHT = Math.round(this.REAL_BOTTOM_ZONE_MM * this.SCALE_VERTICAL);
  private readonly COUNTER_HEIGHT = Math.round(this.REAL_COUNTER_MM * this.SCALE_VERTICAL);
  private readonly GAP_HEIGHT = Math.round(this.REAL_GAP_MM * this.SCALE_VERTICAL);
  private readonly TOP_ZONE_HEIGHT = Math.round(this.REAL_TOP_ZONE_MM * this.SCALE_VERTICAL);

  // Stałe dla elementów wizualnych
  private readonly FEET_HEIGHT_MM = 100;
  private readonly FRONT_GAP = 1;

  // Nowe sygnały ze state service
  readonly usedWidthBottom = this.stateService.usedWidthBottom;
  readonly usedWidthTop = this.stateService.usedWidthTop;
  readonly remainingWidthBottom = this.stateService.remainingWidthBottom;
  readonly remainingWidthTop = this.stateService.remainingWidthTop;

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

    return cabinets.map((cab) => {
      const originalCabinet = allCabinets.find(c => c.id === cab.cabinetId);
      const zone: CabinetZone = originalCabinet ? getCabinetZone(originalCabinet) : 'BOTTOM';
      const cabinetType = originalCabinet?.type || KitchenCabinetType.BASE_ONE_DOOR;
      const depth = originalCabinet?.depth || 560;

      const isCorner = cabinetType === KitchenCabinetType.CORNER_CABINET;
      const cornerWidthB = isCorner ? originalCabinet?.cornerWidthB : undefined;
      const drawerQuantity = originalCabinet?.drawerQuantity;
      const segments = originalCabinet?.segments;

      const displayX = cab.x * scale;
      const displayWidth = cab.width * scale;

      let displayHeight: number;
      let displayY: number;

      switch (zone) {
        case 'FULL':
          displayHeight = Math.round(cab.height * this.SCALE_VERTICAL);
          displayY = this.WALL_DISPLAY_HEIGHT - displayHeight;
          break;
        case 'TOP':
          displayHeight = Math.round(cab.height * this.SCALE_VERTICAL);
          displayY = this.TOP_ZONE_HEIGHT - displayHeight;
          break;
        case 'BOTTOM':
        default:
          displayHeight = Math.round(cab.height * this.SCALE_VERTICAL);
          const bottomZoneTop = this.TOP_ZONE_HEIGHT + this.GAP_HEIGHT + this.COUNTER_HEIGHT;
          displayY = bottomZoneTop + (this.BOTTOM_ZONE_HEIGHT - displayHeight);
          break;
      }

      const isOverflow = displayX + displayWidth > wallWidth;

      // Nóżki tylko dla dolnych i słupków
      const hasFeet = zone === 'BOTTOM' || zone === 'FULL';
      const feetHeight = hasFeet ? Math.round(this.FEET_HEIGHT_MM * this.SCALE_VERTICAL) : 0;

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
        segments
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
    segments?: SegmentFormData[]
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

  // Pozycje stref
  get topZoneY(): number { return 0; }
  get topZoneHeight(): number { return this.TOP_ZONE_HEIGHT; }
  get gapZoneY(): number { return this.TOP_ZONE_HEIGHT; }
  get gapZoneHeight(): number { return this.GAP_HEIGHT; }
  get counterZoneY(): number { return this.TOP_ZONE_HEIGHT + this.GAP_HEIGHT; }
  get counterZoneHeight(): number { return this.COUNTER_HEIGHT; }
  get bottomZoneY(): number { return this.TOP_ZONE_HEIGHT + this.GAP_HEIGHT + this.COUNTER_HEIGHT; }
  get bottomZoneHeight(): number { return this.BOTTOM_ZONE_HEIGHT; }
  get totalHeight(): number { return this.WALL_DISPLAY_HEIGHT; }

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
