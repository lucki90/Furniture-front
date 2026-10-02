import { KitchenCabinetType } from '../../cabinet-form/model/kitchen-cabinet-type';
import { getCabinetZone, isFreestandingAppliance, KitchenCabinet } from '../../model/kitchen-state.model';
import { CornerGeometrySettings, CornerLevel } from './corner-layout.model';

const FALLBACK_FRONT_THICKNESS_MM = 18;
const FALLBACK_FILLER_WIDTH_MM = 50;
const FALLBACK_LYZWA_RECESS_MM = 30;

/**
 * Ustawienia geometrii narożnika z ustawień projektu — jedyne miejsce fallbacków na froncie.
 * Luz narożny pochodzi z tego samego ustawienia co szerokość blendy. Zerowa blenda jest świadomym wyborem,
 * zerowa grubość frontu oznacza brak wartości. Spójne z backendem: `CornerGeometrySettings.from()`.
 */
export function createCornerGeometrySettings(
  fillerWidthMm: number | null | undefined,
  frontBoardThicknessMm: number | null | undefined,
  lyzwaRecessMm?: number | null
): CornerGeometrySettings {
  const filler = typeof fillerWidthMm === 'number' && fillerWidthMm >= 0 ? fillerWidthMm : FALLBACK_FILLER_WIDTH_MM;
  const front = typeof frontBoardThicknessMm === 'number' && frontBoardThicknessMm > 0
    ? frontBoardThicknessMm
    : FALLBACK_FRONT_THICKNESS_MM;
  const recess = typeof lyzwaRecessMm === 'number' && lyzwaRecessMm >= 0 ? lyzwaRecessMm : FALLBACK_LYZWA_RECESS_MM;
  return {
    defaultFrontThicknessMm: front,
    cornerClearanceMm: filler,
    enclosureFillerWidthMm: filler,
    lyzwaRecessMm: recess
  };
}

/**
 * Grubość frontu wystającego przed korpus. Zero dla frontu wpuszczanego, szafek otwartych i wolnostojącego AGD.
 * Spójne z backendem: `CornerReachResolver.frontProtrusionMm()`.
 */
export function cabinetFrontProtrusionMm(cabinet: KitchenCabinet, settings: CornerGeometrySettings): number {
  if (cabinet.frontMountingType === 'INSET' || hasNoFront(cabinet.type)) {
    return 0;
  }
  const thickness = cabinet.materialRequest?.frontBoardThickness;
  return typeof thickness === 'number' && thickness > 0 ? thickness : settings.defaultFrontThicknessMm;
}

/** Zasięg szafki w głąb pomieszczenia: głębokość korpusu i wystający front. */
export function cabinetReachMm(cabinet: KitchenCabinet, settings: CornerGeometrySettings): number {
  return cabinet.depth + cabinetFrontProtrusionMm(cabinet, settings);
}

/** Czy szafka należy do poziomu narożnika (zabudowa pełnej wysokości należy do obu). */
export function isCabinetOnCornerLevel(cabinet: KitchenCabinet, level: CornerLevel): boolean {
  const zone = getCabinetZone(cabinet);
  if (zone === 'FULL') {
    return true;
  }
  return level === 'BASE' ? zone === 'BOTTOM' : zone === 'TOP';
}

/** Największy zasięg szafek ściany na danym poziomie; 0, gdy ściana nie ma szafek tego poziomu. */
export function maxCabinetReachMm(
  cabinets: readonly KitchenCabinet[],
  level: CornerLevel,
  settings: CornerGeometrySettings
): number {
  return cabinets
    .filter(cabinet => isCabinetOnCornerLevel(cabinet, level))
    .reduce((max, cabinet) => Math.max(max, cabinetReachMm(cabinet, settings)), 0);
}

function hasNoFront(type: KitchenCabinetType): boolean {
  return type === KitchenCabinetType.BASE_OPEN
    || type === KitchenCabinetType.UPPER_OPEN_SHELF
    || isFreestandingAppliance(type);
}
