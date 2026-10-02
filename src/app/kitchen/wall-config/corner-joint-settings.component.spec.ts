import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CountertopConfig, WallWithCabinets } from '../model/kitchen-state.model';
import { WallType } from '../model/kitchen-project.model';
import { KitchenProjectLayoutService } from '../service/kitchen-project-layout.service';
import { KitchenStateService } from '../service/kitchen-state.service';
import { resolveWallTopology } from '../service/corner-layout/wall-topology.resolver';
import { CornerJointSettingsComponent } from './corner-joint-settings.component';

describe('CornerJointSettingsComponent', () => {
  let fixture: ComponentFixture<CornerJointSettingsComponent>;
  let component: CornerJointSettingsComponent;
  let state: StateStub;

  const wall = (type: WallType): WallWithCabinets => ({
    id: type.toLowerCase(),
    type,
    widthMm: 3000,
    heightMm: 2600,
    cabinets: [],
    countertopConfig: { enabled: true, thicknessMm: 38 }
  });

  class StateStub {
    readonly walls = signal<WallWithCabinets[]>([wall('MAIN'), wall('LEFT')]);
    readonly selectedWallId = signal<string | null>('main');
    updates: Array<{ wallId: string; config: CountertopConfig }> = [];

    getWallLabel(type: WallType): string {
      return type === 'LEFT' ? 'Ściana lewa' : 'Ściana główna';
    }

    updateCountertopConfig(wallId: string, config: CountertopConfig): void {
      this.updates.push({ wallId, config });
      this.walls.update(walls => walls.map(item => item.id === wallId ? { ...item, countertopConfig: config } : item));
    }
  }

  beforeEach(async () => {
    const stateStub = new StateStub();
    await TestBed.configureTestingModule({
      imports: [CornerJointSettingsComponent],
      providers: [
        { provide: KitchenStateService, useValue: stateStub },
        {
          provide: KitchenProjectLayoutService,
          useValue: {
            layout: signal({
              topology: resolveWallTopology(stateStub.walls()),
              countertopJoints: [{ cornerId: 'main:left', type: 'LYZWA', ruleOwnerWallId: 'main', passingWallId: 'main' }]
            })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CornerJointSettingsComponent);
    component = fixture.componentInstance;
    state = stateStub;
    fixture.detectChanges();
  });

  it('pokazuje narożnik aktualnej ściany z wyborem łączenia i blatu przechodzącego', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Narożnik z «Ściana lewa»: łączenie');
    expect(text).toContain('Przez narożnik przechodzi');
    expect(text).toContain('Automatycznie (ta ściana)');
  });

  it('zmiana typu złącza zapisuje ustawienie w ścianie bocznej i zgłasza zmianę konfiguracji', () => {
    const emitted = jasmine.createSpy('configChanged');
    component.configChanged.subscribe(emitted);

    component.onTypeChange(component.views()[0], 'MITER_45');

    expect(state.updates).toEqual([{
      wallId: 'left',
      config: jasmine.objectContaining({ thicknessMm: 38, cornerJoint: { type: 'MITER_45' } })
    }]);
    expect(emitted).toHaveBeenCalled();
  });

  it('przy cięciu 45° ukrywa wybór blatu przechodzącego', () => {
    component.onTypeChange(component.views()[0], 'MITER_45');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Przez narożnik przechodzi');
    expect(fixture.nativeElement.textContent).toContain('cięte po przekątnej');
  });

  it('wybór ściany głównej jako przechodzącej zapisuje NEIGHBOR w ścianie bocznej', () => {
    component.onPassThroughChange(component.views()[0], 'main');

    expect(state.updates[0].config.cornerJoint).toEqual({ passThrough: 'NEIGHBOR' });
  });
});
