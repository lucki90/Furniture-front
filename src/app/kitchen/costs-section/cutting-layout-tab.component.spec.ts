import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CuttingLayoutResponse } from '../model/cutting-layout.model';
import { CuttingLayoutTabComponent } from './cutting-layout-tab.component';

describe('CuttingLayoutTabComponent', () => {
  let fixture: ComponentFixture<CuttingLayoutTabComponent>;
  let component: CuttingLayoutTabComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuttingLayoutTabComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CuttingLayoutTabComponent);
    component = fixture.componentInstance;
  });

  it('renderuje podsumowanie, nagłówek arkusza i viewBox w milimetrach', () => {
    fixture.componentRef.setInput('layout', sampleLayout());
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;

    expect(text).toContain('Arkusz 1');
    expect(text).toContain('CHIPBOARD · WHITE · 18 mm');
    expect(text).toContain('2.00 m');
    expect(text).toContain('10.0%');
    expect(svg.getAttribute('viewBox')).toBe('0 0 1000 2000');
  });

  it('rysuje arkusz, formatki i resztki jako osobne prostokąty', () => {
    fixture.componentRef.setInput('layout', sampleLayout());
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('svg rect').length).toBe(5);
    expect(fixture.nativeElement.querySelectorAll('.sheet-placement rect').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.sheet-offcut--useful').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.sheet-offcut--waste').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.sheet-cut').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.sheet-cut').getAttribute('x1')).toBe('401.5');
    expect(fixture.nativeElement.querySelector('.sheet-cut').getAttribute('stroke-width')).toBe('3');
  });

  it('pokazuje stan pusty dla odpowiedzi bez arkuszy', () => {
    fixture.componentRef.setInput('layout', { ...sampleLayout(), sheets: [], sheetCount: 0 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Brak formatek do rozkroju');
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
  });

  it('pokazuje błąd i emituje ponowienie', () => {
    let retried = false;
    component.retry.subscribe(() => retried = true);
    fixture.componentRef.setInput('error', 'Błąd rozkroju');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.cutting-retry') as HTMLButtonElement;
    expect(fixture.nativeElement.textContent).toContain('Błąd rozkroju');
    button.click();
    expect(retried).toBeTrue();
  });
});

function sampleLayout(): CuttingLayoutResponse {
  return {
    sheets: [{
      index: 1,
      width: 1000,
      height: 2000,
      material: 'CHIPBOARD',
      color: 'WHITE',
      thicknessMm: 18,
      origin: 'NEW_SHEET',
      kerfMm: 3,
      placements: [
        { x: 0, y: 0, width: 400, height: 500, rotated: false, boardRef: 'SIDE_NAME', label: 'Bok' },
        { x: 0, y: 503, width: 400, height: 500, rotated: true, boardRef: 'SHELF_NAME', label: 'Półka' }
      ],
      cuts: [{ axis: 'SPLIT_X', coord: 400, from: 0, to: 2000, length: 2000, depth: 0 }],
      offcuts: [
        { x: 403, y: 0, width: 597, height: 2000, areaMm2: 1_194_000, useful: true },
        { x: 0, y: 1006, width: 400, height: 994, areaMm2: 397_600, useful: false }
      ],
      usedAreaMm2: 400_000,
      wasteAreaMm2: 1_591_600,
      kerfAreaMm2: 6_000,
      cutLengthMm: 2_000,
      cutCount: 1,
      utilization: 0.1
    }],
    sheetCount: 1,
    totalCutLengthMm: 2_000,
    totalCutCount: 1,
    totalSheetAreaMm2: 2_000_000,
    totalUsedAreaMm2: 400_000,
    totalWasteAreaMm2: 1_591_600,
    totalKerfAreaMm2: 6_000,
    utilization: 0.1
  };
}
