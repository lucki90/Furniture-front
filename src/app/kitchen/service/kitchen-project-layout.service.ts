import { Injectable, computed, inject } from '@angular/core';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import { ProjectSettingsService } from './project-settings.service';
import { KitchenGeometryService, KitchenGeometrySettings } from './kitchen-geometry.service';
import {
  CornerFootprint,
  CornerIssue,
  CornerLevel,
  WallCorner,
  WallCornerConstraints,
  WallEnd
} from './corner-layout/corner-layout.model';
import { createCornerGeometrySettings } from './corner-layout/corner-reach';
import { buildProjectCornerLayout, ProjectCornerLayout } from './corner-layout/project-corner-layout.builder';
import { buildCornerFootprints } from './corner-layout/corner-footprint.builder';

/**
 * Reaktywny układ projektu z narożnikami: strefy narożne ścian dostawionych, przypięcia szafek narożnych i problemy
 * narożników. Jedno źródło ograniczeń narożnych dla elewacji, metryk, rzutu i paneli; request do backendu liczy je
 * tą samą funkcją (`resolveWallCornerConstraints`) z tych samych ustawień.
 */
@Injectable({ providedIn: 'root' })
export class KitchenProjectLayoutService {
  private readonly workspaceStore = inject(KitchenWorkspaceStore);
  private readonly settingsService = inject(ProjectSettingsService);
  private readonly geometryService = inject(KitchenGeometryService);

  readonly cornerSettings = computed(() => createCornerGeometrySettings(
    this.settingsService.fillerWidthMm(),
    this.settingsService.materialDefaults().frontBoardThickness,
    this.settingsService.countertopLyzwaRecessMm()
  ));

  readonly layout = computed((): ProjectCornerLayout => buildProjectCornerLayout(
    this.workspaceStore.walls(),
    wall => this.geometrySettingsFor(wall),
    this.cornerSettings(),
    this.geometryService
  ));

  readonly constraintsByWallId = computed(() => this.layout().constraintsByWallId);
  readonly issues = computed((): readonly CornerIssue[] => this.layout().issues);

  constraintsFor(wallId: string | null | undefined): WallCornerConstraints | undefined {
    return wallId ? this.constraintsByWallId().get(wallId) : undefined;
  }

  /**
   * Zasięg najbliższej szafki z sąsiedniej ściany, która faktycznie może zasłaniać ślepą część narożnika.
   * Korzysta z tych samych footprintów (głębokość korpusu + wystający front) co walidacja kolizji narożnych.
   * `null` oznacza brak połączonej ściany albo brak szafki w przekroju narożnika — formularz używa wtedy
   * książkowego fallbacku 530 mm.
   */
  blindCornerNeighborReachMm(
    wallId: string | null | undefined,
    sectionReachMm: number,
    options: { cabinetId?: string | null; level?: CornerLevel } = {}
  ): number | null {
    if (!wallId || !Number.isFinite(sectionReachMm) || sectionReachMm <= 0) {
      return null;
    }

    const walls = this.workspaceStore.walls();
    const layout = this.layout();
    const wall = walls.find(candidate => candidate.id === wallId);
    if (!wall) {
      return null;
    }

    const corner = this.targetCorner(layout, wallId, options.cabinetId);
    if (!corner) {
      return null;
    }

    const partnerWallId = corner.a.wallId === wallId ? corner.b.wallId : corner.a.wallId;
    const level = options.level ?? 'BASE';
    const maxNearEdgeMm = sectionReachMm + this.cornerSettings().cornerClearanceMm;
    const covering = buildCornerFootprints(
      corner,
      walls,
      layout.positionsByWallId,
      level,
      this.cornerSettings()
    )
      .filter(footprint => footprint.wallId === partnerWallId && footprint.nearEdgeMm <= maxNearEdgeMm)
      .reduce<CornerFootprint | null>(
        (closest, footprint) => !closest || footprint.nearEdgeMm < closest.nearEdgeMm ? footprint : closest,
        null
      );

    return covering?.reachMm ?? null;
  }

  geometrySettingsFor(wall: WallWithCabinets): KitchenGeometrySettings {
    return {
      wallType: wall.type,
      wallHeightMm: wall.heightMm,
      plinthHeightMm: this.settingsService.plinthHeightMm(),
      countertopThicknessMm: this.settingsService.countertopThicknessMm(),
      upperFillerHeightMm: this.settingsService.upperFillerHeightMm(),
      fillerWidthMm: this.settingsService.fillerWidthMm()
    };
  }

  private targetCorner(
    layout: ProjectCornerLayout,
    wallId: string,
    cabinetId?: string | null
  ): WallCorner | undefined {
    const connected = layout.topology.corners.filter(corner => this.endpointEnd(corner, wallId) !== null);
    if (connected.length <= 1) {
      return connected[0];
    }

    const targetEnd = this.targetWallEnd(layout, wallId, cabinetId);
    return connected.find(corner => this.endpointEnd(corner, wallId) === targetEnd) ?? connected[0];
  }

  private targetWallEnd(
    layout: ProjectCornerLayout,
    wallId: string,
    cabinetId?: string | null
  ): WallEnd {
    if (!cabinetId) {
      // Nowa szafka jest dopisywana na końcu listy i układa się przy końcu END, jeśli ściana ma dwa narożniki.
      return 'END';
    }

    const sideFromTopology = layout.junctionSides.get(cabinetId);
    if (sideFromTopology) {
      return sideFromTopology === 'LEFT' ? 'START' : 'END';
    }

    const wall = this.workspaceStore.walls().find(candidate => candidate.id === wallId);
    const cabinet = wall?.cabinets.find(candidate => candidate.id === cabinetId);
    const position = layout.positionsByWallId.get(wallId)?.find(candidate => candidate.cabinetId === cabinetId);
    if (!wall || !cabinet || !position) {
      return 'END';
    }
    return position.x + cabinet.width / 2 <= wall.widthMm / 2 ? 'START' : 'END';
  }

  private endpointEnd(corner: WallCorner, wallId: string): WallEnd | null {
    if (corner.a.wallId === wallId) return corner.a.end;
    if (corner.b.wallId === wallId) return corner.b.end;
    return null;
  }
}
