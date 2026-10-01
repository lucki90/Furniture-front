import { WallType } from '../model/kitchen-project.model';

/**
 * Orientacja ścian pionowych (LEFT/RIGHT) na rzucie z góry.
 *
 * Elewacja pokazuje ścianę w widoku z wnętrza kuchni: START ściany (x = 0) leży po lewej. Na rzucie ściana MAIN
 * jest na dole, więc:
 * - ściana LEFT ma START na górze rzutu, a jej END styka się z MAIN,
 * - ściana RIGHT ma START na dole rzutu, przy narożniku z MAIN.
 *
 * Kierunek „wzdłuż ściany” jest więc dla ściany RIGHT odwrócony względem osi Y ekranu. Konwencja jest spójna
 * z topologią ścian: MAIN.START ↔ LEFT.END, MAIN.END ↔ RIGHT.START (`wall-topology.resolver.ts`).
 */
export function isReversedAlongPlanY(wallType: WallType): boolean {
  return wallType === 'RIGHT';
}

/**
 * Górna krawędź (px) odcinka ściany pionowej, który zaczyna się `startPx` od START ściany i ma długość `lengthPx`.
 */
export function verticalSegmentTopPx(
  wallType: WallType,
  wallTopPx: number,
  wallLengthPx: number,
  startPx: number,
  lengthPx: number
): number {
  return isReversedAlongPlanY(wallType)
    ? wallTopPx + wallLengthPx - startPx - lengthPx
    : wallTopPx + startPx;
}

/**
 * Pod-przedział biegu frontu `[lo, hi]` liczony od lewej krawędzi elewacji szafki, przeliczony na ułamki wzdłuż
 * osi Y ekranu, liczone od górnej krawędzi prostokąta szafki na rzucie.
 */
export function planSpanAlongY(wallType: WallType, lo: number, hi: number): { top: number; bottom: number } {
  return isReversedAlongPlanY(wallType)
    ? { top: 1 - hi, bottom: 1 - lo }
    : { top: lo, bottom: hi };
}

/**
 * Strona szafki w elewacji (LEFT = od strony START ściany) przeliczona na koniec prostokąta szafki na rzucie:
 * `START` = górna krawędź, `END` = dolna krawędź.
 */
export function planEndForElevationSide(wallType: WallType, side: 'LEFT' | 'RIGHT'): 'START' | 'END' {
  const towardsWallStart = side === 'LEFT';
  return towardsWallStart !== isReversedAlongPlanY(wallType) ? 'START' : 'END';
}
