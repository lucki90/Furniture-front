/**
 * Fronty szuflad wysyłane w `drawerRequest.drawerFrontDetails`. Wysokości użytkownika niesie tylko układ CUSTOM;
 * dla EQUAL i MIXED_LOW_TOP backend sam wylicza fronty, więc lista nie jest wysyłana.
 *
 * Wspólna reguła kalkulacji szafki z formularza i zapisu projektu — oba requesty muszą opisywać tę samą szafkę.
 */
export function buildCustomDrawerFrontDetails(
  layoutType: string | null | undefined,
  heightsMm: ReadonlyArray<number | null | undefined> | null | undefined
): Array<{ height: number; name: null }> | null {
  if (layoutType !== 'CUSTOM' || !Array.isArray(heightsMm) || heightsMm.length === 0) {
    return null;
  }
  return heightsMm
    .filter((height): height is number => typeof height === 'number' && Number.isFinite(height) && height > 0)
    .map(height => ({ height, name: null }));
}
