import { Board, Job } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { buildBoardRemarks, cornerMechanismRemark, isLShapeBoard } from './board-remarks.builder';

function makeBoard(overrides: Partial<Board> = {}): Board {
  return {
    boardName: 'SIDE_NAME',
    quantity: 1,
    sideX: 560,
    sideY: 720,
    boardThickness: 18,
    color: 'WHITE',
    priceEntry: { price: 0 } as any,
    totalPrice: 0,
    remarks: '',
    ...overrides
  };
}

function makeJob(type: string, quantity = 2, additionalInfo?: string[]): Job {
  return {
    category: 'MACHINING',
    type,
    quantity,
    additionalInfo,
    priceEntry: { price: 0 } as any,
    totalPrice: 0
  };
}

describe('buildBoardRemarks', () => {
  describe('puszki zawiasów (adnotacja frontu z backendu)', () => {
    it('drzwi: liczba puszek na front i krawędź z wysokością frontu', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideX: 712, sideY: 394, hingeCountPerPiece: 2, hingeEdgeLengthMm: 712 });

      const result = buildBoardRemarks(board, undefined, false);

      expect(result).toBe('Puszki zawiasów: 2 na front, wzdłuż krawędzi 712 mm');
    });

    it('klapa na klasycznych zawiasach: krawędź z szerokością frontu', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideX: 400, sideY: 600, hingeCountPerPiece: 2, hingeEdgeLengthMm: 600 });

      const result = buildBoardRemarks(board, undefined, false);

      expect(result).toBe('Puszki zawiasów: 2 na front, wzdłuż krawędzi 600 mm');
    });

    it('wyższy front: liczba puszek z backendu, nie suma zawiasów szafki', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideX: 1994, sideY: 596, quantity: 2, hingeCountPerPiece: 4, hingeEdgeLengthMm: 1994 });

      const result = buildBoardRemarks(board, undefined, false);

      expect(result).toBe('Puszki zawiasów: 4 na front, wzdłuż krawędzi 1994 mm');
    });

    it('front bez adnotacji (szuflada, klapa na podnośniku) nie dostaje uwagi o puszkach', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideX: 712, sideY: 594 });

      const result = buildBoardRemarks(board, undefined, false);

      expect(result).toBe('');
    });
  });

  describe('frezowanie nutu HDF (SIDE_NAME + GROOVE_FOR_HDF)', () => {
    it('nut wzdłuż wysokości boku z zlecenia frezowania', () => {
      const board = makeBoard({ boardName: 'SIDE_NAME', sideX: 718, sideY: 279 });
      const grooveForHdf = makeJob('GROOVE_FOR_HDF', 2, ['kind=back_panel_groove', 'sides=2', 'sideHeightMm=718']);

      const result = buildBoardRemarks(board, grooveForHdf, false);

      expect(result).toBe('Frezowanie nutu pod HDF wzdłuż krawędzi 718 mm');
    });

    it('bez wysokości boku w zleceniu uwaga nie zgaduje krawędzi', () => {
      const board = makeBoard({ boardName: 'SIDE_NAME', sideX: 718, sideY: 279 });
      const grooveForHdf = makeJob('GROOVE_FOR_HDF');

      const result = buildBoardRemarks(board, grooveForHdf, false);

      expect(result).toBe('Frezowanie nutu pod HDF');
    });

    it('nie dodaje uwagi gdy brak job GROOVE_FOR_HDF', () => {
      const board = makeBoard({ boardName: 'SIDE_NAME', sideY: 720 });

      const result = buildBoardRemarks(board, undefined, false);

      expect(result).toBe('');
    });

    it('nie dodaje uwagi nutu dla FRONT_NAME', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 596 });
      const grooveForHdf = makeJob('GROOVE_FOR_HDF');

      const result = buildBoardRemarks(board, grooveForHdf, false);

      expect(result).toBe('');
    });
  });

  describe('szafka pod zlew (BASE_SINK)', () => {
    it('dodaje uwagę o puszce zawiasu dla FRONT_NAME w szafce pod zlew', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 570 });

      const result = buildBoardRemarks(board, undefined, true);

      expect(result).toContain('Szafka pod zlew: górna puszka zawiasu 150mm od góry');
    });

    it('dodaje uwagę o pasku przednim dla TOP_WREATH_NAME w szafce pod zlew', () => {
      const board = makeBoard({ boardName: 'TOP_WREATH_NAME' });

      const result = buildBoardRemarks(board, undefined, true);

      expect(result).toBe('Pasek przedni cofnięty 3mm względem boków (szafka pod zlew)');
    });

    it('nie dodaje uwag sink dla zwykłej szafki z FRONT_NAME', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 596 });

      const result = buildBoardRemarks(board, undefined, false);

      expect(result).not.toContain('Szafka pod zlew');
    });

    it('nie dodaje uwag sink dla bocznej płyty w szafce pod zlew', () => {
      const board = makeBoard({ boardName: 'SIDE_NAME', sideY: 720 });

      const result = buildBoardRemarks(board, undefined, true);

      expect(result).toBe('');
    });
  });

  describe('L-shape CNC', () => {
    it('dodaje uwagę L-shape dla WREATH_L_SHAPE z wymiarami wycięcia', () => {
      const board = makeBoard({ boardName: 'WREATH_L_SHAPE', lShapeCutoutLengthAMm: 560, lShapeCutoutLengthBMm: 560 });

      const result = buildBoardRemarks(board, undefined, false);

      expect(result).toBe('L-shape: wycięcie CNC w rogu 560×560 mm');
    });

    it('dodaje uwagę L-shape dla TOP_WREATH_L_SHAPE', () => {
      const board = makeBoard({ boardName: 'TOP_WREATH_L_SHAPE', lShapeCutoutLengthAMm: 560, lShapeCutoutLengthBMm: 560 });

      const result = buildBoardRemarks(board, undefined, false);

      expect(result).toContain('L-shape');
    });

    it('dodaje uwagę L-shape dla SHELF_L_SHAPE', () => {
      const board = makeBoard({ boardName: 'SHELF_L_SHAPE', lShapeCutoutLengthAMm: 560, lShapeCutoutLengthBMm: 560 });

      const result = buildBoardRemarks(board, undefined, false);

      expect(result).toContain('L-shape');
    });

    it('nie dodaje uwagi gdy brak wymiarów wycięcia CNC', () => {
      const board = makeBoard({ boardName: 'WREATH_L_SHAPE' });

      const result = buildBoardRemarks(board, undefined, false);

      expect(result).toBe('');
    });

    it('nie dodaje uwagi L-shape dla zwykłego WREATH_NAME', () => {
      const board = makeBoard({ boardName: 'WREATH_NAME', lShapeCutoutLengthAMm: 560, lShapeCutoutLengthBMm: 560 });

      const result = buildBoardRemarks(board, undefined, false);

      expect(result).toBe('');
    });
  });

  describe('mechanizmy narożne (Le Mans / Magic Corner)', () => {
    it('dodaje notę Le Mans I dla FRONT_NAME', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME' });

      const result = buildBoardRemarks(board, undefined, false, 'LE_MANS_I');

      expect(result).toBe('Le Mans: front 16-19 mm, min. 85 deg otwarcia');
    });

    it('dodaje notę Le Mans II dla CORNER_BLIND_FRONT', () => {
      const board = makeBoard({ boardName: 'CORNER_BLIND_FRONT' });

      const result = buildBoardRemarks(board, undefined, false, 'LE_MANS_II');

      expect(result).toBe('Le Mans: front 16-19 mm, min. 85 deg otwarcia');
    });

    it('dodaje notę Magic Corner Comfort', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME' });

      const result = buildBoardRemarks(board, undefined, false, 'MAGIC_CORNER_COMFORT');

      expect(result).toBe('Magic Corner Comfort: maks. 90 deg otwarcia, kosz przedni 10 kg, tylny 8 kg');
    });

    it('dodaje notę Magic Corner Standard', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME' });

      const result = buildBoardRemarks(board, undefined, false, 'MAGIC_CORNER_STANDARD');

      expect(result).toBe('Magic Corner Standard: maks. 75 deg otwarcia, kosz przedni 7 kg, tylny 9 kg');
    });

    it('nie dodaje noty narożnika dla SIDE_NAME', () => {
      const board = makeBoard({ boardName: 'SIDE_NAME' });

      const result = buildBoardRemarks(board, undefined, false, 'LE_MANS_I');

      expect(result).toBe('');
    });

    it('nie dodaje noty dla nieznanego mechanizmu', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME' });

      const result = buildBoardRemarks(board, undefined, false, 'FIXED_SHELVES');

      expect(result).toBe('');
    });

    it('null cornerMechanism nie powoduje uwagi', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME' });

      const result = buildBoardRemarks(board, undefined, false, null);

      expect(result).toBe('');
    });
  });

  describe('łączenie wielu uwag', () => {
    it('łączy zawiasy i uwagę sink średnikiem', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideX: 570, sideY: 296, hingeCountPerPiece: 2, hingeEdgeLengthMm: 570 });

      const result = buildBoardRemarks(board, undefined, true);

      expect(result).toBe(
        'Puszki zawiasów: 2 na front, wzdłuż krawędzi 570 mm; '
        + 'Szafka pod zlew: górna puszka zawiasu 150mm od góry (dolna 100mm od dołu)'
      );
    });

    it('łączy zawiasy i mechanizm narożny', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideX: 712, sideY: 414, hingeCountPerPiece: 3, hingeEdgeLengthMm: 712 });

      const result = buildBoardRemarks(board, undefined, false, 'LE_MANS_I');

      expect(result).toBe(
        'Puszki zawiasów: 3 na front, wzdłuż krawędzi 712 mm; Le Mans: front 16-19 mm, min. 85 deg otwarcia'
      );
    });
  });

  describe('brak uwag', () => {
    it('zwraca pusty string gdy żaden warunek nie zachodzi', () => {
      const board = makeBoard({ boardName: 'WREATH_NAME' });

      const result = buildBoardRemarks(board, undefined, false);

      expect(result).toBe('');
    });
  });
});

describe('cornerMechanismRemark', () => {
  it('zwraca notę dla LE_MANS_I', () => {
    expect(cornerMechanismRemark('LE_MANS_I')).toBe('Le Mans: front 16-19 mm, min. 85 deg otwarcia');
  });

  it('zwraca tę samą notę dla LE_MANS_II', () => {
    expect(cornerMechanismRemark('LE_MANS_II')).toBe('Le Mans: front 16-19 mm, min. 85 deg otwarcia');
  });

  it('zwraca notę dla MAGIC_CORNER_COMFORT', () => {
    expect(cornerMechanismRemark('MAGIC_CORNER_COMFORT')).toBe(
      'Magic Corner Comfort: maks. 90 deg otwarcia, kosz przedni 10 kg, tylny 8 kg'
    );
  });

  it('zwraca notę dla MAGIC_CORNER_STANDARD', () => {
    expect(cornerMechanismRemark('MAGIC_CORNER_STANDARD')).toBe(
      'Magic Corner Standard: maks. 75 deg otwarcia, kosz przedni 7 kg, tylny 9 kg'
    );
  });

  it('zwraca null dla nieznanego mechanizmu', () => {
    expect(cornerMechanismRemark('FIXED_SHELVES')).toBeNull();
  });

  it('zwraca null dla pustego stringa', () => {
    expect(cornerMechanismRemark('')).toBeNull();
  });
});

describe('isLShapeBoard', () => {
  it('zwraca true dla WREATH_L_SHAPE', () => {
    expect(isLShapeBoard('WREATH_L_SHAPE')).toBeTrue();
  });

  it('zwraca true dla TOP_WREATH_L_SHAPE', () => {
    expect(isLShapeBoard('TOP_WREATH_L_SHAPE')).toBeTrue();
  });

  it('zwraca true dla SHELF_L_SHAPE', () => {
    expect(isLShapeBoard('SHELF_L_SHAPE')).toBeTrue();
  });

  it('zwraca false dla WREATH_NAME', () => {
    expect(isLShapeBoard('WREATH_NAME')).toBeFalse();
  });

  it('zwraca false dla FRONT_NAME', () => {
    expect(isLShapeBoard('FRONT_NAME')).toBeFalse();
  });

  it('zwraca false dla pustego stringa', () => {
    expect(isLShapeBoard('')).toBeFalse();
  });
});
