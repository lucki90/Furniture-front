import { resolveLoadedCabinetName } from './cabinet-name.resolver';

describe('resolveLoadedCabinetName', () => {
  it('zapis z polem name zwraca zapisaną nazwę', () => {
    expect(resolveLoadedCabinetName({ cabinetId: 'cabinet-3', name: 'Zlewozmywak' })).toBe('Zlewozmywak');
    expect(resolveLoadedCabinetName({ cabinetId: 'cabinet-3', name: '  Szuflady  ' })).toBe('Szuflady');
  });

  it('szafka bez nazwy (techniczny identyfikator) nie dostaje nazwy', () => {
    expect(resolveLoadedCabinetName({ cabinetId: 'cabinet-3', name: null })).toBeUndefined();
    expect(resolveLoadedCabinetName({ cabinetId: 'cabinet-12' })).toBeUndefined();
    expect(resolveLoadedCabinetName({ cabinetId: 'cabinet-3', name: '   ' })).toBeUndefined();
  });

  it('zapis sprzed pola name: nazwa użytkownika była w cabinetId', () => {
    expect(resolveLoadedCabinetName({ cabinetId: 'Zlewozmywak' })).toBe('Zlewozmywak');
    expect(resolveLoadedCabinetName({ cabinetId: 'Szafka 60 – narożna' })).toBe('Szafka 60 – narożna');
  });

  it('brak identyfikatora i nazwy — brak nazwy', () => {
    expect(resolveLoadedCabinetName({})).toBeUndefined();
  });
});
