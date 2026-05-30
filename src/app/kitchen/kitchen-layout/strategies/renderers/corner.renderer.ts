import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createVerticalHandle } from '../cabinet-svg-helpers';

/**
 * Renderer szafki narożnej w widoku od frontu (elewacja) — Faza 11.4 (VIZ-CORNER-FRONT).
 *
 * <p>Obsługuje oba warianty fizyczne narożnika oraz oba położenia
 * (dolna i górna — `UPPER_CORNER` jako wariant `CORNER_CABINET` przez flagę `isUpperCorner`):</p>
 * <ul>
 *   <li><b>Type A — TWO_DOORS</b>: dwoje drzwi spotykających się w środku (zawiasy na zewnątrz).</li>
 *   <li><b>Type A — BIFOLD</b>: harmonijka — dwa wąskie skrzydła z linią złamania (oba zawiasy po jednej stronie).</li>
 *   <li><b>Type B — blind</b>: front uchylny (otwierany) + ślepy panel stały oddzielony pionową linią.</li>
 * </ul>
 *
 * <p>Gdy brak `cornerConfig` (np. stary stan bez metadanych) renderer degraduje do dwojga drzwi.</p>
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

  if (corner?.openingType === 'BIFOLD') {
    renderBifoldCorner(ctx, fronts, handles);
    return;
  }

  renderTwoDoorCorner(ctx, fronts, handles);
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

/** Type A — harmonijka: dwa wąskie skrzydła + linia złamania. */
function renderBifoldCorner(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap } = ctx;
  const innerY = bodyY + gap;
  const innerH = bodyHeight - gap * 2;
  const panelWidth = (displayWidth - gap * 3) / 2;

  // Lewe skrzydło harmonijki — zawiasy po lewej.
  fronts.push({
    type: 'DOOR_SINGLE',
    x: displayX + gap,
    y: innerY,
    width: panelWidth,
    height: innerH,
    hingesSide: 'LEFT'
  });

  // Prawe skrzydło harmonijki — zawiasy również po lewej (składanie w jedną stronę).
  fronts.push({
    type: 'DOOR_SINGLE',
    x: displayX + gap + panelWidth + gap,
    y: innerY,
    width: panelWidth,
    height: innerH,
    hingesSide: 'LEFT'
  });

  // Linia złamania pomiędzy skrzydłami.
  fronts.push({
    type: 'VERT_DIVIDER',
    x: displayX + gap + panelWidth + gap / 2,
    y: innerY,
    width: 0,
    height: innerH
  });

  // Uchwyt przy zewnętrznej (prawej) krawędzi harmonijki.
  handles.push(createVerticalHandle(
    displayX + displayWidth - gap - 4,
    innerY + 3,
    innerH - 6
  ));
}

/** Type A — dwoje drzwi spotykających się w środku (zawiasy na zewnątrz). */
function renderTwoDoorCorner(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap } = ctx;
  const innerY = bodyY + gap;
  const innerH = bodyHeight - gap * 2;
  const doorWidth = (displayWidth - gap * 3) / 2;

  fronts.push({
    type: 'DOOR_SINGLE',
    x: displayX + gap,
    y: innerY,
    width: doorWidth,
    height: innerH,
    hingesSide: 'LEFT'
  });

  fronts.push({
    type: 'DOOR_SINGLE',
    x: displayX + gap + doorWidth + gap,
    y: innerY,
    width: doorWidth,
    height: innerH,
    hingesSide: 'RIGHT'
  });

  // Uchwyty spotykające się w środku szafki.
  handles.push(createVerticalHandle(displayX + gap + doorWidth - 3, innerY + 3, innerH - 6));
  handles.push(createVerticalHandle(displayX + gap + doorWidth + gap + 3, innerY + 3, innerH - 6));
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
