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

function makeJob(type: string, quantity = 2): Job {
  return {
    category: 'MACHINING',
    type,
    quantity,
    additionalInfo: undefined,
    priceEntry: { price: 0 } as any,
    totalPrice: 0
  };
}

describe('buildBoardRemarks', () => {
  describe('zawiasy (FRONT_NAME + HINGE_MILLING)', () => {
    it('używa "puszka" dla 1 zawiasu', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 596 });
      const hingeMilling = makeJob('HINGE_MILLING', 1);

      const result = buildBoardRemarks(board, hingeMilling, undefined, false);

      expect(result).toBe('1 puszka na długość 596mm');
    });

    it('używa "puszki" dla 2 zawiasów', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 596 });
      const hingeMilling = makeJob('HINGE_MILLING', 2);

      const result = buildBoardRemarks(board, hingeMilling, undefined, false);

      expect(result).toBe('2 puszki na długość 596mm');
    });

    it('używa "puszki" dla 4 zawiasów', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 1196 });
      const hingeMilling = makeJob('HINGE_MILLING', 4);

      const result = buildBoardRemarks(board, hingeMilling, undefined, false);

      expect(result).toBe('4 puszki na długość 1196mm');
    });

    it('używa "puszek" dla 5+ zawiasów', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 1596 });
      const hingeMilling = makeJob('HINGE_MILLING', 5);

      const result = buildBoardRemarks(board, hingeMilling, undefined, false);

      expect(result).toBe('5 puszek na długość 1596mm');
    });

    it('zaokrągla ułamkową liczbę zawiasów', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 596 });
      const hingeMilling = makeJob('HINGE_MILLING', 2.7);

      const result = buildBoardRemarks(board, hingeMilling, undefined, false);

      expect(result).toBe('3 puszki na długość 596mm');
    });

    it('nie dodaje uwagi gdy brak job HINGE_MILLING', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 596 });

      const result = buildBoardRemarks(board, undefined, undefined, false);

      expect(result).toBe('');
    });

    it('nie dodaje uwagi dla płyty innej niż FRONT_NAME', () => {
      const board = makeBoard({ boardName: 'SIDE_NAME', sideY: 720 });
      const hingeMilling = makeJob('HINGE_MILLING', 2);

      const result = buildBoardRemarks(board, hingeMilling, undefined, false);

      expect(result).toBe('');
    });
  });

  describe('frezowanie nutu HDF (SIDE_NAME + GROOVE_FOR_HDF)', () => {
    it('dodaje uwagę o frezowaniu nutu na boku', () => {
      const board = makeBoard({ boardName: 'SIDE_NAME', sideY: 720 });
      const grooveForHdf = makeJob('GROOVE_FOR_HDF');

      const result = buildBoardRemarks(board, undefined, grooveForHdf, false);

      expect(result).toBe('Frezowanie nutu pod HDF na boku 720mm');
    });

    it('nie dodaje uwagi gdy brak job GROOVE_FOR_HDF', () => {
      const board = makeBoard({ boardName: 'SIDE_NAME', sideY: 720 });

      const result = buildBoardRemarks(board, undefined, undefined, false);

      expect(result).toBe('');
    });

    it('nie dodaje uwagi nutu dla FRONT_NAME', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 596 });
      const grooveForHdf = makeJob('GROOVE_FOR_HDF');

      const result = buildBoardRemarks(board, undefined, grooveForHdf, false);

      expect(result).toBe('');
    });
  });

  describe('szafka pod zlew (BASE_SINK)', () => {
    it('dodaje uwagę o puszce zawiasu dla FRONT_NAME w szafce pod zlew', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 570 });

      const result = buildBoardRemarks(board, undefined, undefined, true);

      expect(result).toContain('Szafka pod zlew: górna puszka zawiasu 150mm od góry');
    });

    it('dodaje uwagę o pasku przednim dla TOP_WREATH_NAME w szafce pod zlew', () => {
      const board = makeBoard({ boardName: 'TOP_WREATH_NAME' });

      const result = buildBoardRemarks(board, undefined, undefined, true);

      expect(result).toBe('Pasek przedni cofnięty 3mm względem boków (szafka pod zlew)');
    });

    it('nie dodaje uwag sink dla zwykłej szafki z FRONT_NAME', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 596 });

      const result = buildBoardRemarks(board, undefined, undefined, false);

      expect(result).not.toContain('Szafka pod zlew');
    });

    it('nie dodaje uwag sink dla bocznej płyty w szafce pod zlew', () => {
      const board = makeBoard({ boardName: 'SIDE_NAME', sideY: 720 });

      const result = buildBoardRemarks(board, undefined, undefined, true);

      expect(result).toBe('');
    });
  });

  describe('L-shape CNC', () => {
    it('dodaje uwagę L-shape dla WREATH_L_SHAPE z wymiarami wycięcia', () => {
      const board = makeBoard({ boardName: 'WREATH_L_SHAPE', lShapeCutoutLengthAMm: 560, lShapeCutoutLengthBMm: 560 });

      const result = buildBoardRemarks(board, undefined, undefined, false);

      expect(result).toBe('L-shape: wycięcie CNC w rogu 560×560 mm');
    });

    it('dodaje uwagę L-shape dla TOP_WREATH_L_SHAPE', () => {
      const board = makeBoard({ boardName: 'TOP_WREATH_L_SHAPE', lShapeCutoutLengthAMm: 560, lShapeCutoutLengthBMm: 560 });

      const result = buildBoardRemarks(board, undefined, undefined, false);

      expect(result).toContain('L-shape');
    });

    it('dodaje uwagę L-shape dla SHELF_L_SHAPE', () => {
      const board = makeBoard({ boardName: 'SHELF_L_SHAPE', lShapeCutoutLengthAMm: 560, lShapeCutoutLengthBMm: 560 });

      const result = buildBoardRemarks(board, undefined, undefined, false);

      expect(result).toContain('L-shape');
    });

    it('nie dodaje uwagi gdy brak wymiarów wycięcia CNC', () => {
      const board = makeBoard({ boardName: 'WREATH_L_SHAPE' });

      const result = buildBoardRemarks(board, undefined, undefined, false);

      expect(result).toBe('');
    });

    it('nie dodaje uwagi L-shape dla zwykłego WREATH_NAME', () => {
      const board = makeBoard({ boardName: 'WREATH_NAME', lShapeCutoutLengthAMm: 560, lShapeCutoutLengthBMm: 560 });

      const result = buildBoardRemarks(board, undefined, undefined, false);

      expect(result).toBe('');
    });
  });

  describe('mechanizmy narożne (Le Mans / Magic Corner)', () => {
    it('dodaje notę Le Mans I dla FRONT_NAME', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME' });

      const result = buildBoardRemarks(board, undefined, undefined, false, 'LE_MANS_I');

      expect(result).toBe('Le Mans: front 16-19 mm, min. 85 deg otwarcia');
    });

    it('dodaje notę Le Mans II dla CORNER_BLIND_FRONT', () => {
      const board = makeBoard({ boardName: 'CORNER_BLIND_FRONT' });

      const result = buildBoardRemarks(board, undefined, undefined, false, 'LE_MANS_II');

      expect(result).toBe('Le Mans: front 16-19 mm, min. 85 deg otwarcia');
    });

    it('dodaje notę Magic Corner Comfort', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME' });

      const result = buildBoardRemarks(board, undefined, undefined, false, 'MAGIC_CORNER_COMFORT');

      expect(result).toBe('Magic Corner Comfort: maks. 90 deg otwarcia, kosz przedni 10 kg, tylny 8 kg');
    });

    it('dodaje notę Magic Corner Standard', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME' });

      const result = buildBoardRemarks(board, undefined, undefined, false, 'MAGIC_CORNER_STANDARD');

      expect(result).toBe('Magic Corner Standard: maks. 75 deg otwarcia, kosz przedni 7 kg, tylny 9 kg');
    });

    it('nie dodaje noty narożnika dla SIDE_NAME', () => {
      const board = makeBoard({ boardName: 'SIDE_NAME' });

      const result = buildBoardRemarks(board, undefined, undefined, false, 'LE_MANS_I');

      expect(result).toBe('');
    });

    it('nie dodaje noty dla nieznanego mechanizmu', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME' });

      const result = buildBoardRemarks(board, undefined, undefined, false, 'FIXED_SHELVES');

      expect(result).toBe('');
    });

    it('null cornerMechanism nie powoduje uwagi', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME' });

      const result = buildBoardRemarks(board, undefined, undefined, false, null);

      expect(result).toBe('');
    });
  });

  describe('łączenie wielu uwag', () => {
    it('łączy zawiasy i uwagę sink średnikiem', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 570 });
      const hingeMilling = makeJob('HINGE_MILLING', 2);

      const result = buildBoardRemarks(board, hingeMilling, undefined, true);

      expect(result).toBe(
        '2 puszki na długość 570mm; Szafka pod zlew: górna puszka zawiasu 150mm od góry (dolna 100mm od dołu)'
      );
    });

    it('łączy zawiasy i mechanizm narożny', () => {
      const board = makeBoard({ boardName: 'FRONT_NAME', sideY: 596 });
      const hingeMilling = makeJob('HINGE_MILLING', 3);

      const result = buildBoardRemarks(board, hingeMilling, undefined, false, 'LE_MANS_I');

      expect(result).toBe(
        '3 puszki na długość 596mm; Le Mans: front 16-19 mm, min. 85 deg otwarcia'
      );
    });
  });

  describe('brak uwag', () => {
    it('zwraca pusty string gdy żaden warunek nie zachodzi', () => {
      const board = makeBoard({ boardName: 'WREATH_NAME' });

      const result = buildBoardRemarks(board, undefined, undefined, false);

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
