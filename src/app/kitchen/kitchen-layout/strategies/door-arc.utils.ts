/**
 * Narzędzia do wizualizacji promienia otwarcia drzwi (Faza 13.2).
 *
 * Funkcje czyste — brak zależności Angular, łatwe do testowania jednostkowego.
 *
 * Konwencja SVG (widok frontowy — elewacja ściany, Y rośnie w dół):
 * - Łuk otwarcia drzwi rysowany jest w DOLNEJ części skrzydła drzwi.
 * - Centrum łuku = dolny narożnik po stronie zawiasów.
 * - Promień = szerokość frontu (doorWidth).
 * - Kąt 90° (ćwierćokrąg) — standardowy kąt pełnego otwarcia.
 *
 * @example
 * ```
 * Zawias po LEWEJ (hingesSide='LEFT'):
 *   Centrum = (front.x, front.y + front.height)  [dolny-lewy narożnik]
 *   Łuk: od (front.x + width, front.y+height) do (front.x, front.y+height-width)
 *
 * Zawias po PRAWEJ (hingesSide='RIGHT'):
 *   Centrum = (front.x + front.width, front.y + front.height)  [dolny-prawy narożnik]
 *   Łuk: od (front.x, front.y+height) do (front.x+width, front.y+height-width)
 * ```
 */

import { DisplayFront } from './cabinet-render-context';

/** Prostokąt bounding box w przestrzeni SVG. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Wynik kalkulacji łuku otwarcia drzwi dla jednego frontu. */
export interface DoorArcData {
  /** SVG path d="M…A…" gotowy do wstawienia w <path [attr.d]="arc.pathD"> */
  pathD: string;
  /** Bounding box łuku — używany do detekcji kolizji z sąsiednimi szafkami. */
  arcBoundingBox: Rect;
  /**
   * Czy łuk koliduje z sąsiednią szafką (arcBoundingBox ∩ sąsiedni rect ≠ ∅).
   * Ustawiany przez detectArcCollisions() po wstępnym obliczeniu łuku.
   */
  hasCollision: boolean;
  /** Id szafki, z którą wykryto kolizję (lub undefined gdy brak). */
  collisionCabinetId?: string;
  /** Strona zawiasów — przydatna do renderowania (klasy CSS, opis). */
  hingesSide: 'LEFT' | 'RIGHT';
}

/**
 * Oblicza SVG path i bounding box łuku otwarcia drzwi dla jednego frontu.
 *
 * Jeśli front nie ma `hingesSide` (np. typ OPEN lub szuflada), zwraca null.
 *
 * @param front         DisplayFront z danymi frontu (x, y, width, height, hingesSide)
 * @param openingAngle  Kąt otwarcia w stopniach — zawsze 90 (pełne otwarcie zawiasów)
 */
export function calculateDoorArc(
  front: DisplayFront,
  openingAngle: number = 90
): DoorArcData | null {
  if (!front.hingesSide) return null;
  // Drzwi muszą mieć sensowne wymiary
  if (front.width <= 0 || front.height <= 0) return null;

  const r = front.width;   // promień = szerokość frontu (w px)
  const { x, y, height } = front;

  // Punkt startu łuku (dolny narożnik po stronie WOLNEJ — naprzeciwko zawiasów)
  // i punkt końca łuku (dolny narożnik po stronie ZAWIASÓW przesunięty o r w górę)
  let startX: number, startY: number;
  let endX: number, endY: number;
  let cx: number, cy: number;  // centrum łuku (dolny narożnik po stronie zawiasów)
  let sweepFlag: 0 | 1;        // SVG arc: 0=counter-clockwise, 1=clockwise

  const bottomY = y + height;

  if (front.hingesSide === 'LEFT') {
    // Zawias po lewej → centrum = dolny-lewy narożnik
    cx = x;
    cy = bottomY;
    startX = x + r;   // prawy dolny narożnik (wolna krawędź)
    startY = bottomY;
    endX = x;
    endY = bottomY - r; // r mm powyżej centrum
    sweepFlag = 0;       // łuk idzie w górę (counter-clockwise w SVG)
  } else {
    // Zawias po prawej → centrum = dolny-prawy narożnik
    cx = x + r;
    cy = bottomY;
    startX = x;          // lewy dolny narożnik (wolna krawędź)
    startY = bottomY;
    endX = x + r;
    endY = bottomY - r;
    sweepFlag = 1;        // łuk idzie w górę (clockwise w SVG)
  }

  // Ograniczamy kąt do 90° (pełne otwarcie = ćwierćokrąg)
  // TODO: przy openingAngle < 90° — interpoluj endX/endY po okręgu (nie potrzebne w 13.2)
  const _ = openingAngle; // reserved for future partial-angle support

  const pathD = `M ${startX.toFixed(1)},${startY.toFixed(1)} `
    + `A ${r.toFixed(1)},${r.toFixed(1)} 0 0 ${sweepFlag} `
    + `${endX.toFixed(1)},${endY.toFixed(1)} `
    + `L ${cx.toFixed(1)},${cy.toFixed(1)} Z`;

  // Bounding box łuku — prostokąt obejmujący całą strefę otwarcia
  const bbX = front.hingesSide === 'LEFT' ? x : x;
  const bbY = bottomY - r;
  const arcBoundingBox: Rect = {
    x: bbX,
    y: bbY,
    width: r,
    height: r
  };

  return {
    pathD,
    arcBoundingBox,
    hasCollision: false, // uzupełniany przez detectArcCollisions()
    hingesSide: front.hingesSide
  };
}

/**
 * Wykrywa kolizje łuków otwarcia drzwi z prostokątami sąsiednich szafek.
 *
 * Mutuje `arcs[].hasCollision` i `arcs[].collisionCabinetId` w miejscu.
 * Czysta pod względem braku efektów zewnętrznych (tylko parametr `arcs` jest mutowany).
 *
 * @param arcs       Lista łuków obliczona przez calculateDoorArc()
 * @param cabinetRects  Prostokąty sąsiednich szafek (id + Rect w przestrzeni SVG)
 */
export function detectArcCollisions(
  arcs: DoorArcData[],
  cabinetRects: Array<{ id: string; rect: Rect }>
): void {
  for (const arc of arcs) {
    arc.hasCollision = false;
    arc.collisionCabinetId = undefined;

    for (const cabinet of cabinetRects) {
      if (rectsOverlap(arc.arcBoundingBox, cabinet.rect)) {
        arc.hasCollision = true;
        arc.collisionCabinetId = cabinet.id;
        break;
      }
    }
  }
}

/**
 * Sprawdza czy dwa prostokąty osi (AABB) nachodzą na siebie.
 * Nakładanie tylko na krawędzi (touching) NIE jest kolizją.
 */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
