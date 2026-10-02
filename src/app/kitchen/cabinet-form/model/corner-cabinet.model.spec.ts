import {
  BLIND_CORNER_DEFAULT_NEIGHBOR_REACH_MM,
  computeBlindCornerWidthFromFormula,
  CornerHandleType
} from './corner-cabinet.model';

describe('computeBlindCornerWidthFromFormula', () => {
  it('zachowuje książkowy fallback 530 mm bez danych projektu', () => {
    expect(BLIND_CORNER_DEFAULT_NEIGHBOR_REACH_MM).toBe(530);
    expect(computeBlindCornerWidthFromFormula(CornerHandleType.SCREWED, 500)).toBe(1084);
  });

  it('używa rzeczywistego zasięgu sąsiedniej szafki', () => {
    expect(computeBlindCornerWidthFromFormula(CornerHandleType.SCREWED, 500, 578)).toBe(1132);
  });

  it('uwzględnia mniejszy zasięg sąsiada z frontem wpuszczanym', () => {
    expect(computeBlindCornerWidthFromFormula(CornerHandleType.MILLED, 500, 560)).toBe(1079);
  });

  it('wraca do fallbacku dla niepoprawnego zasięgu', () => {
    expect(computeBlindCornerWidthFromFormula(CornerHandleType.PUSH_TO_OPEN, 500, Number.NaN)).toBe(1034);
    expect(computeBlindCornerWidthFromFormula(CornerHandleType.PUSH_TO_OPEN, 500, 0)).toBe(1034);
  });
});
