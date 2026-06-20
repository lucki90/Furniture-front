import { AppLanguage } from '../../service/language.service';
import { CabinetFormValidationErrorCode } from './cabinet-form-validation-error';

/** Słownik komunikatów walidacji formularza szafki dla obsługiwanych języków. */
export const CABINET_FORM_MESSAGES: Record<AppLanguage, {
  widthRequired: string;
  inlineRequired: string;
  inlineInvalid: string;
  heightFallback: string;
  depthFallback: string;
  lowerFrontRequired: string;
  lowerFrontMin: (min: number) => string;
  lowerFrontMax: (max: number) => string;
  mechanismRequired: string;
  dimensionMin: (label: string, min: number) => string;
  dimensionMax: (label: string, max: number) => string;
  dimensionFallback: (label: string) => string;
  rangeRequired: (label: string) => string;
  widthStep: (step: number, min: number) => string;
  segmentNoneAdded: string;
  segmentsExceedHeight: (sum: number, net: number, diff: number) => string;
  segmentsBelowHeight: (sum: number, net: number, diff: number) => string;
  fridgeSectionsTooHigh: (upper: number, fridge: number, min: number, total: number) => string;
  segmentHeightError: (idx: number, min?: number) => string;
  segmentDrawersError: (idx: number) => string;
  customErrors: Record<CabinetFormValidationErrorCode, string>;
  labels: {
    width: string;
    height: string;
    depth: string;
    cornerWidthA: string;
    cornerWidthB: string;
    cornerShelfQty: string;
    cornerFrontUchylny: string;
    cornerOpeningAngle: string;
    blindPanelVisible: string;
  };
}> = {
  pl: {
    widthRequired: 'Szerokość jest wymagana',
    inlineRequired: 'Wymagane',
    inlineInvalid: 'Błąd',
    heightFallback: 'Wysokość: nieprawidłowa wartość',
    depthFallback: 'Głębokość: nieprawidłowa wartość',
    lowerFrontRequired: 'Wysokość frontu zamrażarki jest wymagana',
    lowerFrontMin: (min) => `Front zamrażarki: min ${min} mm`,
    lowerFrontMax: (max) => `Front zamrażarki: max ${max} mm`,
    mechanismRequired: 'Wybierz system organizacji wewnętrznej',
    dimensionMin: (label, min) => `${label}: min ${min} mm`,
    dimensionMax: (label, max) => `${label}: max ${max} mm`,
    dimensionFallback: (label) => `${label}: nieprawidłowa wartość`,
    rangeRequired: (label) => `${label}: wartość wymagana`,
    widthStep: (step, min) => `Szerokość musi być wielokrotnością ${step}mm od ${min}mm`,
    segmentNoneAdded: 'Dodaj co najmniej jeden segment.',
    segmentsExceedHeight: (sum, net, diff) =>
      `Suma wysokości segmentów (${sum}mm) przekracza wysokość netto szafki (${net}mm) o ${diff}mm.`,
    segmentsBelowHeight: (sum, net, diff) =>
      `Suma wysokości segmentów (${sum}mm) jest mniejsza niż wysokość netto szafki (${net}mm) o ${diff}mm.`,
    fridgeSectionsTooHigh: (upper, fridge, min, total) =>
      `Sekcje górne (${upper}mm) zbyt wysokie — sekcja lodówki wynosiłaby tylko ${fridge}mm (min. ${min}mm). Zmniejsz sekcje lub zwiększ wysokość szafki (${total}mm).`,
    segmentHeightError: (idx, min) => {
      const suffix = typeof min === 'number' ? ` (min ${min} mm)` : '';
      return `Segment ${idx}: wysokość poza zakresem${suffix}`;
    },
    segmentDrawersError: (idx) => `Segment ${idx}: nieprawidłowa liczba szuflad`,
    customErrors: {
      PANTRY_ONE_DOOR_TOO_WIDE: 'Dla szerokości powyżej 600 mm wybierz wariant dwojga drzwi.',
      HF_UPPER_FRONT_NOT_POSITIVE:
        'Wysokość górnego frontu musi być większa od 0 (puste pole = front symetryczny)',
      HF_UPPER_FRONT_NOT_BELOW_CABINET:
        'Wysokość górnego frontu musi być mniejsza od wysokości szafki',
      MAGIC_COMFORT_LINE_400_UNSUPPORTED:
        'Magic Corner Comfort nie obsługuje linii 400 — wybierz linię 450 lub wyższą.',
    },
    labels: {
      width: 'Szerokość',
      height: 'Wysokość',
      depth: 'Głębokość',
      cornerWidthA: 'Szerokość A',
      cornerWidthB: 'Szerokość B',
      cornerShelfQty: 'Liczba półek',
      cornerFrontUchylny: 'Szerokość frontu uchylnego',
      cornerOpeningAngle: 'Kąt otwarcia',
      blindPanelVisible: 'Szerokość widocznej części frontu ślepego',
    },
  },
  en: {
    widthRequired: 'Width is required',
    inlineRequired: 'Required',
    inlineInvalid: 'Invalid value',
    heightFallback: 'Height: invalid value',
    depthFallback: 'Depth: invalid value',
    lowerFrontRequired: 'Freezer front height is required',
    lowerFrontMin: (min) => `Freezer front: min ${min} mm`,
    lowerFrontMax: (max) => `Freezer front: max ${max} mm`,
    mechanismRequired: 'Select an interior organisation system',
    dimensionMin: (label, min) => `${label}: min ${min} mm`,
    dimensionMax: (label, max) => `${label}: max ${max} mm`,
    dimensionFallback: (label) => `${label}: invalid value`,
    rangeRequired: (label) => `${label}: value required`,
    widthStep: (step, min) => `Width must be a multiple of ${step}mm from ${min}mm`,
    segmentNoneAdded: 'Add at least one segment.',
    segmentsExceedHeight: (sum, net, diff) =>
      `Total segment height (${sum}mm) exceeds cabinet net height (${net}mm) by ${diff}mm.`,
    segmentsBelowHeight: (sum, net, diff) =>
      `Total segment height (${sum}mm) is ${diff}mm less than cabinet net height (${net}mm).`,
    fridgeSectionsTooHigh: (upper, fridge, min, total) =>
      `Upper sections (${upper}mm) too high — fridge section would be only ${fridge}mm (min. ${min}mm). Reduce sections or increase cabinet height (${total}mm).`,
    segmentHeightError: (idx, min) => {
      const suffix = typeof min === 'number' ? ` (min ${min} mm)` : '';
      return `Segment ${idx}: height out of range${suffix}`;
    },
    segmentDrawersError: (idx) => `Segment ${idx}: invalid drawer quantity`,
    customErrors: {
      PANTRY_ONE_DOOR_TOO_WIDE: 'For widths above 600 mm, select the two-door variant.',
      HF_UPPER_FRONT_NOT_POSITIVE:
        'Upper front height must be greater than 0 (leave empty for a symmetric front)',
      HF_UPPER_FRONT_NOT_BELOW_CABINET:
        'Upper front height must be lower than the cabinet height',
      MAGIC_COMFORT_LINE_400_UNSUPPORTED:
        'Magic Corner Comfort does not support line 400 — select line 450 or higher.',
    },
    labels: {
      width: 'Width',
      height: 'Height',
      depth: 'Depth',
      cornerWidthA: 'Width A',
      cornerWidthB: 'Width B',
      cornerShelfQty: 'Shelf count',
      cornerFrontUchylny: 'Swing door width',
      cornerOpeningAngle: 'Opening angle',
      blindPanelVisible: 'Visible blind panel width',
    },
  },
};
