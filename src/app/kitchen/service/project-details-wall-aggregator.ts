import { CornerCountertopResponse } from '../model/kitchen-project.model';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { resolveVeneerEdges } from './veneer-edge-resolver';
import { Job } from '../cabinet-form/model/kitchen-cabinet-form.model';
import {
  AggregatedComponent,
  AggregatedJob,
  AggregationMaps,
  AggregationState,
  CabinetLike,
  ComponentLike,
  JobLike,
  WallLike
} from './project-details-aggregation.models';
import { ProjectDetailsAggregationAccumulator } from './project-details-aggregation-accumulator';

const BOARD_NAME_PL: Record<string, string> = {
  SIDE_NAME: 'Bok',
  WREATH_NAME: 'Wieniec',
  TOP_WREATH_NAME: 'Wieniec górny',
  FRONT_NAME: 'Front',
  FRONT_DRAWER_NAME: 'Front szuflady',
  BASE_DRAWER_NAME: 'Dno szuflady',
  BACK_DRAWER_NAME: 'Tył szuflady',
  FRONT_SUPPORTER_DRAWER_NAME: 'Podpora frontu szuflady',
  SIDE_DRAWER_NAME: 'Bok szuflady',
  SHELF_NAME: 'Półka',
  HDF_NAME: 'HDF tył',
  SEGMENT_DIVIDER_NAME: 'Przegroda segmentu',
  SINK_APRON: 'Blenda zlewu',
  HOOD_SCREEN: 'Blenda okapu',
  CORNER_PANEL: 'Ścianka narożna',
  BLIND_PANEL: 'Front ślepy',
  BIFOLD_INNER_FRONT: 'Skrzydło wewnętrzne (harmonijka)',
  OVEN_APRON: 'Blenda piekarnika',
  OVEN_TRAY_FRONT: 'Front szuflady szybowej'
};

export class ProjectDetailsWallAggregator {
  constructor(private readonly accumulator: ProjectDetailsAggregationAccumulator) {}

  aggregateWall(wall: WallLike, frontendWall: WallWithCabinets | undefined, state: AggregationState): void {
    this.aggregateCabinets(wall.cabinets, state);
    this.aggregateCountertop(wall, state.maps);
    this.aggregatePlinth(wall, frontendWall, state.maps);
    this.aggregateFillerPanels(wall, state.maps);
    this.aggregateEnclosures(wall, state.maps);
    this.aggregateUpperFiller(wall, state.maps);
  }

  aggregateCornerCountertops(cornerCountertops: CornerCountertopResponse[] | null | undefined, maps: AggregationMaps): void {
    // TODO(CODEX): W tej agregacji do BOM wpada materialCost i komponenty naroznika, ale jointCost nie jest nigdzie zapisany jako osobna praca ani skladnik kosztu. Jesli backend zwroci totalCost > materialCost, frontendowe BOM/excel przestana zgadzac sie z kosztami projektu zwracanymi przez API.
    if (!cornerCountertops) return;

    for (const corner of cornerCountertops) {
      if (corner.cornerWidthMm <= 0 || corner.cornerDepthMm <= 0 || corner.thicknessMm <= 0) {
        continue;
      }

      const label = `Blat narożny [Śc.${corner.wallAIndex + 1}-${corner.wallBIndex + 1}]`;
      this.accumulator.addBoard(maps.boards, {
        material: label,
        thickness: corner.thicknessMm,
        width: corner.cornerWidthMm,
        height: corner.cornerDepthMm,
        quantity: 1,
        unitCost: corner.materialCost,
        totalCost: corner.materialCost
      });

      this.aggregateNullableComponents(corner.components, maps.components);
    }
  }

  private aggregateCabinets(cabinets: CabinetLike[], state: AggregationState): void {
    for (const cabinet of cabinets) {
      const cabinetRef = `Sz.${++state.globalCabinetIdx}`;
      const cabinetJobs = cabinet.jobs ?? [];
      const hingeMilling = cabinetJobs.find((job: Job) => job.type === 'HINGE_MILLING');
      const grooveForHdf = cabinetJobs.find((job: Job) => job.type === 'GROOVE_FOR_HDF');

      this.aggregateCabinetBoards(cabinet, cabinetRef, hingeMilling, grooveForHdf, state);
      this.aggregateStandardComponents(cabinet.components, state.maps);
      this.aggregateJobs(cabinet.jobs, state.maps);
    }
  }

  private aggregateCabinetBoards(
    cabinet: CabinetLike,
    cabinetRef: string,
    hingeMilling: Job | undefined,
    grooveForHdf: Job | undefined,
    state: AggregationState
  ): void {
    if (!cabinet.boards) return;

    for (const board of cabinet.boards) {
      const remarks = this.buildBoardRemarks(board.boardName, board.sideY, hingeMilling, grooveForHdf);
      const veneerX = board.veneerX ?? 0;
      const veneerY = board.veneerY ?? 0;
      const veneerEdgeInfo = resolveVeneerEdges(board.boardName, veneerX, veneerY);

      this.accumulator.addBoard(state.maps.boards, {
        material: board.boardName,
        thickness: board.boardThickness,
        width: board.sideX,
        height: board.sideY,
        quantity: board.quantity,
        unitCost: board.priceEntry?.price ?? 0,
        totalCost: board.totalPrice,
        color: board.color,
        veneerX,
        veneerY,
        veneerColor: board.veneerColor ?? '',
        boardLabel: this.translateBoardName(board.boardName, state.bomTranslations),
        cabinetRefs: [cabinetRef],
        remarks: remarks || undefined,
        veneerEdgeLabel: veneerEdgeInfo.label || undefined
      });
    }
  }

  private buildBoardRemarks(
    boardName: string,
    boardSideY: number,
    hingeMilling: Job | undefined,
    grooveForHdf: Job | undefined
  ): string {
    if (boardName === 'FRONT_NAME' && hingeMilling) {
      const hingeCount = Math.round(hingeMilling.quantity);
      return `${hingeCount} ${hingeCount === 1 ? 'puszka' : hingeCount < 5 ? 'puszki' : 'puszek'} na długość ${boardSideY}mm`;
    }

    if (boardName === 'SIDE_NAME' && grooveForHdf) {
      return `Frezowanie nutu pod HDF na boku ${boardSideY}mm`;
    }

    return '';
  }

  private translateBoardName(boardName: string, bomTranslations?: Record<string, string>): string {
    return bomTranslations?.['BOARD_NAME.' + boardName] ?? BOARD_NAME_PL[boardName] ?? boardName;
  }

  private aggregateStandardComponents(components: ComponentLike[] | undefined, maps: AggregationMaps): void {
    if (!components) return;

    for (const comp of components) {
      if (comp.category === 'SHEET_WASTE') continue;
      this.accumulator.addComponent(maps.components, {
        name: comp.model,
        type: comp.category,
        quantity: comp.quantity,
        unitCost: comp.priceEntry?.price ?? 0,
        totalCost: comp.totalPrice ?? 0
      });
    }
  }

  private aggregateJobs(jobs: JobLike[] | undefined, maps: AggregationMaps): void {
    if (!jobs) return;

    for (const job of jobs) {
      this.accumulator.addJob(maps.jobs, {
        name: job.type,
        type: job.category,
        quantity: job.quantity,
        unitCost: job.priceEntry?.price ?? 0,
        totalCost: job.totalPrice
      });
    }
  }

  private aggregateCountertop(wall: WallLike, maps: AggregationMaps): void {
    if (!wall.countertop?.enabled || !wall.countertop.segments) return;

    for (const segment of wall.countertop.segments) {
      this.accumulator.addBoard(maps.boards, {
        material: `BLAT_${wall.countertop.materialType}`,
        thickness: segment.thicknessMm,
        width: segment.lengthMm,
        height: segment.depthMm,
        quantity: 1,
        unitCost: segment.materialCost,
        totalCost: segment.materialCost
      });

      this.addOptionalJob(maps.jobs, 'COUNTERTOP_CUTTING', 'COUNTERTOP', segment.cuttingCost);
      this.addOptionalJob(maps.jobs, 'COUNTERTOP_EDGING', 'COUNTERTOP', segment.edgingCost);
    }

    this.aggregateNullableComponents(wall.countertop.components, maps.components);
  }

  private aggregatePlinth(wall: WallLike, frontendWall: WallWithCabinets | undefined, maps: AggregationMaps): void {
    if (wall.plinth?.enabled && wall.plinth.segments) {
      const plinthMat = wall.plinth.materialType ?? '';
      const plinthThicknessMm = frontendWall?.plinthConfig?.thicknessMm
        ?? ((plinthMat === 'MDF_LAMINATED' || plinthMat === 'CHIPBOARD') ? 18 : 16);

      for (const segment of wall.plinth.segments) {
        this.accumulator.addBoard(maps.boards, {
          material: `COKOL_${plinthMat}`,
          thickness: plinthThicknessMm,
          width: segment.lengthMm,
          height: segment.heightMm,
          quantity: 1,
          unitCost: segment.materialCost,
          totalCost: segment.materialCost
        });

        this.addOptionalJob(maps.jobs, 'PLINTH_CUTTING', 'PLINTH', segment.cuttingCost);
      }
    }

    this.aggregateNullableComponents(wall.plinth?.components, maps.components);
  }

  private aggregateFillerPanels(wall: WallLike, maps: AggregationMaps): void {
    if (!wall.fillerPanels) return;

    for (const filler of wall.fillerPanels) {
      this.accumulator.addBoard(maps.boards, {
        material: `BLENDA_${filler.fillerType}`,
        thickness: filler.thicknessMm,
        width: filler.widthMm,
        height: filler.heightMm,
        quantity: 1,
        unitCost: filler.materialCost,
        totalCost: filler.materialCost
      });

      this.addOptionalJob(maps.jobs, 'FILLER_CUTTING', 'FILLER', filler.cuttingCost);
      this.addOptionalJob(maps.jobs, 'FILLER_VENEER', 'FILLER', filler.veneerCost);
      this.aggregateNullableComponents(filler.components, maps.components);
    }
  }

  private aggregateEnclosures(wall: WallLike, maps: AggregationMaps): void {
    if (!wall.enclosures) return;

    for (const enclosure of wall.enclosures) {
      for (const board of enclosure.boards ?? []) {
        this.accumulator.addBoard(maps.boards, {
          material: `${board.label} (${enclosure.leftSide ? 'lewa' : 'prawa'})`,
          thickness: board.thicknessMm,
          width: board.widthMm,
          height: board.heightMm,
          quantity: 1,
          unitCost: board.materialCost,
          totalCost: board.materialCost
        });
      }

      this.addOptionalJob(maps.jobs, 'ENCLOSURE_CUTTING', 'ENCLOSURE', enclosure.cuttingCost);
    }
  }

  private aggregateUpperFiller(wall: WallLike, maps: AggregationMaps): void {
    if (!wall.upperFiller?.enabled || !wall.upperFiller.segments) return;

    for (const segment of wall.upperFiller.segments) {
      const label = segment.requiresJoint
        ? `Blenda górna (seg. ${segment.segmentIndex + 1})`
        : 'Blenda górna';

      this.accumulator.addBoard(maps.boards, {
        material: label,
        thickness: 18,
        width: segment.lengthMm,
        height: segment.heightMm,
        quantity: 1,
        unitCost: segment.materialCost,
        totalCost: segment.materialCost
      });

      this.addOptionalJob(
        maps.jobs,
        `UPPER_FILLER_CUTTING${segment.requiresJoint ? `_${segment.segmentIndex + 1}` : ''}`,
        'UPPER_FILLER',
        segment.cuttingCost
      );
    }
  }

  private aggregateNullableComponents(components: ComponentLike[] | undefined, target: Map<string, AggregatedComponent>): void {
    if (!components) return;

    for (const comp of components) {
      this.accumulator.addComponent(target, {
        name: comp.model,
        type: comp.category,
        quantity: comp.quantity,
        unitCost: comp.priceEntry?.price ?? 0,
        totalCost: comp.totalPrice ?? 0
      });
    }
  }

  private addOptionalJob(map: Map<string, AggregatedJob>, name: string, type: string, totalCost: number | null | undefined): void {
    if (!totalCost || totalCost <= 0) return;

    this.accumulator.addJob(map, {
      name,
      type,
      quantity: 1,
      unitCost: totalCost,
      totalCost
    });
  }
}
