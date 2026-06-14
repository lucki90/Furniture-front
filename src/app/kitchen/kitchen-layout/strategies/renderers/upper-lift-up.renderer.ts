import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createHorizontalHandle } from '../cabinet-svg-helpers';
import { renderSingleDoor } from './single-door.renderer';

/** Minimalna widoczna przerwa (px) między skrzydłami frontu składanego HF top. */
const HF_VISIBLE_GAP_PX = 2;
/** Klamry proporcji górnego skrzydła — oba fronty zawsze widoczne w elewacji. */
const HF_MIN_UPPER_FRACTION = 0.15;
const HF_MAX_UPPER_FRACTION = 0.85;

/**
 * Renderuje front szafki otwieranej do góry (UPPER_LIFT_UP).
 *
 * <p>Dla mechanizmu Aventos HF top front jest składany z <strong>dwóch skrzydeł</strong>
 * (jedno nad drugim) — rysujemy dwa fronty rozdzielone widoczną przerwą (szczeliną), aby
 * w widoku od frontu było widać podział. Podział: asymetryczny po {@code hfUpperFrontHeightMm}
 * (proporcja względem wysokości szafki), symetryczny 50/50 gdy pole puste.</p>
 *
 * <p>Pozostałe mechanizmy (GAS_GTV, Aventos HK top / HK-S) to pojedyncza klapa — delegujemy do
 * {@link renderSingleDoor}.</p>
 */
export function renderUpperLiftUp(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  if (!ctx.liftConfig?.hfFolding) {
    renderSingleDoor(ctx, fronts, handles);
    return;
  }

  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap } = ctx;
  const totalMm = ctx.liftConfig.cabinetHeightMm ?? 0;
  const upperMm = ctx.liftConfig.upperFrontHeightMm;

  const upperFraction = (upperMm && totalMm > 0)
    ? Math.min(HF_MAX_UPPER_FRACTION, Math.max(HF_MIN_UPPER_FRACTION, upperMm / totalMm))
    : 0.5;

  const visibleGap = Math.max(HF_VISIBLE_GAP_PX, gap * 2);
  const gapHalf = visibleGap / 2;
  const splitY = bodyY + Math.round(bodyHeight * upperFraction);

  const frontX = displayX + gap;
  const frontW = displayWidth - gap * 2;

  // Górne skrzydło
  const upperY = bodyY + gap;
  const upperH = Math.max(1, splitY - gapHalf - upperY);
  fronts.push({ type: 'DOOR_SINGLE', x: frontX, y: upperY, width: frontW, height: upperH });

  // Dolne skrzydło
  const lowerY = splitY + gapHalf;
  const lowerH = Math.max(1, bodyY + bodyHeight - gap - lowerY);
  fronts.push({ type: 'DOOR_SINGLE', x: frontX, y: lowerY, width: frontW, height: lowerH });

  // Uchwyt przy dolnej krawędzi dolnego skrzydła (chwyt do podniesienia klapy)
  handles.push(createHorizontalHandle(
    displayX + displayWidth / 2,
    lowerY + lowerH - 3,
    Math.min(frontW / 2 - 2, 12)
  ));
}
