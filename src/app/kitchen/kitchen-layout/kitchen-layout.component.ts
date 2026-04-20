import { ChangeDetectionStrategy, Component, inject, computed, Input, signal } from '@angular/core';
import { CommonModule } from "@angular/common";
import { KitchenStateService } from '../service/kitchen-state.service';
import { getCabinetZone, requiresCountertop } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import {
  PLATE_THICKNESS_MM,
  COUNTERTOP_DEPTH_DEFAULT_MM,
  OVEN_HEIGHT_COMPACT_MM,
  OVEN_HEIGHT_STANDARD_MM
} from './kitchen-layout.constants';
import { buildCooktopGapWarning, buildKitchenLayoutMetrics } from './kitchen-layout-metrics';
import { buildVisualCabinetPositions, VisualCabinetPosition } from './kitchen-layout-view-model.builder';
import { KitchenLayoutCabinetsLayerComponent } from './kitchen-layout-cabinets-layer.component';
import { KitchenLayoutSurfacesLayerComponent } from './kitchen-layout-surfaces-layer.component';
import { KitchenLayoutInfoPanelComponent } from './kitchen-layout-info-panel.component';

@Component({
  selector: 'app-kitchen-layout',
  templateUrl: './kitchen-layout.component.html',
  styleUrls: ['./kitchen-layout.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    KitchenLayoutCabinetsLayerComponent,
    KitchenLayoutSurfacesLayerComponent,
    KitchenLayoutInfoPanelComponent
  ]
})
export class KitchenLayoutComponent {

  // TODO(CODEX): Komponent layoutu jest bardzo duży i łączy renderowanie, logikę pozycjonowania, interakcje użytkownika oraz szczegóły wielu strategii układu. To kandydat do dalszego podziału na czystsze warstwy: czysta geometria/obliczenia, adapter danych do widoku i lekki komponent prezentacyjny.
  private stateService = inject(KitchenStateService);

  /** ID aktualnie edytowanej szafki - do podświetlenia */
  @Input() editingCabinetId: string | null = null;

  // ===== Sygnały przełączników widoczności (toolbar SVG) =====
  readonly showCabinetLabels = signal(true);
  // showCountertop i showUpperCabinets współdzielone ze state service (wpływają też na floor plan)
  readonly showCountertop = this.stateService.showCountertop;
  readonly showUpperCabinets = this.stateService.showUpperCabinets;

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

  // ===== Dynamiczne wymiary stref (obliczane z sygnałów projektu) =====

  /**
   * Ostrzeżenie o minimalnej odległości między płytą grzewczą a szafką/okapem powyżej.
   * Normy: gaz ≥750mm, indukcja ≥600mm (od powierzchni płyty do dołu szafki).
   * Przerwa robocza (actualGapMm) = odległość od blatu do dołu szafek wiszących.
   */
  readonly cooktopGapWarning = computed((): { message: string; minMm: number; actualMm: number } | null => {
    return buildCooktopGapWarning(this.selectedWall(), this.hasHangingCabinets(), this.layoutMetrics().actualGapMm);
  });

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

  readonly scaleFactor = computed(() => {
    const wallLength = this.wall().length;
    if (wallLength <= 0) return 1;
    return this.BASE_WALL_DISPLAY_WIDTH / wallLength;
  });

  readonly wallDisplayWidth = computed(() => {
    return this.wall().length * this.scaleFactor();
  });

  readonly hasHangingCabinets = computed(() => {
    return this.stateService.cabinets().some(cabinet => {
      const zone = getCabinetZone(cabinet);
      return zone === 'TOP' || zone === 'FULL';
    });
  });

  readonly hasBottomCabinets = computed(() => {
    return this.stateService.cabinets().some(cabinet => {
      const zone = getCabinetZone(cabinet);
      return zone === 'BOTTOM' || zone === 'FULL';
    });
  });

  readonly layoutMetrics = computed(() => {
    return buildKitchenLayoutMetrics({
      cabinets: this.stateService.cabinets(),
      wallHeightMm: this.selectedWall()?.heightMm ?? 2400,
      plinthHeightMm: this.stateService.plinthHeightMm(),
      countertopThicknessMm: this.stateService.countertopThicknessMm(),
      upperFillerHeightMm: this.stateService.upperFillerHeightMm(),
      wallDisplayWidth: this.wallDisplayWidth(),
      wallDisplayHeight: this.WALL_DISPLAY_HEIGHT,
      hasBottomCabinets: this.hasBottomCabinets(),
      hasHangingCabinets: this.hasHangingCabinets()
    });
  });

  readonly isWorkspaceGapViolation = computed(() => this.layoutMetrics().isWorkspaceGapViolation);
  readonly fillerHeightPx = computed(() => this.layoutMetrics().fillerHeightPx);
  readonly gapMm = computed(() => this.layoutMetrics().gapMm);

  readonly wallLabel = computed(() => {
    const wall = this.selectedWall();
    return wall ? this.stateService.getWallLabel(wall.type) : 'Ściana';
  });

  /**
   * Pozycje szafek z uwzględnieniem stref (BOTTOM, TOP, FULL).
   */
  readonly visualPositions = computed((): VisualCabinetPosition[] => {
    return buildVisualCabinetPositions({
      cabinetPositions: this.cabinetPositions(),
      cabinets: this.stateService.cabinets(),
      scale: this.scaleFactor(),
      wallWidth: this.wallDisplayWidth(),
      wallDisplayHeight: this.WALL_DISPLAY_HEIGHT,
      scaleVert: this.layoutMetrics().scaleVert,
      feetHeightMm: this.FEET_HEIGHT_MM,
      fillerWidthMm: this.stateService.fillerWidthMm(),
      standardBottomHeight: this.STANDARD_BOTTOM_HEIGHT,
      standardTopHeight: this.STANDARD_TOP_HEIGHT,
      standardBottomDepth: this.STANDARD_BOTTOM_DEPTH,
      standardTopDepth: this.STANDARD_TOP_DEPTH,
      frontGap: this.FRONT_GAP
    });
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
    const depthMm = wall?.countertopConfig?.manualDepthMm ?? COUNTERTOP_DEPTH_DEFAULT_MM;

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

    const depthMm = wall.countertopConfig?.manualDepthMm ?? COUNTERTOP_DEPTH_DEFAULT_MM;

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
      !p.isFreestandingAppliance
    ).sort((a, b) => a.displayX - b.displayX);

    if (plinthPositions.length === 0) return [];

    const feetHeight = plinthPositions[0]?.feetHeight ?? 0;
    if (feetHeight <= 0) return [];

    const sv = this.layoutMetrics().scaleVert;
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
  get topZoneHeight(): number { return this.layoutMetrics().topZoneHeight; }
  get gapZoneY(): number { return this.layoutMetrics().gapZoneY; }
  get gapZoneHeight(): number { return this.layoutMetrics().gapZoneHeight; }
  get counterZoneY(): number { return this.layoutMetrics().counterZoneY; }
  get counterZoneHeight(): number { return this.layoutMetrics().counterZoneHeight; }
  get bottomZoneY(): number { return this.layoutMetrics().bottomZoneY; }
  get bottomZoneHeight(): number { return this.layoutMetrics().bottomZoneHeight; }
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
    return this.layoutMetrics().gapDimensionLine;
  });

  /** Używane dla elementów SVG bez unikalnego ID (fronty, uchwyty, nóżki, markery spoin) */
  protected trackByIndex = (index: number) => index;
}
