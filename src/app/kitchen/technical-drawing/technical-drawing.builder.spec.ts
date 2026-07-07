import { buildTechnicalDrawingModel } from './technical-drawing.builder';
import { boardFixture as board } from './testing/board.fixture';

describe('buildTechnicalDrawingModel', () => {
  it('returns null when there are no drawable boards', () => {
    expect(buildTechnicalDrawingModel([])).toBeNull();
    expect(buildTechnicalDrawingModel(null)).toBeNull();
  });

  it('infers base cabinet dimensions from side, back and front boards', () => {
    const model = buildTechnicalDrawingModel([
      board('TOP_WREATH_NAME', 100, 564, 18, 2),
      board('WREATH_NAME', 536, 564, 18),
      board('SIDE_NAME', 758, 536, 18, 2),
      board('HDF_NAME', 756, 596, 3),
      board('FRONT_NAME', 752, 594, 18)
    ]);

    expect(model).not.toBeNull();
    expect(model?.cabinetWidthMm).toBe(600);
    expect(model?.cabinetHeightMm).toBe(758);
    expect(model?.cabinetDepthMm).toBe(536);
    expect(model?.boardThicknessMm).toBe(18);
    expect(model?.boardCount).toBe(7);
    expect(model?.sourceConfidence).toBe('high');
    expect(model?.hasBackPanel).toBeTrue();
    expect(model?.hasTopWreath).toBeTrue();
    expect(model?.hasBottomWreath).toBeTrue();
    expect(model?.footprint).toEqual({
      shape: 'RECTANGLE',
      widthMm: 600,
      depthMm: 536,
      cutoutWidthMm: null,
      cutoutDepthMm: null
    });
  });

  it('keeps drawer fronts and shelves visible in the drawing model', () => {
    const model = buildTechnicalDrawingModel([
      board('SIDE_NAME', 720, 560, 18, 2),
      board('WREATH_NAME', 564, 520, 18),
      board('FRONT_DRAWER_NAME', 220, 596, 18, 3),
      board('SHELF_NAME', 564, 520, 18, 2),
      board('BASE_DRAWER_NAME', 500, 480, 16, 3)
    ]);

    expect(model?.frontPanels).toEqual([
      jasmine.objectContaining({ role: 'DRAWER_FRONT', quantity: 3, widthMm: 596, heightMm: 220 })
    ]);
    expect(model?.shelfCount).toBe(2);
    expect(model?.notes).toContain('Płyty poza MVP rysunku: 3.');
  });

  it('prefers structural outer width over back panel and multiplied two-door fronts', () => {
    const model = buildTechnicalDrawingModel([
      board('TOP_WREATH_NAME', 100, 764, 18, 2),
      board('SHELF_NAME', 534, 763, 18),
      board('WREATH_NAME', 536, 764, 18),
      board('SIDE_NAME', 718, 536, 18, 2),
      board('HDF_NAME', 716, 796, 3),
      board('FRONT_NAME', 712, 394, 18, 2)
    ]);

    expect(model?.cabinetWidthMm).toBe(800);
    expect(model?.cabinetDepthMm).toBe(536);
    expect(model?.frontPanels).toEqual([
      jasmine.objectContaining({ role: 'FRONT', quantity: 2, widthMm: 394, heightMm: 712 })
    ]);
  });

  it('infers medium-confidence dimensions from side and horizontal boards without fronts or back panel', () => {
    const model = buildTechnicalDrawingModel([
      board('SIDE_NAME', 720, 560, 18, 2),
      board('TOP_WREATH_NAME', 100, 564, 18, 2),
      board('WREATH_NAME', 536, 564, 18)
    ]);

    expect(model?.cabinetWidthMm).toBe(600);
    expect(model?.cabinetDepthMm).toBe(560);
    expect(model?.sourceConfidence).toBe('medium');
    expect(model?.notes.some(note => note.includes('BOM'))).toBeTrue();
  });

  it('falls back to horizontal board dimensions when side boards are missing', () => {
    const model = buildTechnicalDrawingModel([
      board('SHELF_NAME', 520, 764, 18, 2),
      board('WREATH_NAME', 536, 764, 18)
    ]);

    expect(model?.cabinetWidthMm).toBe(800);
    expect(model?.cabinetDepthMm).toBe(536);
    expect(model?.sourceConfidence).toBe('low');
  });

  it('falls back to the largest board side when no known structural role is available', () => {
    const model = buildTechnicalDrawingModel([
      board('BASE_DRAWER_NAME', 500, 480, 16, 3)
    ]);

    expect(model?.cabinetWidthMm).toBe(500);
    expect(model?.cabinetDepthMm).toBe(500);
    expect(model?.sourceConfidence).toBe('low');
  });

  it('adds a note for L-shape boards', () => {
    const model = buildTechnicalDrawingModel([
      board('SIDE_NAME', 720, 560, 18, 2),
      board('SHELF_L_SHAPE', 560, 760, 18, 2, {
        lShapeCutoutLengthAMm: 220,
        lShapeCutoutLengthBMm: 180
      })
    ]);

    expect(model?.lShapeBoardCount).toBe(2);
    expect(model?.notes.some(note => note.includes('L-shape: 2'))).toBeTrue();
    expect(model?.footprint).toEqual({
      shape: 'L_SHAPE',
      widthMm: 560,
      depthMm: 760,
      cutoutWidthMm: 220,
      cutoutDepthMm: 180
    });
  });

  it('marks inferred models without side boards as low confidence', () => {
    const model = buildTechnicalDrawingModel([
      board('FRONT_NAME', 700, 400, 18),
      board('HDF_NAME', 704, 406, 3)
    ]);

    expect(model?.sourceConfidence).toBe('low');
    expect(model?.notes).toContain('Model wywnioskowany z BOM bez jawnych pozycji płyt.');
  });
});
