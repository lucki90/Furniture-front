import { buildCustomDrawerFrontDetails } from './drawer-front-details';

describe('buildCustomDrawerFrontDetails', () => {
  it('układ CUSTOM przenosi wysokości frontów w kolejności', () => {
    expect(buildCustomDrawerFrontDetails('CUSTOM', [140, 280, 290])).toEqual([
      { height: 140, name: null },
      { height: 280, name: null },
      { height: 290, name: null }
    ]);
  });

  it('pomija wysokości niepoprawne: puste, zerowe, ujemne i nieskończone', () => {
    expect(buildCustomDrawerFrontDetails('CUSTOM', [140, null, undefined, 0, -10, NaN, Infinity, 290]))
      .toEqual([{ height: 140, name: null }, { height: 290, name: null }]);
  });

  it('EQUAL i MIXED_LOW_TOP nie wysyłają frontów — backend liczy je sam', () => {
    expect(buildCustomDrawerFrontDetails('EQUAL', [140, 280])).toBeNull();
    expect(buildCustomDrawerFrontDetails('MIXED_LOW_TOP', [140, 280])).toBeNull();
    expect(buildCustomDrawerFrontDetails(undefined, [140, 280])).toBeNull();
  });

  it('CUSTOM bez wysokości nie wysyła listy', () => {
    expect(buildCustomDrawerFrontDetails('CUSTOM', [])).toBeNull();
    expect(buildCustomDrawerFrontDetails('CUSTOM', undefined)).toBeNull();
    expect(buildCustomDrawerFrontDetails('CUSTOM', null)).toBeNull();
  });
});
