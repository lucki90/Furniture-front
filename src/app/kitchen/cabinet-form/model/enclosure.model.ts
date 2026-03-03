/**
 * Typ obudowy bocznej szafki.
 * Każda strona (lewa/prawa) może mieć niezależny wariant.
 */
export type EnclosureType =
  | 'NONE'
  | 'SIDE_PLATE_WITH_PLINTH'
  | 'SIDE_PLATE_TO_FLOOR'
  | 'PARALLEL_FILLER_STRIP';

/**
 * Konfiguracja obudowy dla jednej strony szafki.
 */
export interface EnclosureConfig {
  type: EnclosureType;
  /** Podpora blendy — tylko dla PARALLEL_FILLER_STRIP. */
  supportPlate: boolean;
  /** Override szerokości blendy w mm — tylko dla PARALLEL_FILLER_STRIP. null = globalny fillerWidthMm. */
  fillerWidthOverrideMm?: number | null;
}

/**
 * Opcje selecta obudowy zależne od strefy szafki.
 * Dla szafek wiszących (isUpperCabinet=true) etykiety są inne niż dla dolnych/słupków.
 */
export function getEnclosureTypeOptions(isUpperCabinet: boolean): { value: EnclosureType; label: string }[] {
  return [
    { value: 'NONE',                   label: 'Brak obudowy' },
    { value: 'SIDE_PLATE_WITH_PLINTH', label: isUpperCabinet ? 'Płyta boczna' : 'Płyta boczna + cokół' },
    { value: 'SIDE_PLATE_TO_FLOOR',    label: isUpperCabinet ? 'Płyta boczna do sufitu' : 'Płyta boczna do podłogi' },
    { value: 'PARALLEL_FILLER_STRIP',  label: 'Blenda równoległa' }
  ];
}

/** Opcje selecta obudowy (do templateu) — backward-compatible, domyślnie dla szafek dolnych. */
export const ENCLOSURE_TYPE_OPTIONS = getEnclosureTypeOptions(false);
