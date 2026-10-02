import { WallWithCabinets } from '../model/kitchen-state.model';
import { WallType } from '../model/kitchen-project.model';
import { CabinetOnFloorPlan } from '../floor-plan/floor-plan-door-arcs';
import {
  buildCabinetsForWall,
  buildCountertopsForWall,
  buildWallPositions,
  CountertopOnFloorPlan,
  WallPosition
} from '../floor-plan/floor-plan-layout.builder';
import { cutWallCountertopsAtMiterCorners, miterCornerGeometriesPx } from '../floor-plan/floor-plan-corner-joints';
import { ProjectCornerLayout } from '../service/corner-layout/project-corner-layout.builder';
import { group, OfferSvgDrawing, path, polygon, PRINT, rect, svgDocument, SvgStyle, text } from './offer-svg';

/** Dane rzutu z góry do oferty: ściany projektu, wymiary pomieszczenia i układ narożników z edytora. */
export interface OfferFloorPlanInput {
  walls: WallWithCabinets[];
  roomWidthMm: number | null | undefined;
  roomDepthMm: number | null | undefined;
  plinthHeightMm: number;
  upperFillerHeightMm: number;
  fillerWidthMm: number;
  layout: Pick<ProjectCornerLayout, 'topology' | 'constraintsByWallId' | 'junctionSides' | 'countertopTrimsByWallId' | 'countertopJoints'>;
  wallLabel: (type: WallType) => string;
}

/**
 * Geometria rzutu taka jak w edytorze (`KitchenFloorPlanComponent`): te same rozmiary sceny i stałe, więc szafki,
 * blaty i narożniki leżą dokładnie tak samo. Rysunek jest przycinany do zawartości.
 */
const SCENE = { svgWidth: 320, svgHeight: 252, wallThickness: 10, padding: 10 };
const COUNTERTOP_OVERHANG = 30;
const COUNTERTOP_STANDARD_DEPTH = 600;
const CROP_MARGIN = 12;
const LABEL_SIZE = 5.6;

const WALL: SvgStyle = { fill: PRINT.line };
/** Szafki dolne pod blatem: sam podział (blat rysowany wcześniej jako jasna płaszczyzna). */
const BASE_CABINET: SvgStyle = { stroke: PRINT.soft, strokeWidth: 0.3 };
const TALL_CABINET: SvgStyle = { fill: PRINT.body, stroke: PRINT.line, strokeWidth: 0.4 };
const APPLIANCE: SvgStyle = { fill: PRINT.appliance, stroke: PRINT.soft, strokeWidth: 0.35, dash: '1.5 1' };
const UPPER_CABINET: SvgStyle = { stroke: PRINT.line, strokeWidth: 0.35, dash: '2 1.2' };
const COUNTERTOP: SvgStyle = { fill: PRINT.wall, stroke: PRINT.line, strokeWidth: 0.45 };

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Rzut z góry do oferty: ściany, blaty (jasna płaszczyzna) z podziałem szafek dolnych, słupki i AGD wolnostojące,
 * szafki wiszące linią przerywaną oraz podpisy ścian z długością.
 */
export function buildOfferFloorPlan(input: OfferFloorPlanInput): OfferSvgDrawing {
  const positions = buildWallPositions(input.walls, {
    ...SCENE,
    roomWidthMm: input.roomWidthMm,
    roomDepthMm: input.roomDepthMm
  });
  const miterCorners = miterCornerGeometriesPx(
    input.layout.countertopJoints, input.layout.topology.corners, positions, COUNTERTOP_STANDARD_DEPTH);
  const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  const room = roomOutline(input, positions, bounds);
  const walls: string[] = [];
  const baseCabinets: string[] = [];
  const standingCabinets: string[] = [];
  const countertops: string[] = [];
  const upperCabinets: string[] = [];
  const labels: string[] = [];
  for (const position of positions) {
    if (position.wall.type !== 'ISLAND') {
      walls.push(rect(position.x, position.y, position.width, position.height, WALL));
    }
    include(bounds, position.x, position.y, position.width, position.height);

    const cabinets = buildCabinetsForWall(position, SCENE.wallThickness, {
      plinthHeightMm: input.plinthHeightMm,
      upperFillerHeightMm: input.upperFillerHeightMm,
      fillerWidthMm: input.fillerWidthMm,
      cornerConstraints: input.layout.constraintsByWallId.get(position.wall.id),
      cornerJunctionSides: input.layout.junctionSides
    });
    for (const cabinet of cabinets) {
      include(bounds, cabinet.x, cabinet.y, cabinet.width, cabinet.depth);
      const shape = cabinetShape(cabinet);
      if (cabinet.zone === 'TOP') {
        upperCabinets.push(shape);
      } else if (cabinet.zone === 'FULL' || cabinet.isFreestanding) {
        standingCabinets.push(shape);
      } else {
        baseCabinets.push(shape);
      }
    }

    const wallCountertops = position.wall.countertopConfig?.enabled === false
      ? []
      : cutWallCountertopsAtMiterCorners(position.wall.id, buildCountertopsForWall(position, {
        wallThickness: SCENE.wallThickness,
        countertopOverhang: COUNTERTOP_OVERHANG,
        countertopStandardDepth: COUNTERTOP_STANDARD_DEPTH,
        fillerWidthMm: input.fillerWidthMm,
        cornerConstraints: input.layout.constraintsByWallId.get(position.wall.id),
        countertopTrim: input.layout.countertopTrimsByWallId.get(position.wall.id)
      }), miterCorners);
    wallCountertops.forEach(countertop => {
      include(bounds, countertop.x, countertop.y, countertop.width, countertop.depth);
      countertops.push(countertopShape(countertop));
    });

    labels.push(wallLabel(position, input.wallLabel(position.wall.type), bounds));
  }

  const crop = {
    x: bounds.minX - CROP_MARGIN,
    y: bounds.minY - CROP_MARGIN,
    width: bounds.maxX - bounds.minX + 2 * CROP_MARGIN,
    height: bounds.maxY - bounds.minY + 2 * CROP_MARGIN
  };
  return svgDocument(crop.width, crop.height, [
    group(-crop.x, -crop.y,
      [...room, ...walls, ...countertops, ...baseCabinets, ...standingCabinets, ...upperCabinets, ...labels])
  ]);
}

function cabinetShape(cabinet: CabinetOnFloorPlan): string {
  const style = cabinet.zone === 'TOP'
    ? UPPER_CABINET
    : cabinet.isFreestanding ? APPLIANCE : cabinet.zone === 'FULL' ? TALL_CABINET : BASE_CABINET;
  return cabinet.cornerFootprintPath
    ? path(cabinet.cornerFootprintPath, style)
    : rect(cabinet.x, cabinet.y, cabinet.width, cabinet.depth, style);
}

function countertopShape(countertop: CountertopOnFloorPlan): string {
  return countertop.polygonPoints
    ? polygon(countertop.polygonPoints, COUNTERTOP)
    : rect(countertop.x, countertop.y, countertop.width, countertop.depth, COUNTERTOP);
}

/**
 * Podpis ściany z długością — po zewnętrznej stronie ściany (jak etykieta w edytorze), na ścianach bocznych obrócony
 * wzdłuż ściany.
 */
function wallLabel(position: WallPosition, label: string, bounds: Bounds): string {
  const value = `${label} · ${position.wall.widthMm} mm`;
  const halfLength = value.length * LABEL_SIZE * 0.3;
  const vertical = position.wall.type === 'LEFT' || position.wall.type === 'RIGHT';
  if (vertical) {
    include(bounds, position.labelX - LABEL_SIZE, position.labelY - halfLength, 2 * LABEL_SIZE, 2 * halfLength);
  } else {
    include(bounds, position.labelX - halfLength, position.labelY - LABEL_SIZE, 2 * halfLength, 2 * LABEL_SIZE);
  }
  return text(position.labelX, position.labelY, value, {
    size: LABEL_SIZE,
    weight: 'bold',
    fill: PRINT.ink,
    rotate: vertical ? -90 : undefined
  });
}

/** Obrys pomieszczenia (gdy podano jego wymiary), oparty o ścianę główną — jak w edytorze. */
function roomOutline(input: OfferFloorPlanInput, positions: WallPosition[], bounds: Bounds): string[] {
  const widthMm = positive(input.roomWidthMm);
  const depthMm = positive(input.roomDepthMm);
  const main = positions.find(position => position.wall.type === 'MAIN');
  if (!widthMm || !depthMm || !main) {
    return [];
  }
  const width = widthMm * main.scale;
  const height = depthMm * main.scale;
  const x = SCENE.svgWidth / 2 - width / 2;
  const y = main.y + main.height - height;
  include(bounds, x, y, width, height);
  return [
    rect(x, y, width, height, { stroke: PRINT.faint, strokeWidth: 0.5, dash: '3 2' }),
    text(x + 4, y + 7, `Pomieszczenie ${widthMm} × ${depthMm} mm`,
      { size: LABEL_SIZE * 0.85, anchor: 'start', fill: PRINT.soft })
  ];
}

function include(bounds: Bounds, x: number, y: number, width: number, height: number): void {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x + width);
  bounds.maxY = Math.max(bounds.maxY, y + height);
}

function positive(value: number | null | undefined): number | null {
  return typeof value === 'number' && value > 0 ? value : null;
}
