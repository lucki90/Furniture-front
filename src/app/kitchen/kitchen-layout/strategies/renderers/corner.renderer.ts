import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createVerticalHandle } from '../cabinet-svg-helpers';

/**
 * Renderer szafki narożnej w widoku od frontu (elewacja) — Faza 11.4 (VIZ-CORNER-FRONT),
 * przeprojektowany 2026-06-05 (VIZ-CORNER-L-FRONT).
 *
 * <p>Obsługuje oba warianty fizyczne narożnika oraz oba położenia
 * (dolna i górna — `UPPER_CORNER` jako wariant `CORNER_CABINET` przez flagę `isUpperCorner`):</p>
 * <ul>
 *   <li><b>Type A — L-kształt (TWO_DOORS / BIFOLD)</b>: w elewacji widać <b>tylko jeden</b> front czołowy
 *       (ramię główne, proporcja widthA/(widthA+widthB)). Drugi front jest prostopadły do widza,
 *       więc widać jedynie jego krawędź (pionowa linia), a reszta szerokości to <b>bok szafki</b>
 *       (korpus prześwituje — bez prostokąta frontu). Strona boku = strona styku (`handedness`).</li>
 *   <li><b>Type B — blind</b>: front uchylny (otwierany) + ślepy panel stały oddzielony pionową linią.</li>
 * </ul>
 *
 * <p>Gdy brak `cornerConfig` (np. stary stan bez metadanych) renderer degraduje do widoku L-kształtu.</p>
 */
export function renderCorner(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const corner = ctx.cornerConfig;

  if (corner?.blind) {
    renderBlindCorner(ctx, fronts, handles);
    return;
  }

  renderLShapeCorner(ctx, fronts, handles);
}

/** Type B (ślepy narożnik): front uchylny po stronie aktywnej + ślepy panel stały. */
function renderBlindCorner(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap, cornerConfig } = ctx;
  const innerY = bodyY + gap;
  const innerH = bodyHeight - gap * 2;
  const usableWidth = displayWidth - gap * 2;

  const activeWidth = resolveActiveFrontWidth(usableWidth, cornerConfig?.widthAMm, cornerConfig?.frontUchylnyWidthMm);
  const blindWidth = usableWidth - activeWidth;
  const activeOnRight = cornerConfig?.handedness === 'RIGHT';

  const activeX = activeOnRight ? displayX + gap + blindWidth : displayX + gap;
  const blindX = activeOnRight ? displayX + gap : displayX + gap + activeWidth;

  // Ślepy panel stały (bez uchwytu) — pełny prostokąt frontu.
  fronts.push({
    type: 'DOOR_SINGLE',
    x: blindX,
    y: innerY,
    width: blindWidth,
    height: innerH
  });

  // Front uchylny (otwierany) — zawiasy po stronie zewnętrznej narożnika.
  fronts.push({
    type: 'DOOR_SINGLE',
    x: activeX,
    y: innerY,
    width: activeWidth,
    height: innerH,
    hingesSide: activeOnRight ? 'RIGHT' : 'LEFT'
  });

  // Pionowa linia rozdzielająca front uchylny od ślepego panelu.
  fronts.push({
    type: 'VERT_DIVIDER',
    x: activeOnRight ? activeX : displayX + gap + activeWidth,
    y: innerY,
    width: 0,
    height: innerH
  });

  // Uchwyt na froncie uchylnym — przy krawędzi styku ze ślepym panelem.
  const handleX = activeOnRight ? activeX + 4 : activeX + activeWidth - 4;
  handles.push(createVerticalHandle(handleX, innerY + 3, innerH - 6));
}

/**
 * Type A (L-kształt) — elewacja: JEDEN front czołowy + krawędź frontu prostopadłego + bok szafki.
 *
 * <p>Front czołowy (ramię główne) zajmuje proporcję widthA/(widthA+widthB) szerokości użytecznej.
 * Pozostała część to bok szafki (korpus prześwituje — bez prostokąta frontu), z pionową linią
 * oznaczającą krawędź drugiego, prostopadłego frontu. Strona boku/styku = `handedness`
 * (gdy brak — domyślnie po prawej). Zawias frontu czołowego po zewnętrznej (wolnej) krawędzi,
 * uchwyt przy krawędzi styku z bokiem (narożnik wewnętrzny). Zachowanie identyczne dla
 * TWO_DOORS i BIFOLD — w widoku od frontu oba wyglądają tak samo (różnica jest w rzucie z góry).</p>
 */
function renderLShapeCorner(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap, cornerConfig } = ctx;
  const innerY = bodyY + gap;
  const innerH = bodyHeight - gap * 2;
  const usableWidth = displayWidth - gap * 2;

  const doorWidth = resolveFrontalDoorWidth(usableWidth, cornerConfig?.widthAMm, cornerConfig?.widthBMm);
  // Strona styku (ramienia prostopadłego / boku szafki). Domyślnie po prawej, gdy brak danych.
  const junctionOnRight = cornerConfig?.handedness !== 'LEFT';

  // Front czołowy po stronie wolnej (przeciwnej do styku). Bok szafki (korpus) po stronie styku.
  const doorX = junctionOnRight ? displayX + gap : displayX + gap + (usableWidth - doorWidth);
  fronts.push({
    type: 'DOOR_SINGLE',
    x: doorX,
    y: innerY,
    width: doorWidth,
    height: innerH,
    hingesSide: junctionOnRight ? 'LEFT' : 'RIGHT'
  });

  // Pionowa linia = widoczna krawędź drugiego, prostopadłego frontu (granica front czołowy | bok).
  const dividerX = junctionOnRight ? doorX + doorWidth : doorX;
  fronts.push({
    type: 'VERT_DIVIDER',
    x: dividerX,
    y: innerY,
    width: 0,
    height: innerH
  });

  // Uchwyt przy krawędzi styku (narożnik wewnętrzny), po stronie boku.
  const handleX = junctionOnRight ? doorX + doorWidth - 4 : doorX + 4;
  handles.push(createVerticalHandle(handleX, innerY + 3, innerH - 6));
}

/**
 * Wylicza szerokość frontu uchylnego (w px) jako proporcję frontUchylny/widthA,
 * z bezpiecznymi granicami 15%–85% i fallbackiem do 45% gdy brak danych.
 */
function resolveActiveFrontWidth(
  usableWidth: number,
  widthAMm?: number,
  frontUchylnyWidthMm?: number
): number {
  const DEFAULT_RATIO = 0.45;
  const MIN_RATIO = 0.15;
  const MAX_RATIO = 0.85;

  let ratio = DEFAULT_RATIO;
  if (widthAMm && widthAMm > 0 && frontUchylnyWidthMm && frontUchylnyWidthMm > 0) {
    ratio = frontUchylnyWidthMm / widthAMm;
  }
  ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
  return usableWidth * ratio;
}

/**
 * Wylicza szerokość frontu czołowego (w px) jako proporcję widthA/(widthA+widthB),
 * z bezpiecznymi granicami 30%–85% i fallbackiem do 60% gdy brak danych.
 */
function resolveFrontalDoorWidth(
  usableWidth: number,
  widthAMm?: number,
  widthBMm?: number
): number {
  const DEFAULT_RATIO = 0.6;
  const MIN_RATIO = 0.3;
  const MAX_RATIO = 0.85;

  let ratio = DEFAULT_RATIO;
  if (widthAMm && widthAMm > 0 && widthBMm && widthBMm > 0) {
    ratio = widthAMm / (widthAMm + widthBMm);
  }
  ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
  return usableWidth * ratio;
}
