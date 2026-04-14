import { Injectable } from '@angular/core';
import { MultiWallCalculateResponse, WallCalculationSummary } from '../model/kitchen-project.model';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { resolveVeneerEdges } from './veneer-edge-resolver';
import { Job } from '../cabinet-form/model/kitchen-cabinet-form.model';

// Polskie fallback-i nazw płyt używane gdy tłumaczenia z backendu nie są jeszcze załadowane.
// Backend zwraca klucze BOARD_NAME.* (np. "BOARD_NAME.SIDE_NAME").
// Brakujące klucze zostały dodane do DB w migracji 25-board-name-translations.sql (Faza 9.3).
const BOARD_NAME_PL: Record<string, string> = {
  'SIDE_NAME': 'Bok',
  'WREATH_NAME': 'Wieniec',
  'TOP_WREATH_NAME': 'Wieniec górny',
  'FRONT_NAME': 'Front',
  'FRONT_DRAWER_NAME': 'Front szuflady',
  'BASE_DRAWER_NAME': 'Dno szuflady',
  'BACK_DRAWER_NAME': 'Tył szuflady',
  'FRONT_SUPPORTER_DRAWER_NAME': 'Podpora frontu szuflady',
  'SIDE_DRAWER_NAME': 'Bok szuflady',
  'SHELF_NAME': 'Półka',
  'HDF_NAME': 'HDF tył',
  'SEGMENT_DIVIDER_NAME': 'Przegroda segmentu',
  'SINK_APRON': 'Blenda zlewu',
  'HOOD_SCREEN': 'Blenda okapu',
  'CORNER_PANEL': 'Ścianka narożna',
  'BLIND_PANEL': 'Front ślepy',
  'BIFOLD_INNER_FRONT': 'Skrzydło wewnętrzne (harmonijka)',
  'OVEN_APRON': 'Blenda piekarnika',
  'OVEN_TRAY_FRONT': 'Front szuflady szybowej'
};

export interface AggregatedBoard {
  material: string;
  thickness: number;
  width: number;
  height: number;
  quantity: number;
  unitCost: number;
  totalCost: number;
  /** Kolor płyty — z boardDto.color (np. "RAL 9016", "Dąb naturalny") */
  color?: string;
  /** Okleina na krawędziach szerokości (0/1/2 krawędzie) — z boardDto.veneerX */
  veneerX?: number;
  /** Okleina na krawędziach długości (0/1/2 krawędzie) — z boardDto.veneerY */
  veneerY?: number;
  /** Kolor okleiny — z boardDto.veneerColor */
  veneerColor?: string;
  /** Polska nazwa płyty (tłumaczenie BoardNameEnum) — np. "Bok", "Półka" */
  boardLabel?: string;
  /** Numery szafek, w których ta płyta wystąpiła — np. ["Sz.1", "Sz.3"] */
  cabinetRefs?: string[];
  /**
   * Uwagi do płyty — generowane automatycznie:
   * - FRONT_NAME + HINGE_MILLING: "X puszek na długość Ymm"
   * - SIDE_NAME + GROOVE_FOR_HDF: "Frezowanie nutu pod HDF na boku Ymm"
   */
  remarks?: string;
  /** Polski opis okleinowanych krawędzi, np. "przód, góra, dół". Pusty gdy brak okleiny. */
  veneerEdgeLabel?: string;
}

export interface AggregatedComponent {
  name: string;
  type: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  isWaste?: boolean; // true = odpad z cięcia płyt (SHEET_WASTE)
}

export interface AggregatedJob {
  name: string;
  type: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface AggregationResult {
  boards: AggregatedBoard[];
  components: AggregatedComponent[];
  jobs: AggregatedJob[];
  wasteCost: number;
  wasteDetails: AggregatedComponent[];
}

/**
 * Aggregates boards, components and jobs from a multi-wall calculation response
 * into flat lists for display in the BOM tabs and Excel export.
 *
 * Pure transformation service — no Angular state dependencies.
 * Caller passes `frontendWalls` (for plinth thickness override) alongside the response.
 */
@Injectable({ providedIn: 'root' })
export class ProjectDetailsAggregatorService {

  // TODO(CODEX): Agregator BOM urósł do krytycznej warstwy transformacji projektu i zawiera coraz więcej reguł domenowych, fallbacków i wyjątków (blaty, cokoły, blendy, odpady, uwagi technologiczne). To dobry kandydat do rozbicia na mniejsze etapy/pure helpers, bo każda nowa reguła produkcyjna będzie teraz zwiększać ryzyko regresji w eksporcie i szczegółach projektu.
  // TODO(CODEX): Jest tu też sporo logiki, która wygląda bardziej na odpowiedzialność backendu niż frontu: frontend sam buduje zagregowany BOM, dopisuje technologiczne remarks, składa etykiety produkcyjne typu "Blenda górna", "lewa/prawa", wylicza fallbacki dla cokołów i decyduje co jest odpadem. Im więcej takich reguł będzie tutaj, tym trudniej utrzymać zgodność z kalkulacją i eksportami po stronie serwera.
  /**
   * @param response  Backend calculation result for all walls.
   * @param frontendWalls  Frontend wall state (needed for plinth.thicknessMm override).
   * @param bomTranslations  Optional flat translation map pre-loaded from backend
   *   (keys like "BOARD_NAME.SIDE_NAME", "MATERIAL.CHIPBOARD").
   *   When provided, used instead of hardcoded BOARD_NAME_PL for board labels.
   *   Falls back to BOARD_NAME_PL when missing or not yet loaded.
   */
  aggregate(response: MultiWallCalculateResponse, frontendWalls: WallWithCabinets[], bomTranslations?: Record<string, string>): AggregationResult {
    const boardsMap = new Map<string, AggregatedBoard>();
    const componentsMap = new Map<string, AggregatedComponent>();
    const jobsMap = new Map<string, AggregatedJob>();

    // Globalny licznik szafek (przez wszystkie ściany), do kolumny "Etykieta" w Excelu
    let globalCabinetIdx = 0;

    for (let wallIdx = 0; wallIdx < response.walls.length; wallIdx++) {
      const wall = response.walls[wallIdx];
      const frontendWall = frontendWalls[wallIdx];

      // 1. Agreguj płyty z szafek
      for (const cabinet of wall.cabinets) {
        const cabinetRef = `Sz.${++globalCabinetIdx}`;

        // Uwagi auto-generowane na podstawie prac frezarskich szafki
        const cabinetJobs = cabinet.jobs ?? [];
        const hingeMilling = cabinetJobs.find((j: Job) => j.type === 'HINGE_MILLING');
        const grooveForHdf = cabinetJobs.find((j: Job) => j.type === 'GROOVE_FOR_HDF');

        if (cabinet.boards) {
          for (const board of cabinet.boards) {
            let boardRemarks = '';
            if (board.boardName === 'FRONT_NAME' && hingeMilling) {
              const hingeCount = Math.round(hingeMilling.quantity);
              // TODO i18n — remarks: "puszka/puszki/puszek" hardcoded PL; po refaktorze użyj translations['UI.REMARKS_HINGES']
              boardRemarks = `${hingeCount} ${hingeCount === 1 ? 'puszka' : hingeCount < 5 ? 'puszki' : 'puszek'} na długość ${board.sideY}mm`;
            } else if (board.boardName === 'SIDE_NAME' && grooveForHdf) {
              // TODO i18n — remarks: "Frezowanie nutu..." hardcoded PL; po refaktorze użyj translations['UI.REMARKS_HDF_GROOVE']
              boardRemarks = `Frezowanie nutu pod HDF na boku ${board.sideY}mm`;
            }

            const vX = board.veneerX ?? 0;
            const vY = board.veneerY ?? 0;
            const veneerEdgeInfo = resolveVeneerEdges(board.boardName, vX, vY);
            this.addBoardToMap(boardsMap, {
              material: board.boardName,
              thickness: board.boardThickness,
              width: board.sideX,
              height: board.sideY,
              quantity: board.quantity,
              unitCost: board.priceEntry?.price ?? 0,
              totalCost: board.totalPrice,
              color: board.color,
              veneerX: vX,
              veneerY: vY,
              veneerColor: board.veneerColor ?? '',
              boardLabel: bomTranslations?.['BOARD_NAME.' + board.boardName] ?? BOARD_NAME_PL[board.boardName] ?? board.boardName,
              cabinetRefs: [cabinetRef],
              remarks: boardRemarks || undefined,
              veneerEdgeLabel: veneerEdgeInfo.label || undefined
            });
          }
        }

        // Agreguj komponenty szafki — bez SHEET_WASTE (odpad jest teraz globalny w response.globalWasteComponents)
        if (cabinet.components) {
          for (const comp of cabinet.components) {
            if (comp.category === 'SHEET_WASTE') continue; // pomijamy — backend już tego nie zwraca per szafka, ale guard na wypadek starszego API
            const key = `${comp.category}_${comp.model}`;
            const existing = componentsMap.get(key);
            if (existing) {
              existing.quantity += comp.quantity;
              existing.totalCost += comp.totalPrice;
            } else {
              componentsMap.set(key, {
                name: comp.model,
                type: comp.category,
                quantity: comp.quantity,
                unitCost: comp.priceEntry?.price ?? 0,
                totalCost: comp.totalPrice
              });
            }
          }
        }

        // Agreguj prace
        // TODO: Brakuje prac oklejania (VENEER) dla zwykłych płyt wiórowych.
        // Każda płyta ma veneerX/veneerY (liczba okleinowanych krawędzi) — należy wygenerować
        // job VENEER per płyta na podstawie zagregowanych boardów z boardsMap.
        // Problemem jest to, że trzeba wiedzieć KTÓRĄ krawędź oklejamy (nie tylko ile)
        // — konieczne do prawidłowego oznaczenia na etykiecie i zachowania ciągłości słoi.
        // Szczegółowy plan: CLAUDE.md → "TODO okleina (kolejna iteracja)".
        if (cabinet.jobs) {
          for (const job of cabinet.jobs) {
            const key = `${job.category}_${job.type}`;
            const existing = jobsMap.get(key);
            if (existing) {
              existing.quantity += job.quantity;
              existing.totalCost += job.totalPrice;
            } else {
              jobsMap.set(key, {
                name: job.type,
                type: job.category,
                quantity: job.quantity,
                unitCost: job.priceEntry?.price ?? 0,
                totalCost: job.totalPrice
              });
            }
          }
        }
      }

      // 2. Agreguj blat jako płytę
      if (wall.countertop?.enabled && wall.countertop.segments) {
        for (const segment of wall.countertop.segments) {
          this.addBoardToMap(boardsMap, {
            material: `BLAT_${wall.countertop.materialType}`,
            thickness: segment.thicknessMm,
            width: segment.lengthMm,
            height: segment.depthMm,
            quantity: 1,
            unitCost: segment.materialCost,
            totalCost: segment.materialCost
          });

          if (segment.cuttingCost > 0) {
            this.addJobToMap(jobsMap, {
              name: 'COUNTERTOP_CUTTING',
              type: 'COUNTERTOP',
              quantity: 1,
              unitCost: segment.cuttingCost,
              totalCost: segment.cuttingCost
            });
          }

          if (segment.edgingCost > 0) {
            this.addJobToMap(jobsMap, {
              name: 'COUNTERTOP_EDGING',
              type: 'COUNTERTOP',
              quantity: 1,
              unitCost: segment.edgingCost,
              totalCost: segment.edgingCost
            });
          }
        }

        // Komponenty blatu (śruby łączące, listewki)
        if (wall.countertop.components) {
          for (const comp of wall.countertop.components) {
            this.addComponentToMap(componentsMap, {
              name: comp.model,
              type: comp.category,
              quantity: comp.quantity,
              unitCost: comp.priceEntry?.price ?? 0,
              totalCost: comp.totalPrice ?? 0
            });
          }
        }
      }

      // 3. Agreguj cokół jako płytę (tylko gdy enabled i są segmenty)
      if (wall.plinth?.enabled && wall.plinth.segments) {
        // Grubość: użyj skonfigurowanej przez użytkownika, fallback wg materiału
        const plinthMat = wall.plinth.materialType ?? '';
        const plinthThicknessMm = frontendWall?.plinthConfig?.thicknessMm
          ?? ((plinthMat === 'MDF_LAMINATED' || plinthMat === 'CHIPBOARD') ? 18 : 16);
        for (const segment of wall.plinth.segments) {
          this.addBoardToMap(boardsMap, {
            material: `COKOL_${plinthMat}`,
            thickness: plinthThicknessMm,
            width: segment.lengthMm,
            height: segment.heightMm,
            quantity: 1,
            unitCost: segment.materialCost,
            totalCost: segment.materialCost
          });

          if (segment.cuttingCost > 0) {
            this.addJobToMap(jobsMap, {
              name: 'PLINTH_CUTTING',
              type: 'PLINTH',
              quantity: 1,
              unitCost: segment.cuttingCost,
              totalCost: segment.cuttingCost
            });
          }
        }
      }

      // Komponenty cokołu (nóżki, klipsy) — agregowane nawet gdy cokół wyłączony,
      // bo szafki takie jak BASE_FRIDGE mogą mieć nóżki bez panelu cokołu
      if (wall.plinth?.components) {
        for (const comp of wall.plinth.components) {
          this.addComponentToMap(componentsMap, {
            name: comp.model,
            type: comp.category,
            quantity: comp.quantity,
            unitCost: comp.priceEntry?.price ?? 0,
            totalCost: comp.totalPrice ?? 0
          });
        }
      }

      // 4. Agreguj blendy jako płyty
      if (wall.fillerPanels) {
        for (const filler of wall.fillerPanels) {
          this.addBoardToMap(boardsMap, {
            material: `BLENDA_${filler.fillerType}`,
            thickness: filler.thicknessMm,
            width: filler.widthMm,
            height: filler.heightMm,
            quantity: 1,
            unitCost: filler.materialCost,
            totalCost: filler.materialCost
          });

          if (filler.cuttingCost > 0) {
            this.addJobToMap(jobsMap, {
              name: 'FILLER_CUTTING',
              type: 'FILLER',
              quantity: 1,
              unitCost: filler.cuttingCost,
              totalCost: filler.cuttingCost
            });
          }

          if (filler.veneerCost > 0) {
            this.addJobToMap(jobsMap, {
              name: 'FILLER_VENEER',
              type: 'FILLER',
              quantity: 1,
              unitCost: filler.veneerCost,
              totalCost: filler.veneerCost
            });
          }

          if (filler.components) {
            for (const comp of filler.components) {
              this.addComponentToMap(componentsMap, {
                name: comp.model,
                type: comp.category,
                quantity: comp.quantity,
                unitCost: comp.priceEntry?.price ?? 0,
                totalCost: comp.totalPrice ?? 0
              });
            }
          }
        }
      }

      // 5. Agreguj obudowy boczne jako płyty
      if (wall.enclosures) {
        for (const enc of wall.enclosures) {
          for (const board of enc.boards ?? []) {
            this.addBoardToMap(boardsMap, {
              material: `${board.label} (${enc.leftSide ? 'lewa' : 'prawa'})`,
              thickness: board.thicknessMm,
              width: board.widthMm,
              height: board.heightMm,
              quantity: 1,
              unitCost: board.materialCost,
              totalCost: board.materialCost
            });
          }

          if (enc.cuttingCost > 0) {
            this.addJobToMap(jobsMap, {
              name: 'ENCLOSURE_CUTTING',
              type: 'ENCLOSURE',
              quantity: 1,
              unitCost: enc.cuttingCost,
              totalCost: enc.cuttingCost
            });
          }
        }
      }

      // 6. Agreguj blendę górną jako płyty (z podziałem na segmenty ≤ 2800mm)
      if (wall.upperFiller?.enabled && wall.upperFiller.segments) {
        for (const seg of wall.upperFiller.segments) {
          const label = seg.requiresJoint
            ? `Blenda górna (seg. ${seg.segmentIndex + 1})`
            : 'Blenda górna';
          this.addBoardToMap(boardsMap, {
            material: label,
            thickness: 18,
            width: seg.lengthMm,
            height: seg.heightMm,
            quantity: 1,
            unitCost: seg.materialCost,
            totalCost: seg.materialCost
          });
          if (seg.cuttingCost > 0) {
            this.addJobToMap(jobsMap, {
              name: `UPPER_FILLER_CUTTING${seg.requiresJoint ? `_${seg.segmentIndex + 1}` : ''}`,
              type: 'UPPER_FILLER',
              quantity: 1,
              unitCost: seg.cuttingCost,
              totalCost: seg.cuttingCost
            });
          }
        }
      }
    }

    const boards = Array.from(boardsMap.values());
    const jobs = Array.from(jobsMap.values());

    // Odpad pochodzi globalnie z response.globalWasteComponents (backend agreguje per projekt).
    // Nie szukamy już SHEET_WASTE w szafkach.
    const wasteCost = response.totalWasteCost ?? 0;
    const wasteDetails: AggregatedComponent[] = (response.globalWasteComponents ?? []).map(comp => ({
      name: comp.model,
      type: comp.category,
      quantity: comp.quantity,
      unitCost: comp.priceEntry?.price ?? 0,
      totalCost: comp.totalPrice,
      isWaste: true
    }));

    // W liście komponentów do wyświetlenia: zwykłe komponenty najpierw, odpad (z isWaste=true) na końcu.
    // Dzięki temu template może bez zmian używać comp.isWaste do stylizacji i licznika zakładki.
    const components = [...Array.from(componentsMap.values()), ...wasteDetails];

    return { boards, components, jobs, wasteCost, wasteDetails };
  }

  /**
   * Collects unique missing price entry codes from all elements of a wall calculation result.
   * Returns a deduplicated list of missing price keys (e.g. "COUNTERTOP.LAMINATE.MATERIAL").
   * Used to show a pricing warning when pricingComplete=false on any element.
   */
  collectPricingWarnings(wallResult: WallCalculationSummary): string[] {
    const missing = new Set<string>();

    const collectFrom = (obj: { pricingComplete?: boolean; missingPriceEntries?: string[] } | null | undefined) => {
      if (obj?.pricingComplete === false && obj.missingPriceEntries) {
        obj.missingPriceEntries.forEach(e => missing.add(e));
      }
    };

    collectFrom(wallResult.countertop);
    collectFrom(wallResult.plinth);
    wallResult.fillerPanels?.forEach(fp => collectFrom(fp));
    wallResult.enclosures?.forEach(enc => collectFrom(enc));
    collectFrom(wallResult.upperFiller);

    return Array.from(missing);
  }

  /**
   * Adds a board to the aggregation map (merges if key already exists).
   * Key includes color and veneer — boards with different colors/veneer are not merged.
   */
  private addBoardToMap(map: Map<string, AggregatedBoard>, board: AggregatedBoard): void {
    const key = [
      board.material, board.thickness, board.width, board.height,
      board.color ?? '', board.veneerX ?? 0, board.veneerY ?? 0, board.veneerColor ?? ''
    ].join('_');
    const existing = map.get(key);
    if (existing) {
      existing.quantity += board.quantity;
      existing.totalCost += board.totalCost;
      if (board.cabinetRefs?.length) {
        existing.cabinetRefs = [...(existing.cabinetRefs ?? []), ...board.cabinetRefs];
      }
      // Merge remarks: deduplikacja (jeśli taka sama uwaga, nie duplikuj)
      if (board.remarks && board.remarks !== existing.remarks) {
        existing.remarks = existing.remarks
          ? `${existing.remarks}; ${board.remarks}`
          : board.remarks;
      }
    } else {
      map.set(key, { ...board });
    }
  }

  private addComponentToMap(map: Map<string, AggregatedComponent>, comp: AggregatedComponent): void {
    const key = `${comp.type}_${comp.name}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += comp.quantity;
      existing.totalCost += comp.totalCost;
    } else {
      map.set(key, { ...comp });
    }
  }

  private addJobToMap(map: Map<string, AggregatedJob>, job: AggregatedJob): void {
    const key = `${job.type}_${job.name}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += job.quantity;
      existing.totalCost += job.totalCost;
    } else {
      map.set(key, { ...job });
    }
  }
}
