import { buildCabinetsForWall, buildCountertopsForWall, buildWallPositions } from './floor-plan-layout.builder';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

function createWall(overrides: Partial<WallWithCabinets>): WallWithCabinets {
  return {
    id: 'wall-1',
    type: 'MAIN',
    widthMm: 3000,
    heightMm: 2600,
    cabinets: [],
    ...overrides
  };
}

describe('floor-plan-layout.builder', () => {
  it('should position walls around the main wall layout', () => {
    const positions = buildWallPositions([
      createWall({ id: 'main', type: 'MAIN', widthMm: 3000 }),
      createWall({ id: 'left', type: 'LEFT', widthMm: 2000 }),
      createWall({ id: 'right', type: 'RIGHT', widthMm: 1800 })
    ], {
      svgWidth: 320,
      svgHeight: 240,
      wallThickness: 10,
      padding: 30
    });

    expect(positions.map(position => position.wall.type)).toEqual(['MAIN', 'LEFT', 'RIGHT']);
    expect(positions.find(position => position.wall.type === 'MAIN')).toEqual(jasmine.objectContaining({
      isHorizontal: true,
      height: 10
    }));
    expect(positions.find(position => position.wall.type === 'LEFT')).toEqual(jasmine.objectContaining({
      isHorizontal: false,
      width: 10
    }));
  });

  it('should build cabinets for wall with bottom, full and top ordering', () => {
    const [wallPosition] = buildWallPositions([
      createWall({
        cabinets: [
          { id: 'bottom', type: KitchenCabinetType.BASE_ONE_DOOR, width: 800, depth: 560, height: 720, openingType: 'LEFT', shelfQuantity: 1 } as any,
          { id: 'full', type: KitchenCabinetType.TALL_CABINET, width: 600, depth: 560, height: 2200, openingType: 'LEFT', shelfQuantity: 1 } as any,
          { id: 'top', type: KitchenCabinetType.UPPER_ONE_DOOR, width: 700, depth: 320, height: 720, openingType: 'LEFT', shelfQuantity: 1 } as any
        ]
      })
    ], {
      svgWidth: 320,
      svgHeight: 240,
      wallThickness: 10,
      padding: 30
    });

    const cabinets = buildCabinetsForWall(wallPosition, 10);

    expect(cabinets.map(cabinet => cabinet.cabinetId)).toEqual(['bottom', 'full', 'top']);
    expect(cabinets[0].zone).toBe('BOTTOM');
    expect(cabinets[1].zone).toBe('FULL');
    expect(cabinets[2].zone).toBe('TOP');
  });

  it('should split countertop runs around tall or freestanding interruptions', () => {
    const [wallPosition] = buildWallPositions([
      createWall({
        cabinets: [
          { id: 'base-1', type: KitchenCabinetType.BASE_ONE_DOOR, width: 800, depth: 560, height: 720, openingType: 'LEFT', shelfQuantity: 1 } as any,
          { id: 'tall', type: KitchenCabinetType.TALL_CABINET, width: 600, depth: 560, height: 2200, openingType: 'LEFT', shelfQuantity: 1 } as any,
          { id: 'base-2', type: KitchenCabinetType.BASE_WITH_DRAWERS, width: 900, depth: 560, height: 720, openingType: 'LEFT', shelfQuantity: 1, drawerQuantity: 3 } as any
        ]
      })
    ], {
      svgWidth: 320,
      svgHeight: 240,
      wallThickness: 10,
      padding: 30
    });

    const countertops = buildCountertopsForWall(wallPosition, {
      wallThickness: 10,
      countertopOverhang: 30,
      countertopStandardDepth: 600
    });

    expect(countertops).toHaveSize(2);
    expect(countertops[0].lengthMm).toBe(830);
    expect(countertops[1].lengthMm).toBe(930);
  });
});
