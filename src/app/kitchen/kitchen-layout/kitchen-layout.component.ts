import { Component, inject, computed, Input } from '@angular/core';
import { CommonModule } from "@angular/common";
import { KitchenStateService } from '../service/kitchen-state.service';
import { CabinetPosition, CabinetZone, getCabinetZone, ZONE_THRESHOLDS } from '../model/kitchen-state.model';

interface VisualCabinetPosition {
  cabinetId: string;
  name?: string;
  // Pozycje w mm (oryginalne)
  x: number;
  y: number;
  width: number;
  height: number;
  // Pozycje w px (do wyświetlania)
  displayX: number;
  displayY: number;
  displayWidth: number;
  displayHeight: number;
  // Typ szafki (dolna/górna/słupek)
  zone: CabinetZone;
  isOverflow: boolean;
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
  private readonly REAL_BOTTOM_ZONE_MM = 860;   // dolne szafki (720-860mm)
  private readonly REAL_TOP_ZONE_MM = 720;      // górne szafki (320-720mm)
  private readonly REAL_COUNTER_MM = 38;        // blat wiórowy
  private readonly REAL_GAP_MM = 500;           // przerwa między blatem a górnymi (450-550mm)

  // Proporcjonalne wysokości stref w px
  // Suma: 860 + 38 + 500 + 720 = 2118mm -> skalujemy do WALL_DISPLAY_HEIGHT
  private readonly SCALE_VERTICAL = this.WALL_DISPLAY_HEIGHT / 2118;
  private readonly BOTTOM_ZONE_HEIGHT = Math.round(this.REAL_BOTTOM_ZONE_MM * this.SCALE_VERTICAL);
  private readonly COUNTER_HEIGHT = Math.round(this.REAL_COUNTER_MM * this.SCALE_VERTICAL);
  private readonly GAP_HEIGHT = Math.round(this.REAL_GAP_MM * this.SCALE_VERTICAL);
  private readonly TOP_ZONE_HEIGHT = Math.round(this.REAL_TOP_ZONE_MM * this.SCALE_VERTICAL);

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
   * Słupki (FULL) rozciągają się przez obie strefy.
   */
  readonly visualPositions = computed((): VisualCabinetPosition[] => {
    const cabinets = this.cabinetPositions();
    const allCabinets = this.stateService.cabinets();
    const scale = this.scaleFactor();
    const wallWidth = this.wallDisplayWidth();

    return cabinets.map((cab, idx) => {
      // Znajdź oryginalną szafkę aby określić strefę
      const originalCabinet = allCabinets.find(c => c.id === cab.cabinetId);
      const zone: CabinetZone = originalCabinet ? getCabinetZone(originalCabinet) : 'BOTTOM';

      const displayX = cab.x * scale;
      const displayWidth = cab.width * scale;

      let displayHeight: number;
      let displayY: number;

      switch (zone) {
        case 'FULL':
          // Słupek - używamy faktycznej wysokości szafki, przeskalowanej
          // Szafka stoi na podłodze (dolna krawędź = dół wizualizacji)
          displayHeight = Math.round(cab.height * this.SCALE_VERTICAL);
          // Pozycja Y = od dołu wizualizacji w górę
          displayY = this.WALL_DISPLAY_HEIGHT - displayHeight;
          break;

        case 'TOP':
          // Szafka górna
          displayHeight = Math.round(cab.height * this.SCALE_VERTICAL);
          displayY = this.TOP_ZONE_HEIGHT - displayHeight;
          break;

        case 'BOTTOM':
        default:
          // Szafka dolna
          displayHeight = Math.round(cab.height * this.SCALE_VERTICAL);
          const bottomZoneTop = this.TOP_ZONE_HEIGHT + this.GAP_HEIGHT + this.COUNTER_HEIGHT;
          displayY = bottomZoneTop + (this.BOTTOM_ZONE_HEIGHT - displayHeight);
          break;
      }

      const isOverflow = displayX + displayWidth > wallWidth;

      return {
        cabinetId: cab.cabinetId,
        name: cab.name,
        x: cab.x,
        y: cab.y,
        width: cab.width,
        height: cab.height,
        displayX,
        displayY,
        displayWidth,
        displayHeight,
        zone,
        isOverflow
      };
    });
  });

  // Czy są szafki górne (TOP lub FULL)
  readonly hasHangingCabinets = computed(() => {
    return this.visualPositions().some(p => p.zone === 'TOP' || p.zone === 'FULL');
  });

  // Czy są szafki dolne (BOTTOM lub FULL)
  readonly hasBottomCabinets = computed(() => {
    return this.visualPositions().some(p => p.zone === 'BOTTOM' || p.zone === 'FULL');
  });

  // Pozostałe miejsce - dolne szafki (używamy danych ze state service)
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

  // Pozycje stref (computed - bo zależą od wartości obliczonych)
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
}
