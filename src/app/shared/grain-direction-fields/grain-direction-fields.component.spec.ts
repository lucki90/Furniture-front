import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GrainDirections, NO_GRAIN_OVERRIDE } from '../model/grain-direction';
import { GrainDirectionFieldsComponent } from './grain-direction-fields.component';

describe('GrainDirectionFieldsComponent', () => {
  let fixture: ComponentFixture<GrainDirectionFieldsComponent>;
  let component: GrainDirectionFieldsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GrainDirectionFieldsComponent] }).compileComponents();
    fixture = TestBed.createComponent(GrainDirectionFieldsComponent);
    component = fixture.componentInstance;
  });

  function select(testId: string): HTMLSelectElement {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`) as HTMLSelectElement;
  }

  it('w ustawieniach pokazuje trzy kierunki bez opcji dziedziczenia', () => {
    fixture.componentRef.setInput('value', { front: 'ALONG_HEIGHT', side: 'ALONG_HEIGHT', panel: 'ALONG_WIDTH' });
    fixture.detectChanges();

    expect(select('grain-front-select').options.length).toBe(3);
    expect(select('grain-panel-select').textContent).toContain('Wzdłuż szerokości szafki');
    expect(select('grain-side-select').textContent).not.toContain('Jak w ustawieniach');
  });

  it('w projekcie dodaje opcję „Jak w ustawieniach” z kierunkiem użytkownika', () => {
    fixture.componentRef.setInput('value', NO_GRAIN_OVERRIDE);
    fixture.componentRef.setInput('inherited', { front: 'ALONG_HEIGHT', side: 'ANY', panel: 'ALONG_WIDTH' });
    fixture.detectChanges();

    expect(select('grain-front-select').options.length).toBe(4);
    expect(select('grain-front-select').options[0].textContent).toContain('Jak w ustawieniach (pionowo — wzdłuż wysokości)');
    expect(select('grain-side-select').options[0].textContent).toContain('Jak w ustawieniach (dowolny)');
  });

  it('zmiana jednego pola emituje komplet kierunków', () => {
    const emitted: GrainDirections[] = [];
    component.valueChange.subscribe(value => emitted.push(value));
    fixture.componentRef.setInput('value', { front: null, side: 'ALONG_DEPTH', panel: null });
    fixture.detectChanges();

    component.onFrontChange('ANY');
    component.onPanelChange('ALONG_DEPTH');

    expect(emitted).toEqual([
      { front: 'ANY', side: 'ALONG_DEPTH', panel: null },
      { front: null, side: 'ALONG_DEPTH', panel: 'ALONG_DEPTH' }
    ]);
  });
});
