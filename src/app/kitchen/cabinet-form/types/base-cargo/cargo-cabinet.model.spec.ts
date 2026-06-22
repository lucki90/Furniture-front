import {
  isCargoMechanismNominalWidth,
  pickCargoMechanismProfileForWidth,
  getCargoWidthHint
} from './cargo-cabinet.model';

describe('cargo-cabinet.model', () => {
  it('recognizes only nominal cargo mechanism widths', () => {
    expect(isCargoMechanismNominalWidth(150)).toBeTrue();
    expect(isCargoMechanismNominalWidth(300)).toBeTrue();
    expect(isCargoMechanismNominalWidth(600)).toBeTrue();
    expect(isCargoMechanismNominalWidth(350)).toBeFalse();
  });

  it('picks the matching nominal profile for in-range widths', () => {
    expect(pickCargoMechanismProfileForWidth(150).nominalWidthMm).toBe(150);
    expect(pickCargoMechanismProfileForWidth(250).nominalWidthMm).toBe(200);
    expect(pickCargoMechanismProfileForWidth(350).nominalWidthMm).toBe(300);
    expect(pickCargoMechanismProfileForWidth(500).nominalWidthMm).toBe(500);
  });

  it('clamps widths outside configured profiles to first or last profile', () => {
    expect(pickCargoMechanismProfileForWidth(149).nominalWidthMm).toBe(150);
    expect(pickCargoMechanismProfileForWidth(999).nominalWidthMm).toBe(600);
  });

  describe('getCargoWidthHint', () => {
    it('zwraca null gdy szerokość <= 0', () => {
      expect(getCargoWidthHint(0, 'MECHANISM')).toBeNull();
      expect(getCargoWidthHint(-10, 'DRAWERS')).toBeNull();
    });

    it('zwraca null gdy wariant nieznany lub null', () => {
      expect(getCargoWidthHint(300, null)).toBeNull();
      expect(getCargoWidthHint(300, 'UNKNOWN')).toBeNull();
    });

    it('zwraca null dla MECHANISM z nominalną szerokością', () => {
      expect(getCargoWidthHint(300, 'MECHANISM')).toBeNull();
      expect(getCargoWidthHint(600, 'MECHANISM')).toBeNull();
    });

    it('zwraca ostrzeżenie dla MECHANISM z nienominalną szerokością', () => {
      const hint = getCargoWidthHint(350, 'MECHANISM');
      expect(hint).toContain('mechanizm cargo');
    });

    it('zwraca silne ostrzeżenie dla DRAWERS <= 200mm', () => {
      const hint = getCargoWidthHint(200, 'DRAWERS');
      expect(hint).toContain('mało użytkowe');
    });

    it('zwraca łagodne ostrzeżenie dla DRAWERS 201-249mm', () => {
      const hint = getCargoWidthHint(230, 'DRAWERS');
      expect(hint).toContain('bardzo wąskie');
    });

    it('zwraca null dla DRAWERS >= 250mm', () => {
      expect(getCargoWidthHint(250, 'DRAWERS')).toBeNull();
      expect(getCargoWidthHint(600, 'DRAWERS')).toBeNull();
    });
  });
});
