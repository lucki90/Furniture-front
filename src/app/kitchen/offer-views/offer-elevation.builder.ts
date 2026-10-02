import { CabinetPosition, cabinetRequiresCountertop, KitchenCabinet, WallWithCabinets } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { buildVisualCabinetPositions, VisualCabinetPosition } from '../kitchen-layout/kitchen-layout-view-model.builder';
import { DisplayFront, DisplayHandle } from '../kitchen-layout/strategies/cabinet-render-context';
import { CountertopRunMm } from '../floor-plan/floor-plan-layout.builder';
import { CornerGhost, CornerJunctionSide } from '../service/corner-layout/corner-layout.model';
import { buildCornerGhostLayer, CornerGhostView, CornerLayoutRect } from '../kitchen-layout/kitchen-layout-corner-ghosts.builder';
import {
  group,
  horizontalDimension,
  line,
  OfferSvgDrawing,
  PRINT,
  rect,
  svgDocument,
  SvgStyle,
  verticalDimension
} from './offer-svg';

/** Dane widoku ściany od frontu: szafki widocznej strony z pozycjami w mm i dodatki ściany. */
export interface OfferElevationInput {
  wall: WallWithCabinets;
  /** Szafki rysowanej strony (na wyspie — jednej strony). */
  cabinets: KitchenCabinet[];
  /** Pozycje szafek w mm (`KitchenGeometryService` z ograniczeniami narożnymi ściany). */
  positions: CabinetPosition[];
  /** Wysokość nóżek / cokołu ściany (mm). */
  feetHeightMm: number;
  upperFillerHeightMm: number;
  fillerWidthMm: number;
  countertopThicknessMm: number;
  /** Przebiegi blatu (`computeCountertopRunsMm`); pusta lista, gdy ściana nie ma blatu. */
  countertopRuns: CountertopRunMm[];
  plinthEnabled: boolean;
  cornerJunctionSides?: ReadonlyMap<string, CornerJunctionSide>;
  /** Szafki sąsiednich ścian widoczne przy narożnikach (`ProjectCornerLayout.ghosts` tej ściany). */
  cornerGhosts?: readonly CornerGhost[];
  /** Wysokość cokołu i głębokość blatu ściany, na której stoi szafka sąsiednia. */
  feetHeightMmFor?: (wallId: string) => number;
  countertopDepthMmFor?: (wallId: string) => number;
}

const MARGIN = { left: 64, right: 28, top: 46, bottom: 78 };
const FRONT_GAP = 1;
const DIMENSION_SIZE = 12;
/**
 * Ramka widoku w ofercie PDF (`OfferViewsSection`: szerokość treści bez marginesu ramki i maksymalna wysokość, pt)
 * i docelowa wielkość opisów na wydruku. Skala rysunku (proporcjonalna w obu osiach) jest dobierana tak, żeby po
 * wpasowaniu w ramkę opisy miały {@link PRINTED_TEXT_PT} niezależnie od wymiarów ściany.
 */
const PDF_FRAME_PT = { width: 495, height: 300 };
const PRINTED_TEXT_PT = 7.5;
const UNITS_PER_PT = DIMENSION_SIZE / PRINTED_TEXT_PT;
const MAX_WALL_WIDTH = PDF_FRAME_PT.width * UNITS_PER_PT - MARGIN.left - MARGIN.right;
const MAX_WALL_HEIGHT = PDF_FRAME_PT.height * UNITS_PER_PT - MARGIN.top - MARGIN.bottom;
const PLINTH_PANEL_GAP_MM = 3;
const DEFAULT_BASE_HEIGHT_MM = 720;

const BODY: SvgStyle = { fill: PRINT.body, stroke: PRINT.line, strokeWidth: 0.9 };
const FRONT: SvgStyle = { fill: PRINT.front, stroke: PRINT.line, strokeWidth: 0.7 };
const THIN: SvgStyle = { stroke: PRINT.soft, strokeWidth: 0.6 };
const GHOST: SvgStyle = { fill: PRINT.wall, stroke: PRINT.faint, strokeWidth: 0.7, dash: '4 3' };
const DEFAULT_COUNTERTOP_DEPTH_MM = 600;

/**
 * Widok ściany od frontu do oferty: proporcjonalny, w stylu do druku — korpusy, fronty i uchwyty z tych samych
 * rendererów co elewacja edytora, blat, cokół, blenda górna oraz wymiary (szerokości szafek, ściana).
 */
export function buildOfferElevation(input: OfferElevationInput): OfferSvgDrawing {
  const { wall } = input;
  const scale = Math.min(MAX_WALL_WIDTH / Math.max(wall.widthMm, 1), MAX_WALL_HEIGHT / Math.max(wall.heightMm, 1));
  const wallWidth = wall.widthMm * scale;
  const wallHeight = wall.heightMm * scale;
  const visuals = buildVisualCabinetPositions({
    cabinetPositions: input.positions,
    cabinets: input.cabinets,
    scale,
    wallWidth,
    wallDisplayHeight: wallHeight,
    scaleVert: scale,
    feetHeightMm: input.feetHeightMm,
    fillerWidthMm: input.fillerWidthMm,
    standardBottomHeight: 720,
    standardTopHeight: 720,
    standardBottomDepth: 560,
    standardTopDepth: 320,
    frontGap: FRONT_GAP,
    cornerJunctionSides: input.cornerJunctionSides
  });

  const counterBand = countertopBand(input, scale, wallHeight);
  const content: string[] = [];
  if (wall.type !== 'ISLAND') {
    content.push(rect(0, 0, wallWidth, wallHeight, { fill: PRINT.wall, stroke: PRINT.faint, strokeWidth: 0.8 }));
  }
  content.push(...cornerGhosts(input, scale, wallHeight, counterBand));
  content.push(...input.countertopRuns.map(run => rect(run.startMm * scale, counterBand.y, run.lengthMm * scale,
    counterBand.height, { fill: PRINT.countertop, stroke: PRINT.line, strokeWidth: 0.8 })));
  content.push(...plinth(input, visuals, scale, wallHeight));
  content.push(...upperFiller(input, visuals, scale));
  visuals.forEach(visual => content.push(...cabinet(visual)));
  content.push(line(-10, wallHeight, wallWidth + 10, wallHeight, { stroke: PRINT.ink, strokeWidth: 1.4 }));
  content.push(...dimensions(input, visuals, wallWidth, wallHeight));

  return svgDocument(
    MARGIN.left + wallWidth + MARGIN.right,
    MARGIN.top + wallHeight + MARGIN.bottom,
    [group(MARGIN.left, MARGIN.top, content)]);
}

/** Pas blatu: na najwyższej szafce z blatem stojącej na cokole ściany. */
function countertopBand(input: OfferElevationInput, scale: number, wallHeight: number): { y: number; height: number } {
  const baseHeights = input.cabinets.filter(cabinetRequiresCountertop).map(cabinet => cabinet.height);
  const baseHeightMm = baseHeights.length > 0 ? Math.max(...baseHeights) : DEFAULT_BASE_HEIGHT_MM;
  const height = input.countertopThicknessMm * scale;
  return { y: wallHeight - (input.feetHeightMm + baseHeightMm) * scale - height, height };
}

/**
 * Szafki sąsiednich ścian przy narożnikach — ta sama warstwa co w elewacji edytora, w stylu przerywanym (bez
 * frontów i uchwytów), żeby blat nad ramieniem szafki L i strefa narożna miały kontekst.
 */
function cornerGhosts(
  input: OfferElevationInput,
  scale: number,
  wallHeight: number,
  counterBand: { y: number; height: number }
): string[] {
  if (!input.cornerGhosts?.length || input.wall.type === 'ISLAND') {
    return [];
  }
  const layer = buildCornerGhostLayer({
    ghosts: input.cornerGhosts,
    reservedZones: [],
    scale,
    scaleVert: scale,
    wallDisplayHeight: wallHeight,
    topZone: { y: 0, height: 0 },
    counterZone: counterBand,
    bottomZone: { y: 0, height: 0 },
    showUpperCabinets: true,
    showCountertop: input.countertopRuns.length > 0,
    feetHeightMmFor: input.feetHeightMmFor ?? (() => input.feetHeightMm),
    countertopDepthMmFor: input.countertopDepthMmFor ?? (() => DEFAULT_COUNTERTOP_DEPTH_MM),
    cabinetLabel: ghost => ghost.cabinet.id,
    wallLabel: type => type
  });
  return layer.ghosts.flatMap(ghost => ghostElements(ghost));
}

function ghostElements(ghost: CornerGhostView): string[] {
  const shape = (area: CornerLayoutRect | null, style: SvgStyle) =>
    area ? rect(area.x, area.y, area.width, area.height, style) : '';
  return [
    shape(ghost.body, GHOST),
    shape(ghost.front, { ...GHOST, fill: PRINT.front }),
    shape(ghost.countertop, { fill: PRINT.countertop, stroke: PRINT.faint, strokeWidth: 0.7, dash: '4 3' })
  ];
}

/** Panel cokołu pod szafkami dolnymi i słupkami; luka (np. wolnostojące AGD) dzieli go na odcinki. */
function plinth(input: OfferElevationInput, visuals: VisualCabinetPosition[], scale: number, wallHeight: number): string[] {
  if (!input.plinthEnabled) {
    return [];
  }
  const spans = visuals
    .filter(visual => (visual.zone === 'BOTTOM' || visual.zone === 'FULL')
      && !visual.isFreestandingAppliance
      && visual.type !== KitchenCabinetType.PANTRY_PASSAGE
      && visual.feetHeight > 0)
    .map(visual => horizontalSpanWithEnclosures(visual))
    .sort((a, b) => a.start - b.start);
  if (spans.length === 0) {
    return [];
  }
  const panelHeight = spans[0].feetHeight - Math.max(PLINTH_PANEL_GAP_MM * scale, 0.5);
  return mergeSpans(spans).map(span => rect(span.start, wallHeight - panelHeight, span.end - span.start, panelHeight,
    { fill: PRINT.plinth, stroke: PRINT.line, strokeWidth: 0.6 }));
}

function upperFiller(input: OfferElevationInput, visuals: VisualCabinetPosition[], scale: number): string[] {
  const uppers = visuals.filter(visual => visual.zone === 'TOP');
  if (input.upperFillerHeightMm <= 0 || uppers.length === 0) {
    return [];
  }
  const spans = uppers.map(visual => horizontalSpanWithEnclosures(visual));
  const start = Math.min(...spans.map(span => span.start));
  const end = Math.max(...spans.map(span => span.end));
  const height = input.upperFillerHeightMm * scale;
  const top = Math.min(...uppers.map(visual => visual.displayY)) - height;
  return [rect(start, top, end - start, height, { fill: PRINT.body, stroke: PRINT.line, strokeWidth: 0.6 })];
}

function cabinet(visual: VisualCabinetPosition): string[] {
  const elements = [...enclosures(visual)];
  elements.push(rect(visual.displayX, visual.displayY, visual.displayWidth, visual.bodyHeight,
    visual.isFreestandingAppliance ? { ...BODY, fill: PRINT.appliance, dash: '4 3' } : BODY));
  visual.fronts.forEach(front => elements.push(...frontElements(front)));
  visual.handles.forEach(handle => elements.push(handleElement(handle)));
  if (visual.ovenSeparatorDisplayY) {
    elements.push(line(visual.displayX + 1, visual.ovenSeparatorDisplayY,
      visual.displayX + visual.displayWidth - 1, visual.ovenSeparatorDisplayY, THIN));
  }
  return elements;
}

/** Obudowy boczne: płyta do podłogi (dla górnych do sufitu) albo na wysokość korpusu. */
function enclosures(visual: VisualCabinetPosition): string[] {
  const sides: Array<{ type: string | undefined; width: number; x: number }> = [
    { type: visual.leftEnclosureType, width: visual.leftEnclosureDisplayWidth, x: visual.displayX - visual.leftEnclosureDisplayWidth },
    { type: visual.rightEnclosureType, width: visual.rightEnclosureDisplayWidth, x: visual.displayX + visual.displayWidth }
  ];
  return sides
    .filter(side => side.width > 0)
    .map(side => {
      const toFloor = side.type === 'SIDE_PLATE_TO_FLOOR';
      const y = toFloor && visual.zone === 'TOP' ? 0 : visual.displayY;
      const height = !toFloor
        ? visual.bodyHeight
        : visual.zone === 'TOP' ? visual.displayY + visual.bodyHeight : visual.bodyHeight + visual.feetHeight;
      return rect(side.x, y, side.width, height, BODY);
    });
}

function frontElements(front: DisplayFront): string[] {
  switch (front.type) {
    case 'OPEN':
      return [rect(front.x, front.y, front.width, front.height, { stroke: PRINT.faint, strokeWidth: 0.6, dash: '3 2' })];
    case 'APPLIANCE':
      return [rect(front.x, front.y, front.width, front.height, { fill: PRINT.appliance, stroke: PRINT.soft, strokeWidth: 0.6 })];
    case 'SHELF_LINE':
    case 'PLINTH_BREAK_LINE':
      return [line(front.x, front.y, front.x + front.width, front.y, THIN)];
    case 'VERT_DIVIDER':
      return [line(front.x, front.y, front.x, front.y + front.height, THIN)];
    default:
      return [rect(front.x, front.y, front.width, front.height, FRONT)];
  }
}

function handleElement(handle: DisplayHandle): string {
  const x2 = handle.x2 ?? handle.x1;
  const y2 = handle.y2 ?? handle.y1;
  return handle.type === 'MILLING'
    ? line(handle.x1, handle.y1, x2, y2, { stroke: PRINT.soft, strokeWidth: 1.2, dash: '2 1.5' })
    : line(handle.x1, handle.y1, x2, y2, { stroke: PRINT.ink, strokeWidth: 1.6 });
}

function dimensions(
  input: OfferElevationInput,
  visuals: VisualCabinetPosition[],
  wallWidth: number,
  wallHeight: number
): string[] {
  const elements: string[] = [];
  const lower = visuals
    .filter(visual => visual.zone !== 'TOP')
    .sort((a, b) => a.displayX - b.displayX);
  lower.forEach(visual => elements.push(...horizontalDimension(
    visual.displayX, visual.displayX + visual.displayWidth, wallHeight + 22, String(visual.width), DIMENSION_SIZE)));
  elements.push(...horizontalDimension(0, wallWidth, wallHeight + 56, String(input.wall.widthMm), DIMENSION_SIZE + 1));

  visuals
    .filter(visual => visual.zone === 'TOP')
    .sort((a, b) => a.displayX - b.displayX)
    .forEach(visual => elements.push(...horizontalDimension(
      visual.displayX, visual.displayX + visual.displayWidth, -16, String(visual.width), DIMENSION_SIZE)));

  if (input.wall.type !== 'ISLAND') {
    elements.push(...verticalDimension(-28, 0, wallHeight, String(input.wall.heightMm), DIMENSION_SIZE + 1));
  }
  return elements;
}

interface HorizontalSpan {
  start: number;
  end: number;
  feetHeight: number;
}

/** Cokół i blenda górna przechodzą nad obudową boczną, chyba że płyta boczna sama sięga podłogi / sufitu. */
function horizontalSpanWithEnclosures(visual: VisualCabinetPosition): HorizontalSpan {
  const extendsInto = (type: string | undefined) => !!type && type !== 'NONE' && type !== 'SIDE_PLATE_TO_FLOOR';
  return {
    start: extendsInto(visual.leftEnclosureType) ? visual.displayX - visual.leftEnclosureDisplayWidth : visual.displayX,
    end: extendsInto(visual.rightEnclosureType)
      ? visual.displayX + visual.displayWidth + visual.rightEnclosureDisplayWidth
      : visual.displayX + visual.displayWidth,
    feetHeight: visual.feetHeight
  };
}

function mergeSpans(spans: HorizontalSpan[]): HorizontalSpan[] {
  const merged: HorizontalSpan[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end + 0.5) {
      last.end = Math.max(last.end, span.end);
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}
