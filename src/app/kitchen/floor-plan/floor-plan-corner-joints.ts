import { CornerJointType } from '../model/countertop.model';
import { WallCorner } from '../service/corner-layout/corner-layout.model';
import { CountertopCornerJoint } from '../service/corner-layout/corner-run-trims';
import { CountertopOnFloorPlan, WallPosition } from './floor-plan-layout.builder';

export interface PointPx {
  x: number;
  y: number;
}


/**
 * Narożnik na rzucie (px):
 * - `wallCorner` — styk lic ścian A i B,
 * - `innerCorner` — styk frontów blatów (głębokość blatu B wzdłuż ściany A, głębokość blatu A wzdłuż ściany B),
 * - `side` — kierunek od narożnika wzdłuż ściany A: +1 dla `L_CORNER_LEFT`, −1 dla `L_CORNER_RIGHT`.
 */
export interface CornerJointGeometryPx {
  wallAId: string;
  wallBId: string;
  wallCorner: PointPx;
  innerCorner: PointPx;
  side: 1 | -1;
  /** Skala rzutu (px na mm). */
  scale: number;
}

/** Tolerancja styku ścian na rysunku (px). */
const TOUCH_TOLERANCE_PX = 2;
/** Tolerancja nakładania się blatu na kwadrat narożny (px) — sam styk krawędzi nie jest nakładaniem. */
const OVERLAP_EPSILON_PX = 0.5;

/** Geometria narożnika na rzucie albo `null`, gdy ściany A i B nie stykają się na rysunku. */
export function cornerJointGeometryPx(
  corner: WallCorner,
  positions: readonly WallPosition[],
  depthAMm: number,
  depthBMm: number
): CornerJointGeometryPx | null {
  const horizontal = positions.find(position => position.wall.id === corner.a.wallId);
  const vertical = positions.find(position => position.wall.id === corner.b.wallId);
  if (!horizontal || !vertical) {
    return null;
  }
  const left = corner.connectionType === 'L_CORNER_LEFT';
  const cornerX = left ? horizontal.x : horizontal.x + horizontal.width;
  const touchingEdgeX = left ? vertical.x + vertical.width : vertical.x;
  if (Math.abs(touchingEdgeX - cornerX) > TOUCH_TOLERANCE_PX) {
    return null;
  }
  const side = left ? 1 : -1;
  return {
    wallAId: corner.a.wallId,
    wallBId: corner.b.wallId,
    wallCorner: { x: cornerX, y: horizontal.y },
    innerCorner: { x: cornerX + side * depthBMm * horizontal.scale, y: horizontal.y - depthAMm * horizontal.scale },
    side,
    scale: horizontal.scale
  };
}

/**
 * Szew złącza w kwadracie narożnym (punkty łamanej):
 * - cięcie 45° — przekątna od styku ścian do styku frontów,
 * - listwa — front blatu przechodzącego, do którego dochodzi blat drugiej ściany,
 * - łyżwa — linia wcięcia za frontem blatu przechodzącego (żeńskiego) i krótki skos 45° do styku frontów.
 */
export function cornerJointPoints(
  geometry: CornerJointGeometryPx,
  jointType: CornerJointType,
  passingWallId: string | undefined,
  lyzwaRecessMm: number
): PointPx[] {
  const { wallCorner, innerCorner, side } = geometry;
  if (jointType === 'MITER_45') {
    return [wallCorner, innerCorner];
  }
  const recessPx = jointType === 'LYZWA' ? lyzwaRecessMm * geometry.scale : 0;
  const recessCorner = { x: innerCorner.x - side * recessPx, y: innerCorner.y + recessPx };
  const seamStart = passingWallId === geometry.wallBId
    ? { x: recessCorner.x, y: wallCorner.y }
    : { x: wallCorner.x, y: recessCorner.y };
  return recessPx > 0 ? [seamStart, recessCorner, innerCorner] : [seamStart, innerCorner];
}

/** Punkty łamanej w formacie atrybutu `points`. */
export function toSvgPoints(points: readonly PointPx[]): string {
  return points.map(point => `${round(point.x)},${round(point.y)}`).join(' ');
}

const JOINT_LABELS: Readonly<Record<CornerJointType, string>> = {
  LYZWA: 'łyżwa',
  MITER_45: '45°',
  ALUMINUM_STRIP: 'listwa'
};

export function cornerJointLabel(jointType: CornerJointType | undefined): string {
  return jointType ? JOINT_LABELS[jointType] ?? '' : '';
}

/**
 * Przy cięciu 45° oba blaty dochodzą do ściany, więc ich prostokąty nakładają się w kwadracie narożnym. Rysunek
 * przycina je po przekątnej narożnika: każdy blat zachowuje część po swojej stronie linii złącza.
 */
/**
 * Narożniki z cięciem 45° (z układu narożników frontu) w geometrii rzutu — blaty obu ścian są tam przycinane po
 * przekątnej. Głębokość jak rysowanych blatów.
 */
export function miterCornerGeometriesPx(
  joints: readonly CountertopCornerJoint[],
  corners: readonly WallCorner[],
  positions: readonly WallPosition[],
  countertopDepthMm: number
): CornerJointGeometryPx[] {
  return joints
    .filter(joint => joint.type === 'MITER_45')
    .map(joint => corners.find(corner => corner.id === joint.cornerId))
    .map(corner => corner ? cornerJointGeometryPx(corner, positions, countertopDepthMm, countertopDepthMm) : null)
    .filter((geometry): geometry is CornerJointGeometryPx => geometry !== null);
}

/** Blaty ściany przycięte po przekątnej w jej narożnikach z cięciem 45°. */
export function cutWallCountertopsAtMiterCorners(
  wallId: string,
  countertops: CountertopOnFloorPlan[],
  miterCorners: readonly CornerJointGeometryPx[]
): CountertopOnFloorPlan[] {
  return miterCorners.reduce((current, geometry) => {
    if (geometry.wallAId === wallId) {
      return cutCountertopsAtMiter(current, geometry, 'A');
    }
    return geometry.wallBId === wallId ? cutCountertopsAtMiter(current, geometry, 'B') : current;
  }, countertops);
}

export function cutCountertopsAtMiter(
  countertops: readonly CountertopOnFloorPlan[],
  geometry: CornerJointGeometryPx,
  wallRole: 'A' | 'B'
): CountertopOnFloorPlan[] {
  const { wallCorner, innerCorner, side } = geometry;
  const keep = wallRole === 'A'
    ? { x: innerCorner.x + side, y: wallCorner.y - 1 }
    : { x: wallCorner.x + side, y: innerCorner.y - 1 };
  return countertops.map(countertop => {
    if (!overlapsCornerSquare(countertop, wallCorner, innerCorner)) {
      return countertop;
    }
    const polygon = clipByLine(rectPoints(countertop), wallCorner, innerCorner, keep);
    if (polygon.length < 3) {
      return countertop;
    }
    return { ...countertop, polygonPoints: toSvgPoints(polygon) };
  });
}

function overlapsCornerSquare(countertop: CountertopOnFloorPlan, a: PointPx, b: PointPx): boolean {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  return countertop.x < maxX - OVERLAP_EPSILON_PX
    && countertop.x + countertop.width > minX + OVERLAP_EPSILON_PX
    && countertop.y < maxY - OVERLAP_EPSILON_PX
    && countertop.y + countertop.depth > minY + OVERLAP_EPSILON_PX;
}

function rectPoints(countertop: CountertopOnFloorPlan): PointPx[] {
  const right = countertop.x + countertop.width;
  const bottom = countertop.y + countertop.depth;
  return [
    { x: countertop.x, y: countertop.y },
    { x: right, y: countertop.y },
    { x: right, y: bottom },
    { x: countertop.x, y: bottom }
  ];
}

/** Część wielokąta po stronie prostej (a, b), po której leży punkt `keep` (Sutherland–Hodgman dla jednej prostej). */
function clipByLine(points: readonly PointPx[], a: PointPx, b: PointPx, keep: PointPx): PointPx[] {
  const sideOf = (point: PointPx) => (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
  const keepSign = Math.sign(sideOf(keep));
  const inside = (point: PointPx) => sideOf(point) * keepSign >= -1e-9;
  const intersection = (from: PointPx, to: PointPx): PointPx => {
    const t = sideOf(from) / (sideOf(from) - sideOf(to));
    return { x: from.x + t * (to.x - from.x), y: from.y + t * (to.y - from.y) };
  };

  const result: PointPx[] = [];
  points.forEach((current, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    if (inside(current)) {
      if (!inside(previous)) {
        result.push(intersection(previous, current));
      }
      result.push(current);
    } else if (inside(previous)) {
      result.push(intersection(previous, current));
    }
  });
  return withoutRepeatedPoints(result);
}

/** Bez kolejnych powtórzeń punktu (także ostatni–pierwszy), które powstają, gdy wierzchołek leży na prostej. */
function withoutRepeatedPoints(points: readonly PointPx[]): PointPx[] {
  const same = (left: PointPx, right: PointPx) =>
    Math.abs(left.x - right.x) < 1e-9 && Math.abs(left.y - right.y) < 1e-9;
  return points.filter((point, index) => !same(point, points[(index + 1) % points.length]) || points.length === 1);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
