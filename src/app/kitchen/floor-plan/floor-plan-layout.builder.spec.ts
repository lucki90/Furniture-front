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
    expect(countertops[0].lengthMm).toBe(805);
    expect(countertops[1].lengthMm).toBe(910);
  });

  it('should shift countertop run together with base cabinet gapBefore on a linear wall', () => {
    const [wallPosition] = buildWallPositions([
      createWall({
        cabinets: [
          { id: 'base-1', type: KitchenCabinetType.BASE_ONE_DOOR, width: 800, depth: 560, height: 720, openingType: 'LEFT', shelfQuantity: 1, gapBeforeMm: 900 } as any
        ]
      })
    ], {
      svgWidth: 320,
      svgHeight: 240,
      wallThickness: 10,
      padding: 30
    });

    const cabinets = buildCabinetsForWall(wallPosition, 10);
    const countertops = buildCountertopsForWall(wallPosition, {
      wallThickness: 10,
      countertopOverhang: 30,
      countertopStandardDepth: 600
    });

    expect(countertops).toHaveSize(1);
    expect(countertops[0].x).toBeCloseTo(cabinets[0].x - (5 * wallPosition.scale), 3);
    expect(countertops[0].lengthMm).toBe(810);
  });

  it('should clip left side overhang at the wall start for a flush cabinet run', () => {
    const [wallPosition] = buildWallPositions([
      createWall({
        cabinets: [
          { id: 'base-1', type: KitchenCabinetType.BASE_ONE_DOOR, width: 400, depth: 560, height: 720, openingType: 'LEFT', shelfQuantity: 1 } as any
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

    expect(countertops).toHaveSize(1);
    expect(countertops[0].lengthMm).toBe(405);
  });

  it('should keep full side overhang when the cabinet run is offset from the wall start', () => {
    const [wallPosition] = buildWallPositions([
      createWall({
        cabinets: [
          { id: 'base-1', type: KitchenCabinetType.BASE_ONE_DOOR, width: 400, depth: 560, height: 720, openingType: 'LEFT', shelfQuantity: 1, gapBeforeMm: 100 } as any
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

    expect(countertops).toHaveSize(1);
    expect(countertops[0].lengthMm).toBe(410);
  });

  it('should render island depth from configuration and place FRONT/BACK rows separately', () => {
    const [wallPosition] = buildWallPositions([
      createWall({
        type: 'ISLAND',
        widthMm: 2400,
        islandDepthMm: 1000,
        cabinets: [
          { id: 'front', type: KitchenCabinetType.BASE_ONE_DOOR, width: 600, depth: 560, height: 720, openingType: 'LEFT', shelfQuantity: 1, cabinetSide: 'FRONT' } as any,
          { id: 'back', type: KitchenCabinetType.BASE_ONE_DOOR, width: 800, depth: 560, height: 720, openingType: 'LEFT', shelfQuantity: 1, cabinetSide: 'BACK' } as any
        ]
      })
    ], {
      svgWidth: 320,
      svgHeight: 240,
      wallThickness: 10,
      padding: 30
    });

    const cabinets = buildCabinetsForWall(wallPosition, 10, {
      plinthHeightMm: 100,
      upperFillerHeightMm: 100
    });
    const countertops = buildCountertopsForWall(wallPosition, {
      wallThickness: 10,
      countertopOverhang: 30,
      countertopStandardDepth: 600
    });

    expect(wallPosition.height).toBeCloseTo(1000 * wallPosition.scale, 3);
    expect(countertops[0].depthMm).toBe(1000);
    expect(cabinets.find(cab => cab.cabinetId === 'front')).toEqual(jasmine.objectContaining({
      cabinetSide: 'FRONT',
      isReversed: false
    }));
    expect(cabinets.find(cab => cab.cabinetId === 'back')).toEqual(jasmine.objectContaining({
      cabinetSide: 'BACK',
      isReversed: true
    }));
    expect(cabinets.find(cab => cab.cabinetId === 'front')!.y).toBeGreaterThan(cabinets.find(cab => cab.cabinetId === 'back')!.y);
  });

  it('should apply 4D overhangs (front/back/left/right) to island countertop dimensions', () => {
    const [wallPosition] = buildWallPositions([
      createWall({
        type: 'ISLAND',
        widthMm: 2400,
        islandDepthMm: 900,
        adjacentToWall: 'NONE',
        countertopConfig: {
          enabled: true,
          frontOverhangMm: 30,
          backOverhangMm: 20,
          sideOverhangExtraMm: 5
        },
        cabinets: [
          { id: 'front-l', type: KitchenCabinetType.BASE_ONE_DOOR, width: 600, depth: 560, height: 720, openingType: 'LEFT', shelfQuantity: 1, cabinetSide: 'FRONT' } as any
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
      countertopStandardDepth: 600,
      fillerWidthMm: 50
    });

    // depth = islandDepth(900) + frontOverhang(30) + backOverhang(20) = 950
    expect(countertops[0].depthMm).toBe(950);
    // length = islandWidth(2400) + leftOverhang(0+5=5) + rightOverhang(0+5=5) = 2410
    expect(countertops[0].lengthMm).toBe(2410);
  });

  it('should zero overhang on adjacent peninsula side', () => {
    const [wallPosition] = buildWallPositions([
      createWall({
        type: 'ISLAND',
        widthMm: 2400,
        islandDepthMm: 900,
        adjacentToWall: 'BACK',
        countertopConfig: {
          enabled: true,
          frontOverhangMm: 30,
          backOverhangMm: 20,
          sideOverhangExtraMm: 5
        },
        cabinets: []
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
      countertopStandardDepth: 600,
      fillerWidthMm: 50
    });

    // BACK adjacent → backOverhang = 0; depth = 900 + 30 + 0 = 930
    expect(countertops[0].depthMm).toBe(930);
  });

  it('should prefer manualDepthMm over islandDepthMm (mirror of ProjectWallAddonsRequestBuilder)', () => {
    // Symetria z `buildCountertopRequest`: manualDepthMm > islandDepthMm > 600. Floor plan
    // MUSI rysowac to samo, co backend dostaje w request — inaczej user ustawia recznie
    // glebokosc blatu, a rzut z gory pokazuje sam korpus wyspy.
    const [wallPosition] = buildWallPositions([
      createWall({
        type: 'ISLAND',
        widthMm: 2400,
        islandDepthMm: 900,
        adjacentToWall: 'NONE',
        countertopConfig: {
          enabled: true,
          manualDepthMm: 1200,
          frontOverhangMm: 0,
          backOverhangMm: 0,
          sideOverhangExtraMm: 0
        },
        cabinets: []
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
      countertopStandardDepth: 600,
      fillerWidthMm: 50
    });

    // depth = manualDepth(1200) + frontOH(0) + backOH(0), ignorujac islandDepth(900).
    expect(countertops[0].depthMm).toBe(1200);
  });

  it('should return no countertops for ISLAND with explicitly disabled countertopConfig', () => {
    // Mapper zachowuje `{ enabled: false }` po reloadzie projektu z wylaczonym blatem.
    // Floor plan musi to respektowac — inaczej user widzi blat, ktory nie istnieje.
    const [wallPosition] = buildWallPositions([
      createWall({
        type: 'ISLAND',
        widthMm: 2400,
        islandDepthMm: 900,
        adjacentToWall: 'NONE',
        countertopConfig: { enabled: false },
        cabinets: []
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
      countertopStandardDepth: 600,
      fillerWidthMm: 50
    });

    expect(countertops).toEqual([]);
  });

  it('should apply DEFAULT_COUNTERTOP_REQUEST defaults when countertopConfig has no explicit overhangs', () => {
    // Symetria z ProjectWallAddonsRequestBuilder: gdy user nie ustawil overhangow, backend
    // dostaje DEFAULT_COUNTERTOP_REQUEST (front=30, back=0). Floor plan MUSI rysowac to samo.
    const [wallPosition] = buildWallPositions([
      createWall({
        type: 'ISLAND',
        widthMm: 2400,
        islandDepthMm: 900,
        adjacentToWall: 'NONE',
        countertopConfig: { enabled: true },
        cabinets: []
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
      countertopStandardDepth: 600,
      fillerWidthMm: 50
    });

    // depth = 900 + DEFAULT frontOverhang(30) + DEFAULT backOverhang(0) = 930
    expect(countertops[0].depthMm).toBe(930);
  });

  it('should mark both island cabinets in red state when FRONT and BACK depths collide', () => {
    const [wallPosition] = buildWallPositions([
      createWall({
        type: 'ISLAND',
        widthMm: 2400,
        islandDepthMm: 900,
        cabinets: [
          { id: 'front', type: KitchenCabinetType.BASE_ONE_DOOR, width: 600, depth: 560, height: 720, openingType: 'LEFT', shelfQuantity: 1, cabinetSide: 'FRONT' } as any,
          { id: 'back', type: KitchenCabinetType.BASE_ONE_DOOR, width: 600, depth: 400, height: 720, openingType: 'LEFT', shelfQuantity: 1, cabinetSide: 'BACK' } as any
        ]
      })
    ], {
      svgWidth: 320,
      svgHeight: 240,
      wallThickness: 10,
      padding: 30
    });

    const cabinets = buildCabinetsForWall(wallPosition, 10, {
      plinthHeightMm: 100,
      upperFillerHeightMm: 100
    });

    expect(cabinets.find(cab => cab.cabinetId === 'front')?.hasDepthCollision).toBeTrue();
    expect(cabinets.find(cab => cab.cabinetId === 'back')?.hasDepthCollision).toBeTrue();
  });

  it('should not mark island cabinets when FRONT and BACK depths fit inside island depth', () => {
    const [wallPosition] = buildWallPositions([
      createWall({
        type: 'ISLAND',
        widthMm: 2400,
        islandDepthMm: 900,
        cabinets: [
          { id: 'front', type: KitchenCabinetType.BASE_ONE_DOOR, width: 600, depth: 400, height: 720, openingType: 'LEFT', shelfQuantity: 1, cabinetSide: 'FRONT' } as any,
          { id: 'back', type: KitchenCabinetType.BASE_ONE_DOOR, width: 600, depth: 400, height: 720, openingType: 'LEFT', shelfQuantity: 1, cabinetSide: 'BACK' } as any
        ]
      })
    ], {
      svgWidth: 320,
      svgHeight: 240,
      wallThickness: 10,
      padding: 30
    });

    const cabinets = buildCabinetsForWall(wallPosition, 10, {
      plinthHeightMm: 100,
      upperFillerHeightMm: 100
    });

    expect(cabinets.find(cab => cab.cabinetId === 'front')?.hasDepthCollision).not.toBeTrue();
    expect(cabinets.find(cab => cab.cabinetId === 'back')?.hasDepthCollision).not.toBeTrue();
  });
});
