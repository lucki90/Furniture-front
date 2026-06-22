export type CargoVariant = 'MECHANISM' | 'DRAWERS';
export type CargoBrand = 'BLUM' | 'GTV';

export const CARGO_VARIANT_OPTIONS: ReadonlyArray<{ value: CargoVariant; label: string }> = [
  { value: 'MECHANISM', label: 'Mechanizm cargo' },
  { value: 'DRAWERS', label: 'Cargo z szufladami' }
];

export const CARGO_BRAND_OPTIONS: ReadonlyArray<{ value: CargoBrand; label: string }> = [
  { value: 'BLUM', label: 'Blum' },
  { value: 'GTV', label: 'GTV' }
];

export interface CargoMechanismWidthProfile {
  nominalWidthMm: number;
  minWidthMm: number;
  maxWidthMm: number;
}

export const CARGO_MECHANISM_WIDTH_PROFILES: readonly CargoMechanismWidthProfile[] = [
  { nominalWidthMm: 150, minWidthMm: 150, maxWidthMm: 200 },
  { nominalWidthMm: 200, minWidthMm: 200, maxWidthMm: 300 },
  { nominalWidthMm: 300, minWidthMm: 300, maxWidthMm: 400 },
  { nominalWidthMm: 400, minWidthMm: 400, maxWidthMm: 500 },
  { nominalWidthMm: 500, minWidthMm: 500, maxWidthMm: 600 },
  { nominalWidthMm: 600, minWidthMm: 600, maxWidthMm: 600 }
] as const;

const NEAR_EDGE_TIGHT_THRESHOLD_MM = 5;
const NEAR_EDGE_LOOSE_THRESHOLD_MM = 10;
const NEAR_EDGE_TIGHT_PENALTY = 10;
const NEAR_EDGE_LOOSE_PENALTY = 5;

export function isCargoMechanismNominalWidth(widthMm: number): boolean {
  return CARGO_MECHANISM_WIDTH_PROFILES.some(profile => profile.nominalWidthMm === widthMm);
}

export function pickCargoMechanismProfileForWidth(widthMm: number): CargoMechanismWidthProfile {
  const candidates = CARGO_MECHANISM_WIDTH_PROFILES
    .filter(profile => widthMm >= profile.minWidthMm && widthMm <= profile.maxWidthMm)
    .map(profile => {
      const distanceToNominal = Math.abs(profile.nominalWidthMm - widthMm);
      const distanceToNearestEdge = Math.min(
        Math.abs(widthMm - profile.minWidthMm),
        Math.abs(profile.maxWidthMm - widthMm)
      );
      const penaltyIfNearEdge = distanceToNearestEdge <= NEAR_EDGE_TIGHT_THRESHOLD_MM
        ? NEAR_EDGE_TIGHT_PENALTY
        : distanceToNearestEdge <= NEAR_EDGE_LOOSE_THRESHOLD_MM
          ? NEAR_EDGE_LOOSE_PENALTY
          : 0;
      return {
        profile,
        score: distanceToNominal + penaltyIfNearEdge
      };
    })
    .sort((a, b) => a.score - b.score || a.profile.nominalWidthMm - b.profile.nominalWidthMm);

  if (candidates.length > 0) {
    return candidates[0].profile;
  }

  if (widthMm < CARGO_MECHANISM_WIDTH_PROFILES[0].minWidthMm) {
    return CARGO_MECHANISM_WIDTH_PROFILES[0];
  }

  return CARGO_MECHANISM_WIDTH_PROFILES[CARGO_MECHANISM_WIDTH_PROFILES.length - 1];
}

/**
 * Oblicza podpowiedź ostrzegawczą dla szerokości szafki cargo.
 * Zwraca null gdy brak ostrzeżenia (dobry wymiar lub nieznana szerokość).
 */
export function getCargoWidthHint(widthMm: number, variant: CargoVariant | string | null): string | null {
  if (!widthMm || widthMm <= 0) return null;
  if (variant === 'MECHANISM') {
    if (isCargoMechanismNominalWidth(widthMm)) return null;
    return 'Uwaga: dla tej szerokości standardowy mechanizm cargo może nie pasować. Upewnij się u producenta albo wybierz wariant cargo z szufladami.';
  }
  if (variant === 'DRAWERS') {
    if (widthMm <= 200) {
      return 'Uwaga: przy szerokości 200 mm cargo z szufladami jest technicznie możliwe, ale zwykle bardzo mało użytkowe. Rozważ mechanizm cargo albo inną szafkę.';
    }
    if (widthMm < 250) {
      return 'Uwaga: przy tej szerokości szuflady wewnętrzne będą bardzo wąskie. Upewnij się, że taki wariant będzie praktyczny.';
    }
  }
  return null;
}
