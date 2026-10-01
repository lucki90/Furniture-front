import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { renderPantryPassage } from './pantry-passage.renderer';

describe('renderPantryPassage', () => {
  it('renders one full-height door with the attached-plinth bend line', () => {
    const fronts: DisplayFront[] = [];
    const handles: DisplayHandle[] = [];

    renderPantryPassage(createContext({
      pantryPassageFrontType: 'ONE_DOOR',
      pantryAttachedPlinthHeightPx: 25
    }), fronts, handles);

    expect(fronts).toEqual([
      {
        type: 'DOOR_SINGLE',
        x: 12,
        y: 22,
        width: 76,
        height: 196,
        hingesSide: 'LEFT'
      },
      {
        type: 'PLINTH_BREAK_LINE',
        x: 13,
        y: 195,
        width: 74,
        height: 1
      }
    ]);
    expect(handles).toHaveSize(1);
  });

  it('renders two full-height doors and keeps the plinth line across both wings', () => {
    const fronts: DisplayFront[] = [];
    const handles: DisplayHandle[] = [];

    renderPantryPassage(createContext({
      pantryPassageFrontType: 'TWO_DOORS',
      pantryAttachedPlinthHeightPx: 20
    }), fronts, handles);

    expect(fronts.filter(front => front.type === 'DOOR_SINGLE')).toEqual([
      {
        type: 'DOOR_SINGLE',
        x: 12,
        y: 22,
        width: 37,
        height: 196,
        hingesSide: 'LEFT'
      },
      {
        type: 'DOOR_SINGLE',
        x: 51,
        y: 22,
        width: 37,
        height: 196,
        hingesSide: 'RIGHT'
      }
    ]);
    expect(fronts.find(front => front.type === 'PLINTH_BREAK_LINE')).toEqual({
      type: 'PLINTH_BREAK_LINE',
      x: 13,
      y: 200,
      width: 74,
      height: 1
    });
    expect(handles).toHaveSize(2);
  });

  it('does not render a bend line when the attached plinth is disabled', () => {
    const fronts: DisplayFront[] = [];

    renderPantryPassage(createContext({
      pantryPassageFrontType: 'ONE_DOOR',
      pantryAttachedPlinthHeightPx: 0
    }), fronts, []);

    expect(fronts).toHaveSize(1);
    expect(fronts.some(front => front.type === 'PLINTH_BREAK_LINE')).toBeFalse();
  });

  function createContext(overrides: Partial<CabinetRenderContext>): CabinetRenderContext {
    return {
      displayX: 10,
      bodyY: 20,
      displayWidth: 80,
      bodyHeight: 200,
      frontGap: 2,
      frontMountingType: 'OVERLAY',
      carcassEdgeX: 2,
      carcassEdgeY: 2,
      scaleVert: 0.1,
      ...overrides
    };
  }
});
