import { Component, inject, computed, output, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenStateService } from '../service/kitchen-state.service';
import { WallType } from '../model/kitchen-project.model';
import { WallWithCabinets, CabinetZone, getCabinetZone, requiresCountertop } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

interface WallPosition {
  wall: WallWithCabinets;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  labelX: number;
  labelY: number;
  // Dla rysowania szafek
  isHorizontal: boolean;
  scale: number;
}

interface CabinetOnFloorPlan {
  cabinetId: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  zone: CabinetZone;
  isCorner: boolean;       // Czy to szafka narożna
  isFreestanding: boolean; // Czy to wolnostojące AGD (kolor srebrny, brak blatu)
  wallType: WallType;      // Typ ściany — potrzebny do obliczenia łuku otwarcia drzwi
}

/** Dane łuku otwarcia drzwi w rzucie z góry. */
interface FloorPlanArc {
  cabinetId: string;
  pathD: string;
  hasCollision: boolean;
  /** Obwiednia łuku (do detekcji kolizji). */
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
}

interface CountertopOnFloorPlan {
  x: number;
  y: number;
  width: number;
  depth: number;
  // Wymiary w mm do wyświetlenia
  lengthMm: number;
  depthMm: number;
  // Pozycje etykiet wymiarów
  lengthLabelX: number;
  lengthLabelY: number;
  depthLabelX: number;
  depthLabelY: number;
  // Kierunek etykiet
  isHorizontal: boolean;
}

/** Wizualizacja narożnego segmentu blatu w rzucie z góry (Faza 13.1). */
interface CornerCountertopViz {
  // Prostokąt narożny w SVG (depthA × depthB)
  x: number;
  y: number;
  sizePx: number;
  // Linia miter (skos 45°)
  miterX1: number; miterY1: number;
  miterX2: number; miterY2: number;
  label: string;
}

@Component({
  selector: 'app-kitchen-floor-plan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen-floor-plan.component.html',
  styleUrls: ['./kitchen-floor-plan.component.css']
})
export class KitchenFloorPlanComponent {
  private stateService = inject(KitchenStateService);

  /** ID aktualnie edytowanej szafki - do podświetlenia */
  @Input() editingCabinetId: string | null = null;

  readonly walls = this.stateService.walls;
  readonly selectedWallId = this.stateService.selectedWallId;

  // Przełączniki widoczności (współdzielone z kitchen-layout przez state service)
  readonly showCountertop = this.stateService.showCountertop;
  readonly showUpperCabinets = this.stateService.showUpperCabinets;

  /** Przełącznik wyświetlania łuków otwarcia drzwi w rzucie z góry. */
  readonly showDoorArcs = signal(false);

  addWallRequested = output<void>();
  wallRemoved = output<string>();

  // SVG dimensions
  private readonly SVG_WIDTH = 320;
  private readonly SVG_HEIGHT = 240;
  private readonly WALL_THICKNESS = 10;
  private readonly PADDING = 30;

  // Blat - wymiary w mm
  private readonly COUNTERTOP_OVERHANG = 30;  // Nawis blatu z przodu (mm)
  private readonly COUNTERTOP_STANDARD_DEPTH = 600;    // Standardowa głębokość blatu (mm)

  // Obliczona skala (potrzebna też dla szafek)
  private currentScale = 0.1;

  readonly wallPositions = computed((): WallPosition[] => {
    const walls = this.walls();
    const positions: WallPosition[] = [];

    // Find walls by type
    const mainWall = walls.find(w => w.type === 'MAIN');
    const leftWall = walls.find(w => w.type === 'LEFT');
    const rightWall = walls.find(w => w.type === 'RIGHT');
    const cornerLeft = walls.find(w => w.type === 'CORNER_LEFT');
    const cornerRight = walls.find(w => w.type === 'CORNER_RIGHT');
    const island = walls.find(w => w.type === 'ISLAND');

    // Calculate scale based on total dimensions
    const maxWidth = Math.max(
      (mainWall?.widthMm ?? 0),
      (leftWall?.widthMm ?? 0) + (mainWall?.widthMm ?? 0) + (rightWall?.widthMm ?? 0)
    );
    const maxHeight = Math.max(
      (leftWall?.widthMm ?? 0),
      (rightWall?.widthMm ?? 0),
      2000
    );

    const scaleX = (this.SVG_WIDTH - 2 * this.PADDING) / Math.max(maxWidth, 1000);
    const scaleY = (this.SVG_HEIGHT - 2 * this.PADDING) / Math.max(maxHeight, 1000);
    const scale = Math.min(scaleX, scaleY, 0.12);
    this.currentScale = scale;

    // Center point
    const centerX = this.SVG_WIDTH / 2;
    const centerY = this.SVG_HEIGHT - this.PADDING - 15;

    // MAIN wall - horizontal at bottom
    if (mainWall) {
      const width = mainWall.widthMm * scale;
      positions.push({
        wall: mainWall,
        x: centerX - width / 2,
        y: centerY - this.WALL_THICKNESS,
        width: width,
        height: this.WALL_THICKNESS,
        rotation: 0,
        labelX: centerX,
        labelY: centerY + 12,
        isHorizontal: true,
        scale
      });
    }

    // LEFT wall - vertical on left side
    if (leftWall) {
      const mainWidth = (mainWall?.widthMm ?? 3000) * scale;
      const height = leftWall.widthMm * scale;
      const x = centerX - mainWidth / 2 - this.WALL_THICKNESS;
      positions.push({
        wall: leftWall,
        x: x,
        y: centerY - this.WALL_THICKNESS - height,
        width: this.WALL_THICKNESS,
        height: height,
        rotation: 0,
        labelX: x - 8,
        labelY: centerY - this.WALL_THICKNESS - height / 2,
        isHorizontal: false,
        scale
      });
    }

    // RIGHT wall - vertical on right side
    if (rightWall) {
      const mainWidth = (mainWall?.widthMm ?? 3000) * scale;
      const height = rightWall.widthMm * scale;
      const x = centerX + mainWidth / 2;
      positions.push({
        wall: rightWall,
        x: x,
        y: centerY - this.WALL_THICKNESS - height,
        width: this.WALL_THICKNESS,
        height: height,
        rotation: 0,
        labelX: x + this.WALL_THICKNESS + 8,
        labelY: centerY - this.WALL_THICKNESS - height / 2,
        isHorizontal: false,
        scale
      });
    }

    // CORNER_LEFT - diagonal or L-shape at top-left
    if (cornerLeft) {
      const mainWidth = (mainWall?.widthMm ?? 3000) * scale;
      const leftHeight = (leftWall?.widthMm ?? 0) * scale;
      const width = cornerLeft.widthMm * scale;
      positions.push({
        wall: cornerLeft,
        x: centerX - mainWidth / 2 - this.WALL_THICKNESS,
        y: centerY - this.WALL_THICKNESS - leftHeight - width,
        width: width,
        height: this.WALL_THICKNESS,
        rotation: 0,
        labelX: centerX - mainWidth / 2 - this.WALL_THICKNESS + width / 2,
        labelY: centerY - this.WALL_THICKNESS - leftHeight - width - 8,
        isHorizontal: true,
        scale
      });
    }

    // CORNER_RIGHT - diagonal or L-shape at top-right
    if (cornerRight) {
      const mainWidth = (mainWall?.widthMm ?? 3000) * scale;
      const rightHeight = (rightWall?.widthMm ?? 0) * scale;
      const width = cornerRight.widthMm * scale;
      positions.push({
        wall: cornerRight,
        x: centerX + mainWidth / 2 + this.WALL_THICKNESS - width,
        y: centerY - this.WALL_THICKNESS - rightHeight - width,
        width: width,
        height: this.WALL_THICKNESS,
        rotation: 0,
        labelX: centerX + mainWidth / 2 + this.WALL_THICKNESS - width / 2,
        labelY: centerY - this.WALL_THICKNESS - rightHeight - width - 8,
        isHorizontal: true,
        scale
      });
    }

    // ISLAND - rectangle in center
    if (island) {
      const width = island.widthMm * scale;
      const depth = 600 * scale; // standard depth
      positions.push({
        wall: island,
        x: centerX - width / 2,
        y: centerY - this.WALL_THICKNESS - 80 - depth,
        width: width,
        height: depth,
        rotation: 0,
        labelX: centerX,
        labelY: centerY - this.WALL_THICKNESS - 80 - depth / 2,
        isHorizontal: true,
        scale
      });
    }

    return positions;
  });

  /**
   * Oblicza pozycje narożnych segmentów blatu na widoku z góry (Faza 13.1).
   *
   * Dla każdej kombinacji pozioma+pionowa (MAIN+LEFT, MAIN+RIGHT, CORNER_LEFT+LEFT itp.)
   * rysuje kwadrat blatu narożnego (domyślna głębokość 600mm × 600mm) w kącie styku ścian
   * oraz linię miter (skos 45°) przez ten kwadrat. Tylko gdy showCountertop()=true.
   *
   * TODO(Faza 13.1+): Gdy backend zwróci rzeczywistą głębokość narożnika w CornerCountertopResponse,
   * użyj jej zamiast COUNTERTOP_STANDARD_DEPTH (wymaga @Input/signal z wynikiem kalkulacji).
   */
  readonly cornerCountertopPositions = computed((): CornerCountertopViz[] => {
    if (!this.showCountertop()) return [];

    const positions = this.wallPositions();
    const result: CornerCountertopViz[] = [];

    // Wyciągnij pozycje ścian wg typów
    const main = positions.find(p => p.wall.type === 'MAIN');
    const cornerLeft = positions.find(p => p.wall.type === 'CORNER_LEFT');
    const cornerRight = positions.find(p => p.wall.type === 'CORNER_RIGHT');
    const leftWall = positions.find(p => p.wall.type === 'LEFT');
    const rightWall = positions.find(p => p.wall.type === 'RIGHT');

    // Ściany poziome mogą być MAIN, CORNER_LEFT lub CORNER_RIGHT
    const horizontalWalls = [main, cornerLeft, cornerRight].filter(Boolean) as WallPosition[];

    for (const horizontal of horizontalWalls) {
      if (leftWall) {
        const corner = this.buildCornerViz(horizontal, leftWall, 'left');
        if (corner) result.push(corner);
      }
      if (rightWall) {
        const corner = this.buildCornerViz(horizontal, rightWall, 'right');
        if (corner) result.push(corner);
      }
    }

    return result;
  });

  /**
   * Buduje wizualizację narożnika dla ściany poziomej i pionowej.
   * Zwraca null, gdy ściany nie stykają się geometrycznie w tym układzie.
   */
  private buildCornerViz(
    horizontal: WallPosition,
    vertical: WallPosition,
    side: 'left' | 'right'
  ): CornerCountertopViz | null {
    const scale = horizontal.scale;
    const depthPx = this.COUNTERTOP_STANDARD_DEPTH * scale;

    // Górna krawędź ściany poziomej (= dół obszaru blatu poziomego)
    const mainTop = horizontal.y;

    if (side === 'left') {
      // Narożnik L_CORNER_LEFT: prawy-dolny kąt blatu ściany pionowej styka się
      // z lewym-dolnym kątem blatu ściany poziomej
      const cornerX = horizontal.x;                 // lewa krawędź ściany poziomej
      const cornerY = mainTop - depthPx;             // blat ściany poziomej sięga do mainTop - depthPx

      // Sprawdź czy ściana pionowa faktycznie sięga do tego miejsca
      const vertRightEdge = vertical.x + vertical.width;
      if (Math.abs(vertRightEdge - cornerX) > 2) return null; // nie stykają się

      // Narożnik lewy: prostokąt jest wewnątrz kuchni — po prawej stronie lewej ściany
      // (corner.x = cornerX, prostokąt rozciąga się W PRAWO o depthPx, czyli w głąb kuchni)
      return {
        x: cornerX,
        y: cornerY,
        sizePx: depthPx,
        // Linia miter: od dołu-lewego (cornerX, mainTop) do góry-prawego (cornerX+depthPx, cornerY)
        miterX1: cornerX,           miterY1: mainTop,
        miterX2: cornerX + depthPx, miterY2: cornerY,
        label: `${this.COUNTERTOP_STANDARD_DEPTH}×${this.COUNTERTOP_STANDARD_DEPTH}mm`
      };
    } else {
      // Narożnik L_CORNER_RIGHT: prawy kąt ściany poziomej spotyka prawą ścianę pionową
      const cornerX = horizontal.x + horizontal.width; // prawa krawędź ściany poziomej
      const cornerY = mainTop - depthPx;

      // Sprawdź czy ściana pionowa faktycznie styka się od prawej
      const vertLeftEdge = vertical.x;
      if (Math.abs(vertLeftEdge - cornerX) > 2) return null;

      // Narożnik prawy: prostokąt jest wewnątrz kuchni — po lewej stronie prawej ściany
      // (corner.x = cornerX - depthPx, prostokąt rozciąga się od cornerX-depthPx do cornerX)
      return {
        x: cornerX - depthPx,
        y: cornerY,
        sizePx: depthPx,
        // Linia miter: od dołu-prawego (cornerX, mainTop) do góry-lewego (cornerX-depthPx, cornerY)
        miterX1: cornerX,           miterY1: mainTop,
        miterX2: cornerX - depthPx, miterY2: cornerY,
        label: `${this.COUNTERTOP_STANDARD_DEPTH}×${this.COUNTERTOP_STANDARD_DEPTH}mm`
      };
    }
  }

  /**
   * Oblicza łuki otwarcia drzwi dla wszystkich szafek (dolnych i słupków) w rzucie z góry.
   *
   * Każdy łuk to sektor koła 90° — wizualizacja strefy, w której otwierają się drzwi.
   * Domyślnie zakładamy lewy zawias (LEFT hinge). Łuk jest czerwony gdy jego obwiednia
   * zachodzi na sąsiednią szafkę (kolizja), zielony w przeciwnym razie.
   *
   * Zwraca pustą tablicę gdy showDoorArcs()=false (lazy evaluation).
   */
  readonly doorArcData = computed((): FloorPlanArc[] => {
    if (!this.showDoorArcs()) return [];

    const positions = this.wallPositions();
    const arcs: FloorPlanArc[] = [];

    // Zbierz wszystkie prostokąty szafek do detekcji kolizji
    const allRects: { id: string; x: number; y: number; w: number; h: number }[] = [];
    for (const pos of positions) {
      for (const cab of this.getCabinetsForWall(pos)) {
        allRects.push({ id: cab.cabinetId, x: cab.x, y: cab.y, w: cab.width, h: cab.depth });
      }
    }

    // Zbuduj arki — BOTTOM i FULL (dolne + słupki), nie TOP
    for (const pos of positions) {
      for (const cab of this.getCabinetsForWall(pos)) {
        if (cab.isFreestanding) continue;
        if (cab.zone === 'TOP') continue;

        const arc = this.buildFloorPlanArc(cab);
        if (arc) arcs.push(arc);
      }
    }

    // Wykryj kolizje — arc bounding box ∩ każda szafka (oprócz własnej)
    for (const arc of arcs) {
      for (const rect of allRects) {
        if (rect.id === arc.cabinetId) continue;
        if (this.rectsOverlap(arc.bboxX, arc.bboxY, arc.bboxW, arc.bboxH,
                              rect.x, rect.y, rect.w, rect.h)) {
          arc.hasCollision = true;
          break;
        }
      }
    }

    return arcs;
  });

  /**
   * Buduje łuk otwarcia drzwi dla jednej szafki w rzucie z góry (defaultowy zawias: lewy).
   *
   * Matematyka (SVG Y↓):
   *   MAIN wall (pozioma, front face y = cab.y — strona "do pokoju"):
   *     LEFT hinge: center=(cab.x, cab.y), start=(cx+r, cy), end=(cx, cy−r), sweep=0
   *     RIGHT hinge: center=(cab.x+r, cab.y), start=(cx−r, cy), end=(cx, cy−r), sweep=1
   *   LEFT wall (pionowa, front face x = cab.x + cab.width):
   *     LEFT hinge: center=(frontX, cab.y+r), start=(frontX, cab.y), end=(frontX+r, cy), sweep=1
   *   RIGHT wall (pionowa, front face x = cab.x):
   *     LEFT hinge: center=(frontX, cab.y), start=(frontX, cab.y+r), end=(frontX−r, cy), sweep=1
   */
  private buildFloorPlanArc(cab: CabinetOnFloorPlan, hingeSide: 'LEFT' | 'RIGHT' = 'LEFT'): FloorPlanArc | null {
    let pathD: string;
    let bboxX: number, bboxY: number, bboxW: number, bboxH: number;

    switch (cab.wallType) {
      case 'MAIN':
      case 'CORNER_LEFT':
      case 'CORNER_RIGHT':
      case 'ISLAND': {
        // Pozioma ściana: front face = górna krawędź szafki (y = cab.y), pokój nad/poniżej
        // Szafki na MAIN stoją przy ścianie (dół SVG) — front face przy mniejszym Y
        const r = cab.width;
        const cx = hingeSide === 'LEFT' ? cab.x : cab.x + r;
        const frontY = cab.y;  // front face = wyższa krawędź (bliżej środka pokoju)

        if (hingeSide === 'LEFT') {
          // center=(cab.x, frontY), start=(cx+r, frontY), end=(cx, frontY-r), sweep=0
          pathD = `M ${cx + r},${frontY} A ${r},${r} 0 0 0 ${cx},${frontY - r} L ${cx},${frontY} Z`;
          bboxX = cx; bboxY = frontY - r; bboxW = r; bboxH = r;
        } else {
          // center=(cab.x+r, frontY), start=(cx-r, frontY), end=(cx, frontY-r), sweep=1
          pathD = `M ${cx - r},${frontY} A ${r},${r} 0 0 1 ${cx},${frontY - r} L ${cx},${frontY} Z`;
          bboxX = cx - r; bboxY = frontY - r; bboxW = r; bboxH = r;
        }
        break;
      }
      case 'LEFT': {
        // Pionowa ściana po lewej stronie: front face = prawa krawędź szafki (x = cab.x + cab.width)
        const r = cab.depth;
        const frontX = cab.x + cab.width;

        if (hingeSide === 'LEFT') {
          // Zawias w dolnym rogu (większy Y) — center=(frontX, cab.y+r)
          pathD = `M ${frontX},${cab.y} A ${r},${r} 0 0 1 ${frontX + r},${cab.y + r} L ${frontX},${cab.y + r} Z`;
          bboxX = frontX; bboxY = cab.y; bboxW = r; bboxH = r;
        } else {
          // Zawias w górnym rogu (mniejszy Y) — center=(frontX, cab.y)
          pathD = `M ${frontX},${cab.y + r} A ${r},${r} 0 0 0 ${frontX + r},${cab.y} L ${frontX},${cab.y} Z`;
          bboxX = frontX; bboxY = cab.y; bboxW = r; bboxH = r;
        }
        break;
      }
      case 'RIGHT': {
        // Pionowa ściana po prawej stronie: front face = lewa krawędź szafki (x = cab.x)
        const r = cab.depth;
        const frontX = cab.x;

        if (hingeSide === 'LEFT') {
          // Zawias w górnym rogu (mniejszy Y) — center=(frontX, cab.y)
          pathD = `M ${frontX},${cab.y + r} A ${r},${r} 0 0 1 ${frontX - r},${cab.y} L ${frontX},${cab.y} Z`;
          bboxX = frontX - r; bboxY = cab.y; bboxW = r; bboxH = r;
        } else {
          // Zawias w dolnym rogu (większy Y) — center=(frontX, cab.y+r)
          pathD = `M ${frontX},${cab.y} A ${r},${r} 0 0 0 ${frontX - r},${cab.y + r} L ${frontX},${cab.y + r} Z`;
          bboxX = frontX - r; bboxY = cab.y; bboxW = r; bboxH = r;
        }
        break;
      }
      default:
        return null;
    }

    return { cabinetId: cab.cabinetId, pathD, hasCollision: false, bboxX, bboxY, bboxW, bboxH };
  }

  /**
   * AABB collision detection. Touching edges = NO collision.
   */
  private rectsOverlap(ax: number, ay: number, aw: number, ah: number,
                        bx: number, by: number, bw: number, bh: number): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  onWallClick(wallId: string): void {
    this.stateService.selectWall(wallId);
  }

  onAddWall(): void {
    this.addWallRequested.emit();
  }

  onRemoveWall(wallId: string, event: Event): void {
    event.stopPropagation();
    this.wallRemoved.emit(wallId);
  }

  isSelected(wallId: string): boolean {
    return this.selectedWallId() === wallId;
  }

  getWallLabel(type: WallType): string {
    return this.stateService.getWallLabel(type);
  }

  getWallShortLabel(type: WallType): string {
    switch (type) {
      case 'MAIN': return 'G';
      case 'LEFT': return 'L';
      case 'RIGHT': return 'P';
      case 'CORNER_LEFT': return 'NL';
      case 'CORNER_RIGHT': return 'NP';
      case 'ISLAND': return 'W';
      default: return type;
    }
  }

  canRemoveWall(): boolean {
    return this.walls().length > 1;
  }

  getWallColor(wall: WallWithCabinets, isSelected: boolean): string {
    if (isSelected) {
      return '#1976d2';
    }
    if (wall.type === 'ISLAND') {
      return '#8d6e63';
    }
    return '#9e9e9e';
  }

  getWallTooltip(wall: WallWithCabinets): string {
    return `${this.getWallLabel(wall.type)}: ${wall.widthMm}mm, ${wall.cabinets.length} szafek`;
  }

  /**
   * Oblicza pozycje szafek dla danej ściany na widoku z góry.
   * Szafki są zwracane w kolejności: najpierw dolne (BOTTOM), potem słupki (FULL), potem górne (TOP).
   * Dzięki temu górne są renderowane na wierzchu i częściowo zasłaniają dolne.
   * Używa rzeczywistej głębokości szafki (cabinet.depth).
   */
  getCabinetsForWall(pos: WallPosition): CabinetOnFloorPlan[] {
    const wall = pos.wall;
    const scale = pos.scale;

    // Osobne liczniki X dla każdej strefy
    let currentXBottom = 0;
    let currentXTop = 0;

    // Najpierw obliczamy pozycje wszystkich szafek
    const bottomCabinets: CabinetOnFloorPlan[] = [];
    const topCabinets: CabinetOnFloorPlan[] = [];
    const fullCabinets: CabinetOnFloorPlan[] = [];

    for (const cabinet of wall.cabinets) {
      const zone = getCabinetZone(cabinet);
      const cabinetWidth = cabinet.width * scale;
      // Użyj rzeczywistej głębokości szafki
      const cabinetDepth = cabinet.depth * scale;
      // Sprawdź czy to narożnik
      const isCorner = cabinet.type === KitchenCabinetType.CORNER_CABINET;

      let posX: number;

      switch (zone) {
        case 'FULL':
          // Słupki zajmują max z obu liczników, potem przesuwają oba
          posX = Math.max(currentXBottom, currentXTop);
          currentXBottom = posX + cabinet.width;
          currentXTop = posX + cabinet.width;
          break;
        case 'TOP':
          posX = currentXTop;
          currentXTop += cabinet.width;
          break;
        case 'BOTTOM':
        default:
          posX = currentXBottom;
          currentXBottom += cabinet.width;
          break;
      }

      // Wolnostojące AGD (fridge/oven freestanding) — srebrny kolor, brak blatu
      const isFreestanding = !requiresCountertop(cabinet.type) && zone === 'BOTTOM';

      const cabinetOnPlan = this.createCabinetOnFloorPlan(
        cabinet.id,
        cabinet.name,
        pos,
        wall.type,
        posX * scale,
        cabinetWidth,
        cabinetDepth,
        zone,
        isCorner,
        isFreestanding
      );

      // Grupuj według strefy
      switch (zone) {
        case 'BOTTOM':
          bottomCabinets.push(cabinetOnPlan);
          break;
        case 'TOP':
          topCabinets.push(cabinetOnPlan);
          break;
        case 'FULL':
          fullCabinets.push(cabinetOnPlan);
          break;
      }
    }

    // Zwróć w kolejności: dolne -> słupki -> górne
    // Dzięki temu SVG renderuje górne na wierzchu
    return [...bottomCabinets, ...fullCabinets, ...topCabinets];
  }

  /**
   * Oblicza pozycje blatu dla danej ściany jako listę segmentów.
   * Każdy segment odpowiada ciągłemu "przebiegu" szafek z requiresCountertop=true.
   * Przebieg jest przerywany przez FULL (TALL_CABINET, BASE_FRIDGE) lub wolnostojące AGD.
   * Pozycje X obliczane są tak samo jak w getCabinetsForWall(), aby blat trafił
   * dokładnie nad szafki dolne (nawet gdy poprzedza je lodówka lub słupek).
   */
  getCountertopsForWall(pos: WallPosition): CountertopOnFloorPlan[] {
    const wall = pos.wall;

    // Symuluj pozycje X szafek — identyczny algorytm jak getCabinetsForWall()
    let currentXBottom = 0;
    let currentXTop = 0;

    const result: CountertopOnFloorPlan[] = [];

    // Aktualny ciągły przebieg szafek dolnych z requiresCountertop=true
    let runStartMm: number | null = null;
    let runWidthMm = 0;

    for (const cabinet of wall.cabinets) {
      const zone = getCabinetZone(cabinet);

      let posX: number;
      switch (zone) {
        case 'FULL':
          posX = Math.max(currentXBottom, currentXTop);
          currentXBottom = posX + cabinet.width;
          currentXTop = posX + cabinet.width;
          break;
        case 'TOP':
          posX = currentXTop;
          currentXTop += cabinet.width;
          break;
        case 'BOTTOM':
        default:
          posX = currentXBottom;
          currentXBottom += cabinet.width;
          break;
      }

      // Szafki górne (TOP) nie wpływają na blat dolny — ignoruj
      if (zone === 'TOP') {
        continue;
      }

      if (requiresCountertop(cabinet.type)) {
        // Kontynuuj lub zacznij nowy przebieg
        if (runStartMm === null) {
          runStartMm = posX;
          runWidthMm = cabinet.width;
        } else {
          runWidthMm += cabinet.width;
        }
      } else {
        // Przerwa (FULL bez blatu lub wolnostojące AGD) — zamknij poprzedni przebieg
        if (runStartMm !== null) {
          result.push(this.buildCountertopSegment(pos, runStartMm, runWidthMm));
          runStartMm = null;
          runWidthMm = 0;
        }
      }
    }

    // Zamknij ostatni przebieg (jeśli ściana kończy się szafką dolną)
    if (runStartMm !== null) {
      result.push(this.buildCountertopSegment(pos, runStartMm, runWidthMm));
    }

    return result;
  }

  /**
   * Buduje pojedynczy segment blatu zaczynający się w startMm od lewej ściany
   * i obejmujący widthMm (plus COUNTERTOP_OVERHANG na każdą stronę).
   */
  private buildCountertopSegment(
    pos: WallPosition,
    startMm: number,
    widthMm: number
  ): CountertopOnFloorPlan {
    const scale = pos.scale;
    const countertopDepthMm = this.COUNTERTOP_STANDARD_DEPTH;
    const countertopWidthMm = widthMm + this.COUNTERTOP_OVERHANG;
    const countertopWidth = countertopWidthMm * scale;
    const countertopDepth = countertopDepthMm * scale;
    const overhang = this.COUNTERTOP_OVERHANG * scale / 2;

    if (pos.isHorizontal) {
      const x = pos.x + startMm * scale - overhang;
      const y = pos.y - countertopDepth;
      return {
        x, y,
        width: countertopWidth,
        depth: countertopDepth,
        lengthMm: countertopWidthMm,
        depthMm: countertopDepthMm,
        lengthLabelX: x + countertopWidth / 2,
        lengthLabelY: y + countertopDepth + 8,
        depthLabelX: x - 3,
        depthLabelY: y + countertopDepth / 2,
        isHorizontal: true
      };
    } else {
      if (pos.wall.type === 'LEFT') {
        const x = pos.x + this.WALL_THICKNESS - overhang;
        const y = pos.y + startMm * scale - overhang;
        return {
          x, y,
          width: countertopDepth,
          depth: countertopWidth,
          lengthMm: countertopWidthMm,
          depthMm: countertopDepthMm,
          lengthLabelX: x - 3,
          lengthLabelY: y + countertopWidth / 2,
          depthLabelX: x + countertopDepth / 2,
          depthLabelY: y - 3,
          isHorizontal: false
        };
      } else {
        // RIGHT
        const x = pos.x - countertopDepth + overhang;
        const y = pos.y + startMm * scale - overhang;
        return {
          x, y,
          width: countertopDepth,
          depth: countertopWidth,
          lengthMm: countertopWidthMm,
          depthMm: countertopDepthMm,
          lengthLabelX: x + countertopDepth + 3,
          lengthLabelY: y + countertopWidth / 2,
          depthLabelX: x + countertopDepth / 2,
          depthLabelY: y - 3,
          isHorizontal: false
        };
      }
    }
  }

  /**
   * Tworzy obiekt CabinetOnFloorPlan z odpowiednimi współrzędnymi
   */
  private createCabinetOnFloorPlan(
    cabinetId: string,
    name: string | undefined,
    pos: WallPosition,
    wallType: WallType,
    posX: number,
    cabinetWidth: number,
    cabinetDepth: number,
    zone: CabinetZone,
    isCorner: boolean,
    isFreestanding: boolean
  ): CabinetOnFloorPlan {
    if (pos.isHorizontal) {
      // Ściana pozioma (MAIN, CORNER_LEFT, CORNER_RIGHT, ISLAND)
      // Szafki idą od lewej do prawej, głębokość do góry
      return {
        cabinetId,
        name,
        x: pos.x + posX,
        y: pos.y - cabinetDepth,
        width: cabinetWidth,
        depth: cabinetDepth,
        zone,
        isCorner,
        isFreestanding,
        wallType
      };
    } else {
      // Ściana pionowa (LEFT, RIGHT)
      // Szafki idą z góry na dół, głębokość w bok
      if (wallType === 'LEFT') {
        return {
          cabinetId,
          name,
          x: pos.x + this.WALL_THICKNESS,
          y: pos.y + posX,
          width: cabinetDepth,
          depth: cabinetWidth,
          zone,
          isCorner,
          isFreestanding,
          wallType
        };
      } else {
        // RIGHT
        return {
          cabinetId,
          name,
          x: pos.x - cabinetDepth,
          y: pos.y + posX,
          width: cabinetDepth,
          depth: cabinetWidth,
          zone,
          isCorner,
          isFreestanding,
          wallType
        };
      }
    }
  }

  /**
   * Sprawdza czy szafka jest aktualnie edytowana
   */
  isEditing(cabinetId: string): boolean {
    return this.editingCabinetId === cabinetId;
  }

  /**
   * Zwraca kolor szafki na podstawie strefy, typu i czy jest edytowana
   */
  getCabinetFill(cab: CabinetOnFloorPlan): string {
    if (this.isEditing(cab.cabinetId)) {
      return '#fbbf24'; // żółty dla edytowanej
    }
    // Wolnostojące AGD — srebrny (spójny z widokiem frontalnym)
    if (cab.isFreestanding) {
      return '#e0e0e0';
    }
    // Narożnik ma osobny kolor (pomarańczowy - zgodny z widokiem frontalnym)
    if (cab.isCorner) {
      return '#ffb74d';
    }
    switch (cab.zone) {
      case 'TOP': return '#90caf9';
      case 'FULL': return '#ce93d8';
      case 'BOTTOM':
      default: return '#a5d6a7';
    }
  }

  /**
   * Zwraca kolor obramowania szafki na podstawie strefy, typu i czy jest edytowana
   */
  getCabinetStroke(cab: CabinetOnFloorPlan): string {
    if (this.isEditing(cab.cabinetId)) {
      return '#f59e0b'; // ciemniejszy żółty dla edytowanej
    }
    // Wolnostojące AGD — szary kontur (jak w widoku frontalnym)
    if (cab.isFreestanding) {
      return '#9e9e9e';
    }
    // Narożnik ma osobny kolor obramowania
    if (cab.isCorner) {
      return '#ef6c00';
    }
    switch (cab.zone) {
      case 'TOP': return '#1565c0';
      case 'FULL': return '#7b1fa2';
      case 'BOTTOM':
      default: return '#388e3c';
    }
  }
}
