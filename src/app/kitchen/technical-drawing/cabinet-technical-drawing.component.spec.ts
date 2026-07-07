import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { CabinetTechnicalDrawingComponent } from './cabinet-technical-drawing.component';
import { boardFixture as board, cabinetResponseFixture } from './testing/board.fixture';

describe('CabinetTechnicalDrawingComponent', () => {
  let fixture: ComponentFixture<CabinetTechnicalDrawingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CabinetTechnicalDrawingComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CabinetTechnicalDrawingComponent);
  });

  it('renders nothing when result is empty', () => {
    fixture.componentRef.setInput('result', null);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.technical-drawing-card')).toBeNull();
  });

  it('renders front, side and top SVG views from cabinet boards', () => {
    fixture.componentRef.setInput('result', responseWithBoards());

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const svg = fixture.nativeElement.querySelector('svg.technical-drawing-svg') as SVGElement;

    expect(svg).not.toBeNull();
    expect(text).toContain('Rysunek techniczny');
    expect(text).toContain('600 x 758 x 536 mm');
    expect(text).toContain('Widok frontu');
    expect(text).toContain('Przekrój boczny');
    expect(text).toContain('Rzut z góry');
    expect(text).toContain('7 płyt');
  });

  it('renders L-shape footprint path for corner boards', () => {
    fixture.componentRef.setInput('result', cabinetResponseFixture([
      board('SIDE_NAME', 720, 560, 18, 2),
      board('SHELF_L_SHAPE', 560, 760, 18, 2, {
        lShapeCutoutLengthAMm: 220,
        lShapeCutoutLengthBMm: 180
      })
    ]));

    fixture.detectChanges();

    const lShapePath = fixture.nativeElement.querySelector('path.technical-path--l-shape') as SVGPathElement;

    expect(lShapePath).not.toBeNull();
    expect(lShapePath.getAttribute('d')).toContain('Z');
    expect(fixture.nativeElement.textContent).toContain('Rzut z góry');
  });
});

function responseWithBoards(): CabinetResponse {
  return cabinetResponseFixture([
    board('TOP_WREATH_NAME', 100, 564, 18, 2),
    board('WREATH_NAME', 536, 564, 18),
    board('SIDE_NAME', 758, 536, 18, 2),
    board('HDF_NAME', 756, 596, 3),
    board('FRONT_NAME', 752, 594, 18)
  ]);
}
