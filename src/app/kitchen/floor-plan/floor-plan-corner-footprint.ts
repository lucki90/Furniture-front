import { FloorPlanArc } from './floor-plan-door-arcs';

/**
 * Geometria obrysu „L" oraz łuków otwierania frontów szafki narożnej Type A (L-kształt)
 * na rzucie z góry. Liczona w pikselach ekranowych (po przeskalowaniu).
 *
 * <p>Model jest budowany w lokalnym układzie (a = wzdłuż ściany, d = w głąb pomieszczenia),
 * a następnie mapowany na ekran przez funkcję transformującą zależną od orientacji ściany.
 * Dzięki temu ta sama logika obsługuje ścianę poziomą (MAIN) i pionowe (LEFT/RIGHT) — różni
 * je wyłącznie transformacja (a,d)→(x,y).</p>
 *
 * <p>Założenia układu lokalnego: ramię główne biegnie wzdłuż ściany (`armMainPx` = widthA),
 * ramię boczne wychodzi prostopadle w głąb pomieszczenia (`armSidePx` = widthB) po stronie styku
 * (`junction`: START = przy a=0, END = przy a=armMain). Oba ramiona mają głębokość korpusu
 * (`depthPx` = 560 × skala) i nakładają się w kwadracie narożnym depth×depth.</p>
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

/**
 * Wejście dla ściany pionowej (LEFT/RIGHT). Ramię główne biegnie pionowo wzdłuż ściany,
 * korpus wychodzi w głąb pomieszczenia (LEFT → w prawo, RIGHT → w lewo).
 */
export interface VerticalLCornerInput {
  cabinetId: string;
  /** Strona ściany: 'LEFT' (korpus w prawo) albo 'RIGHT' (korpus w lewo). */
  side: 'LEFT' | 'RIGHT';
  /** Krawędź korpusu przy ścianie (px): dla LEFT lewa krawędź, dla RIGHT prawa. */
  wallX: number;
  /** Górna krawędź korpusu wzdłuż ściany (a=0), px. */
  anchorY: number;
  /** Długość ramienia głównego wzdłuż ściany (px) = widthA × skala. */
  armMainPx: number;
  /** Długość ramienia bocznego prostopadle do ściany (px) = widthB × skala. */
  armSidePx: number;
  /** Głębokość korpusu (px) = 560 × skala. */
  depthPx: number;
  /** Strona styku wzdłuż ściany: START = przy górze (a=0), END = przy dole (a=armMain). */
  junction: 'START' | 'END';
  /** TWO_DOORS → 2 łuki; BIFOLD/BLIND/inne → 1 łuk. */
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

/** Punkt ekranowy (px). */
interface ScreenPoint {
  x: number;
  y: number;
}

/** Transformacja lokalna (a = wzdłuż ściany, d = w głąb) → ekran (x, y). */
type LocalToScreen = (a: number, d: number) => ScreenPoint;

/** Lokalny opis łuku drzwi: punkty start/koniec + środek (róg wewnętrzny) + promień. */
interface LocalArc {
  id: string;
  startA: number;
  startD: number;
  endA: number;
  endD: number;
  centerA: number;
  centerD: number;
  radius: number;
}

/** Lokalny opis prostokąta bryły kolizyjnej (zakresy a×d). */
interface LocalRect {
  a0: number;
  a1: number;
  d0: number;
  d1: number;
}

/**
 * Buduje obrys „L" + łuki drzwi dla narożnika Type A na ścianie poziomej (MAIN).
 * Zwraca `null`, gdy ramiona nie wystają poza kwadrat narożny (degeneracja do prostokąta).
 *
 * <p>Mapowanie: junction 'LEFT' → ramię boczne przy a=0 (START), 'RIGHT' → przy a=armMain (END).
 * Transformacja pozioma: a biegnie w prawo (+x), d w głąb pomieszczenia (do góry ekranu, −y).</p>
 */
export function buildHorizontalLCornerShape(input: HorizontalLCornerInput): HorizontalLCornerShape | null {
  const transform: LocalToScreen = (a, d) => ({ x: input.x + a, y: input.wallY - d });
  return buildLCornerShape({
    cabinetId: input.cabinetId,
    armMainPx: input.armMainPx,
    armSidePx: input.armSidePx,
    depthPx: input.depthPx,
    junction: input.junction === 'LEFT' ? 'START' : 'END',
    doubleDoor: input.doubleDoor,
    transform
  });
}

/**
 * Buduje obrys „L" + łuki drzwi dla narożnika Type A na ścianie pionowej (LEFT/RIGHT).
 * Transformacja: a biegnie w dół (+y), d w głąb pomieszczenia (LEFT → +x, RIGHT → −x).
 */
export function buildVerticalLCornerShape(input: VerticalLCornerInput): HorizontalLCornerShape | null {
  const dir = input.side === 'LEFT' ? 1 : -1;
  const transform: LocalToScreen = (a, d) => ({ x: input.wallX + dir * d, y: input.anchorY + a });
  return buildLCornerShape({
    cabinetId: input.cabinetId,
    armMainPx: input.armMainPx,
    armSidePx: input.armSidePx,
    depthPx: input.depthPx,
    junction: input.junction,
    doubleDoor: input.doubleDoor,
    transform
  });
}

interface LCornerParams {
  cabinetId: string;
  armMainPx: number;
  armSidePx: number;
  depthPx: number;
  junction: 'START' | 'END';
  doubleDoor: boolean;
  transform: LocalToScreen;
}

/**
 * Rdzeń budujący geometrię „L" w lokalnych współrzędnych (a×d), niezależny od orientacji ściany.
 * Wszystkie punkty są mapowane na ekran przez `transform`, dzięki czemu łuki i prostokąty są
 * poprawne także po obrocie/odbiciu układu (sweep-flag łuku liczony w przestrzeni ekranu).
 */
function buildLCornerShape(params: LCornerParams): HorizontalLCornerShape | null {
  const { cabinetId, armMainPx, armSidePx, depthPx, junction, doubleDoor, transform } = params;

  // „L" jest widoczne tylko, gdy oba ramiona wystają poza kwadrat narożny depth×depth.
  if (!(armMainPx > depthPx) || !(armSidePx > depthPx)) {
    return null;
  }

  const depth = depthPx;
  const main = armMainPx;
  const side = armSidePx;
  const mainRadius = main - depth;
  const sideRadius = side - depth;

  let outline: Array<[number, number]>;
  let mainArm: LocalRect;
  let sideArm: LocalRect;
  let mainArc: LocalArc;
  let sideArc: LocalArc;

  if (junction === 'START') {
    const inner = depth; // róg wewnętrzny przy a=depth
    outline = [
      [0, 0], [0, side], [depth, side], [depth, depth], [main, depth], [main, 0]
    ];
    mainArm = { a0: 0, a1: main, d0: 0, d1: depth };
    sideArm = { a0: 0, a1: depth, d0: 0, d1: side };
    mainArc = {
      id: `${cabinetId}-corner-main`,
      startA: main, startD: depth, endA: inner, endD: depth + mainRadius,
      centerA: inner, centerD: depth, radius: mainRadius
    };
    sideArc = {
      id: `${cabinetId}-corner-side`,
      startA: depth, startD: side, endA: side, endD: depth,
      centerA: inner, centerD: depth, radius: sideRadius
    };
  } else {
    const inner = main - depth; // róg wewnętrzny przy a=main−depth
    outline = [
      [0, 0], [0, depth], [main - depth, depth], [main - depth, side], [main, side], [main, 0]
    ];
    mainArm = { a0: 0, a1: main, d0: 0, d1: depth };
    sideArm = { a0: main - depth, a1: main, d0: 0, d1: side };
    mainArc = {
      id: `${cabinetId}-corner-main`,
      startA: 0, startD: depth, endA: inner, endD: depth + mainRadius,
      centerA: inner, centerD: depth, radius: mainRadius
    };
    sideArc = {
      id: `${cabinetId}-corner-side`,
      startA: inner, startD: side, endA: main - side, endD: depth,
      centerA: inner, centerD: depth, radius: sideRadius
    };
  }

  const pathD = buildOutlinePath(outline, transform);

  const doorArcs: FloorPlanArc[] = [buildScreenArc(cabinetId, mainArc, transform)];
  if (doubleDoor) {
    doorArcs.push(buildScreenArc(cabinetId, sideArc, transform));
  }

  const blockingRects = [toScreenRect(mainArm, transform), toScreenRect(sideArm, transform)];

  return { pathD, doorArcs, blockingRects };
}

function buildOutlinePath(points: Array<[number, number]>, transform: LocalToScreen): string {
  return points
    .map(([a, d], index) => {
      const p = transform(a, d);
      return `${index === 0 ? 'M' : 'L'} ${p.x},${p.y}`;
    })
    .join(' ') + ' Z';
}

function buildScreenArc(cabinetId: string, arc: LocalArc, transform: LocalToScreen): FloorPlanArc {
  const s = transform(arc.startA, arc.startD);
  const e = transform(arc.endA, arc.endD);
  const c = transform(arc.centerA, arc.centerD);
  // Sweep-flag w przestrzeni ekranu (y w dół): minorowy łuk 90° wybrzuszony od środka „na zewnątrz".
  const crossZ = (s.x - c.x) * (e.y - c.y) - (s.y - c.y) * (e.x - c.x);
  const sweep = crossZ > 0 ? 1 : 0;
  const pathD =
    `M ${s.x},${s.y} A ${arc.radius},${arc.radius} 0 0 ${sweep} ${e.x},${e.y} L ${c.x},${c.y} Z`;

  // Bounding box łuku: róg zewnętrzny O = S + E − C domyka kwadrat ćwiartki.
  const o: ScreenPoint = { x: s.x + e.x - c.x, y: s.y + e.y - c.y };
  const bboxX = Math.min(s.x, e.x, o.x);
  const bboxY = Math.min(s.y, e.y, o.y);
  const bboxW = Math.max(s.x, e.x, o.x) - bboxX;
  const bboxH = Math.max(s.y, e.y, o.y) - bboxY;

  return {
    id: arc.id,
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

function toScreenRect(rect: LocalRect, transform: LocalToScreen): LCornerRect {
  const corners = [
    transform(rect.a0, rect.d0),
    transform(rect.a1, rect.d0),
    transform(rect.a0, rect.d1),
    transform(rect.a1, rect.d1)
  ];
  const xs = corners.map(p => p.x);
  const ys = corners.map(p => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
