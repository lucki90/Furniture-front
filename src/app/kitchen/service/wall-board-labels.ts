import { COUNTERTOP_MATERIAL_OPTIONS } from '../model/countertop.model';
import { PLINTH_MATERIAL_OPTIONS } from '../model/plinth.model';

/**
 * Kategorie tłumaczeń z nazwami materiałów blatu i cokołu. Te same klucze (`COUNTERTOP_MATERIAL.LAMINATE`,
 * `PLINTH_MATERIAL.PVC`) backend tłumaczy w słownikach panelu ściany, więc BOM i wybór materiału mówią jednym głosem.
 */
export const WALL_BOARD_MATERIAL_CATEGORIES = ['COUNTERTOP_MATERIAL', 'PLINTH_MATERIAL'] as const;

/** Czytelny opis płyty dodatku ściany: etykieta pozycji („Blat — laminat”) i sama nazwa materiału („Laminat”). */
export interface WallBoardLabel {
  boardLabel: string;
  materialName: string;
}

/** Etykieta formatki blatu, np. „Blat — laminat”. */
export function countertopBoardLabel(
  materialType: string | null | undefined,
  translations?: Record<string, string>
): WallBoardLabel {
  const fallback = COUNTERTOP_MATERIAL_OPTIONS.find(option => option.value === materialType)?.label;
  return buildWallBoardLabel('Blat', 'COUNTERTOP_MATERIAL', materialType, fallback, translations);
}

/** Etykieta odcinka cokołu, np. „Cokół — PVC”. */
export function plinthBoardLabel(
  materialType: string | null | undefined,
  translations?: Record<string, string>
): WallBoardLabel {
  const fallback = PLINTH_MATERIAL_OPTIONS.find(option => option.value === materialType)?.label;
  return buildWallBoardLabel('Cokół', 'PLINTH_MATERIAL', materialType, fallback, translations);
}

function buildWallBoardLabel(
  elementName: string,
  category: string,
  materialType: string | null | undefined,
  fallbackName: string | undefined,
  translations: Record<string, string> | undefined
): WallBoardLabel {
  if (!materialType) {
    return { boardLabel: elementName, materialName: '' };
  }

  // Brak tłumaczenia (słownik niezaładowany) — etykieta opcji z frontu, a nieznany kod zostaje kodem.
  const name = translations?.[`${category}.${materialType}`] ?? fallbackName ?? materialType;
  const materialName = withoutDefaultOptionMarker(name);
  return { boardLabel: `${elementName} — ${lowerFirstLetter(materialName)}`, materialName };
}

/** „Laminat (standard)” → „Laminat”: dopisek oznacza domyślną opcję wyboru, nie jest częścią nazwy materiału. */
function withoutDefaultOptionMarker(name: string): string {
  return name.replace(/\s*\(standard\)\s*$/i, '');
}

/** „Laminat” → „laminat”; skróty („PVC”, „MDF laminowany”) zostają bez zmian. */
function lowerFirstLetter(name: string): string {
  return /^\p{Lu}\p{Ll}/u.test(name) ? name.charAt(0).toLocaleLowerCase('pl') + name.slice(1) : name;
}
