import {
  isCargoMechanismNominalWidth,
  pickCargoMechanismProfileForWidth
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
});
