import { SegmentFormData, SegmentType } from '../../model/segment.model';

/**
 * Wymagane światło wnęki AGD w segmencie słupka — lustro backendowego `ApplianceNicheSpec`. Segment bez zapisanego
 * typu sprzętu dostaje typ domyślny: piekarnik standardowy, mikrofala 38 cm, zmywarka 60 cm.
 */
export interface TallApplianceNicheSpec {
  applianceType: string;
  /** Nazwa sprzętu w komunikatach. */
  label: string;
  minOpeningHeightMm: number;
  maxOpeningHeightMm: number | null;
  minOpeningWidthMm: number;
  maxOpeningWidthMm: number | null;
}

const BUILT_IN_60_MIN_OPENING_WIDTH_MM = 560;
const DISHWASHER_MIN_OPENING_HEIGHT_MM = 815;
const DISHWASHER_MAX_OPENING_HEIGHT_MM = 875;
const DISHWASHER_WIDTH_TOLERANCE_MM = 10;

export function tallApplianceNicheSpec(segment: Pick<SegmentFormData, 'segmentType' | 'ovenHeightType' | 'microwaveType' | 'dishwasherType'>): TallApplianceNicheSpec | null {
  switch (segment.segmentType) {
    case SegmentType.OVEN: {
      const compact = segment.ovenHeightType === 'COMPACT';
      return {
        applianceType: compact ? 'COMPACT' : 'STANDARD',
        label: compact ? 'piekarnik kompaktowy' : 'piekarnik',
        minOpeningHeightMm: compact ? 455 : 600,
        maxOpeningHeightMm: null,
        minOpeningWidthMm: BUILT_IN_60_MIN_OPENING_WIDTH_MM,
        maxOpeningWidthMm: null
      };
    }
    case SegmentType.MICROWAVE: {
      const m45 = segment.microwaveType === 'M45';
      return {
        applianceType: m45 ? 'M45' : 'M38',
        label: m45 ? 'mikrofalówka 45 cm' : 'mikrofalówka 38 cm',
        minOpeningHeightMm: m45 ? 455 : 380,
        maxOpeningHeightMm: null,
        minOpeningWidthMm: BUILT_IN_60_MIN_OPENING_WIDTH_MM,
        maxOpeningWidthMm: null
      };
    }
    case SegmentType.DISHWASHER: {
      const w45 = segment.dishwasherType === 'W45';
      const nominalWidth = w45 ? 450 : 600;
      return {
        applianceType: w45 ? 'W45' : 'W60',
        label: w45 ? 'zmywarka 45 cm' : 'zmywarka 60 cm',
        minOpeningHeightMm: DISHWASHER_MIN_OPENING_HEIGHT_MM,
        maxOpeningHeightMm: DISHWASHER_MAX_OPENING_HEIGHT_MM,
        minOpeningWidthMm: nominalWidth,
        maxOpeningWidthMm: nominalWidth + DISHWASHER_WIDTH_TOLERANCE_MM
      };
    }
    default:
      return null;
  }
}
