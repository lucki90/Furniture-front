import { DEFAULT_GRAIN_DIRECTIONS, orientBoardForOrder, userGrainDirections } from './grain-direction';

describe('orientBoardForOrder', () => {
  const front = { sideX: 712, sideY: 394, veneerX: 2, veneerY: 1 };

  it('słój wzdłuż sideX: długość to sideX z okleiną veneerX', () => {
    expect(orientBoardForOrder({ ...front, grainAxis: 'ALONG_SIDE_X' }))
      .toEqual({ length: 712, lengthVeneer: 2, width: 394, widthVeneer: 1 });
  });

  it('słój wzdłuż sideY: długość to sideY z okleiną veneerY', () => {
    expect(orientBoardForOrder({ ...front, grainAxis: 'ALONG_SIDE_Y' }))
      .toEqual({ length: 394, lengthVeneer: 1, width: 712, widthVeneer: 2 });
  });

  it('słój dowolny albo brak adnotacji: długość to dłuższy bok', () => {
    expect(orientBoardForOrder({ ...front, grainAxis: 'ANY' }).length).toBe(712);
    expect(orientBoardForOrder({ sideX: 300, sideY: 800, grainAxis: null }))
      .toEqual({ length: 800, lengthVeneer: 0, width: 300, widthVeneer: 0 });
  });
});

describe('userGrainDirections', () => {
  it('przenosi ustawienia użytkownika', () => {
    expect(userGrainDirections({ frontGrainDirection: 'ANY', sideGrainDirection: 'ALONG_DEPTH', panelGrainDirection: 'ALONG_DEPTH' }))
      .toEqual({ front: 'ANY', side: 'ALONG_DEPTH', panel: 'ALONG_DEPTH' });
  });

  it('brakujące pola (starszy backend) przyjmują wartości domyślne', () => {
    expect(userGrainDirections({})).toEqual(DEFAULT_GRAIN_DIRECTIONS);
  });
});
