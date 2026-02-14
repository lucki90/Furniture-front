import { Component, inject, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenStateService } from '../service/kitchen-state.service';
import { WallType } from '../model/kitchen-project.model';
import { WallWithCabinets, CabinetZone, getCabinetZone } from '../model/kitchen-state.model';

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

  readonly walls = this.stateService.walls;
  readonly selectedWallId = this.stateService.selectedWallId;

  addWallRequested = output<void>();
  wallRemoved = output<string>();

  // SVG dimensions
  private readonly SVG_WIDTH = 320;
  private readonly SVG_HEIGHT = 240;
  private readonly WALL_THICKNESS = 10;
  private readonly PADDING = 30;
  private readonly CABINET_DEPTH_BOTTOM = 600; // głębokość szafek dolnych (mm)
  private readonly CABINET_DEPTH_HANGING = 350; // głębokość szafek górnych (mm)
  private readonly CABINET_DEPTH_FULL = 600; // głębokość słupków (mm)

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

      let cabinetDepth: number;
      let posX: number;

      switch (zone) {
        case 'FULL':
          cabinetDepth = this.CABINET_DEPTH_FULL * scale;
          // Słupki zajmują max z obu liczników, potem przesuwają oba
          posX = Math.max(currentXBottom, currentXTop);
          currentXBottom = posX + cabinet.width;
          currentXTop = posX + cabinet.width;
          break;
        case 'TOP':
          cabinetDepth = this.CABINET_DEPTH_HANGING * scale;
          posX = currentXTop;
          currentXTop += cabinet.width;
          break;
        case 'BOTTOM':
        default:
          cabinetDepth = this.CABINET_DEPTH_BOTTOM * scale;
          posX = currentXBottom;
          currentXBottom += cabinet.width;
          break;
      }

      const cabinetOnPlan = this.createCabinetOnFloorPlan(
        cabinet.id,
        cabinet.name,
        pos,
        wall.type,
        posX * scale,
        cabinetWidth,
        cabinetDepth,
        zone
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
    zone: CabinetZone
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
        zone
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
          zone
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
          zone
        };
      }
    }
  }

  /**
   * Zwraca kolor szafki na podstawie strefy
   */
  getCabinetFill(zone: CabinetZone): string {
    switch (zone) {
      case 'TOP': return '#90caf9';
      case 'FULL': return '#ce93d8';
      case 'BOTTOM':
      default: return '#a5d6a7';
    }
  }

  /**
   * Zwraca kolor obramowania szafki na podstawie strefy
   */
  getCabinetStroke(zone: CabinetZone): string {
    switch (zone) {
      case 'TOP': return '#1565c0';
      case 'FULL': return '#7b1fa2';
      case 'BOTTOM':
      default: return '#388e3c';
    }
  }
}
