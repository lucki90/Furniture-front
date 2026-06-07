import { FloorPlanArc } from './floor-plan-door-arcs';

/**
 * Geometria obrysu „L" oraz łuków otwierania frontów szafki narożnej Type A (L-kształt)
 * na rzucie z góry. Liczona w pikselach ekranowych (po przeskalowaniu).
 *
 * <p>Założenia układu (ściana pozioma, np. MAIN): ściana jest na dole (`wallY`), korpus wychodzi
 * „do góry" w stronę pomieszczenia. Ramię główne biegnie wzdłuż ściany (`armMainPx` = widthA),
 * ramię boczne wychodzi prostopadle w głąb pomieszczenia (`armSidePx` = widthB) po stronie styku
 * (`junction`). Oba ramiona mają głębokość korpusu (`depthPx` = 560 × skala) i nakładają się
 * w kwadracie narożnym depth×depth.</p>
 */
export interface HorizontalLCornerInput {
  cabinetId: string;
  /** Lewa krawędź obrysu (px). */
  x: number;
  /** Krawędź przy ścianie — dolna krawędź na ekranie dla ścian poziomych (px). */
  wallY: number;
  /** Długość ramienia głównego wzdłuż ściany (px) = widthA × skala. */
  armMainPx: number;
  /** Długość ramienia bocznego prostopadle do ściany (px) = widthB × skala. */
  armSidePx: number;
  /** Głębokość korpusu (px) = 560 × skala. */
  depthPx: number;
  /** Strona styku (ramię boczne / prostopadła ściana): 'LEFT' albo 'RIGHT'. */
  junction: 'LEFT' | 'RIGHT';
  /** TWO_DOORS → 2 łuki (ramię główne + boczne); BIFOLD/BLIND/inne → 1 łuk (ramię główne). */
  doubleDoor: boolean;
}

/** Prostokąt bryły kolizyjnej (px) — używany do AABB wykrywania kolizji łuków otwierania. */
export interface LCornerRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HorizontalLCornerShape {
  /** Ścieżka SVG obrysu „L". */
  pathD: string;
  /** Łuki otwierania frontów spotykające się w rogu wewnętrznym „L". */
  doorArcs: FloorPlanArc[];
  /**
   * Bryła kolizyjna obrysu „L" jako dwa prostokąty (ramię główne + boczne). Ramię boczne wystaje
   * głębiej w pomieszczenie niż standardowy prostokąt width×depth, więc kolizje muszą uwzględniać
   * oba ramiona — sam prostokąt korpusu pomija wystającą część ramienia bocznego.
   */
  blockingRects: LCornerRect[];
}

/**
 * Buduje obrys „L" + łuki drzwi dla narożnika Type A na ścianie poziomej.
 * Zwraca `null`, gdy ramiona nie wystają poza kwadrat narożny (degeneracja do prostokąta).
 */
export function buildHorizontalLCornerShape(input: HorizontalLCornerInput): HorizontalLCornerShape | null {
  const { cabinetId, x, wallY, armMainPx, armSidePx, depthPx, junction, doubleDoor } = input;

  // „L" jest widoczne tylko, gdy oba ramiona wystają poza kwadrat narożny depth×depth.
  if (!(armMainPx > depthPx) || !(armSidePx > depthPx)) {
    return null;
  }

  const xLeft = x;
  const xRight = x + armMainPx;
  const yTopMain = wallY - depthPx;   // czoło ramienia głównego (do pomieszczenia)
  const yTopSide = wallY - armSidePx; // szczyt ramienia bocznego (głębiej w pomieszczeniu)

  const mainRadius = armMainPx - depthPx;
  const sideRadius = armSidePx - depthPx;

  // Ramię główne: pełna szerokość przy ścianie, głębokość korpusu. Wspólne dla obu stron styku.
  const mainArmRect: LCornerRect = { x: xLeft, y: yTopMain, w: armMainPx, h: depthPx };

  if (junction === 'LEFT') {
    const xInner = xLeft + depthPx;
    const pathD =
      `M ${xLeft},${wallY} ` +
      `L ${xLeft},${yTopSide} ` +
      `L ${xInner},${yTopSide} ` +
      `L ${xInner},${yTopMain} ` +
      `L ${xRight},${yTopMain} ` +
      `L ${xRight},${wallY} Z`;

    const doorArcs: FloorPlanArc[] = [];
    // Ramię główne: czoło poziome [xInner..xRight] @ yTopMain, zawias przy rogu wewnętrznym (lewa).
    doorArcs.push(buildArc(
      `${cabinetId}-corner-main`, cabinetId,
      `M ${xRight},${yTopMain} A ${mainRadius},${mainRadius} 0 0 0 ${xInner},${yTopMain - mainRadius} L ${xInner},${yTopMain} Z`,
      xInner, yTopMain - mainRadius, mainRadius, mainRadius
    ));
    if (doubleDoor) {
      // Ramię boczne: czoło pionowe @ xInner [yTopSide..yTopMain], otwiera się w prawo (do pomieszczenia).
      doorArcs.push(buildArc(
        `${cabinetId}-corner-side`, cabinetId,
        `M ${xInner},${yTopSide} A ${sideRadius},${sideRadius} 0 0 1 ${xInner + sideRadius},${yTopMain} L ${xInner},${yTopMain} Z`,
        xInner, yTopSide, sideRadius, sideRadius
      ));
    }
    // Ramię boczne (lewa kolumna): głębokość korpusu szeroka, wystaje aż do yTopSide.
    const sideArmRect: LCornerRect = { x: xLeft, y: yTopSide, w: depthPx, h: armSidePx };
    return { pathD, doorArcs, blockingRects: [mainArmRect, sideArmRect] };
  }

  // junction === 'RIGHT' — lustrzane odbicie.
  const xInner = xRight - depthPx;
  const pathD =
    `M ${xLeft},${wallY} ` +
    `L ${xLeft},${yTopMain} ` +
    `L ${xInner},${yTopMain} ` +
    `L ${xInner},${yTopSide} ` +
    `L ${xRight},${yTopSide} ` +
    `L ${xRight},${wallY} Z`;

  const doorArcs: FloorPlanArc[] = [];
  // Ramię główne: czoło poziome [xLeft..xInner] @ yTopMain, zawias przy rogu wewnętrznym (prawa).
  doorArcs.push(buildArc(
    `${cabinetId}-corner-main`, cabinetId,
    `M ${xLeft},${yTopMain} A ${mainRadius},${mainRadius} 0 0 1 ${xInner},${yTopMain - mainRadius} L ${xInner},${yTopMain} Z`,
    xLeft, yTopMain - mainRadius, mainRadius, mainRadius
  ));
  if (doubleDoor) {
    // Ramię boczne: czoło pionowe @ xInner [yTopSide..yTopMain], otwiera się w lewo (do pomieszczenia).
    doorArcs.push(buildArc(
      `${cabinetId}-corner-side`, cabinetId,
      `M ${xInner},${yTopSide} A ${sideRadius},${sideRadius} 0 0 0 ${xInner - sideRadius},${yTopMain} L ${xInner},${yTopMain} Z`,
      xInner - sideRadius, yTopSide, sideRadius, sideRadius
    ));
  }
  // Ramię boczne (prawa kolumna): głębokość korpusu szeroka, wystaje aż do yTopSide.
  const sideArmRect: LCornerRect = { x: xInner, y: yTopSide, w: depthPx, h: armSidePx };
  return { pathD, doorArcs, blockingRects: [mainArmRect, sideArmRect] };
}

function buildArc(
  id: string,
  cabinetId: string,
  pathD: string,
  bboxX: number,
  bboxY: number,
  bboxW: number,
  bboxH: number
): FloorPlanArc {
  return {
    id,
    cabinetId,
    kind: 'SINGLE_DOOR',
    pathD,
    hasCollision: false,
    bboxX,
    bboxY,
    bboxW,
    bboxH
  };
}
