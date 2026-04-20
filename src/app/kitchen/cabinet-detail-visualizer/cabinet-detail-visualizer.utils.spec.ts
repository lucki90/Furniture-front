import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { FrontElement } from '../cabinet-form/model/cabinet-visual-elements.model';
import {
  buildCabinetDetailGeometry,
  buildDefaultCabinetVisualConfig,
  buildHandlePath,
  computeCabinetScale,
  getFeetPositions,
  getFrontRect,
  getHingePositions,
  getKnobPosition,
  isKnobHandle
} from './cabinet-detail-visualizer.utils';

describe('cabinet-detail-visualizer utils', () => {
  const cabinet = {
    type: KitchenCabinetType.BASE_TWO_DOOR,
    width: 600,
    height: 720,
    depth: 560,
    zone: 'BOTTOM' as const
  };

  const options = {
    svgPadding: 10,
    maxSvgWidth: 200,
    maxSvgHeight: 250
  };

  it('builds default visual config for bottom cabinet with plinth and countertop', () => {
    const config = buildDefaultCabinetVisualConfig(cabinet);

    expect(config.baseType).toBe('PLINTH');
    expect(config.hasCountertop).toBeTrue();
    expect(config.fronts.length).toBe(2);
    expect(config.fronts[0].handle?.type).toBe('BAR');
  });

  it('computes scale and geometry from cabinet dimensions', () => {
    const config = buildDefaultCabinetVisualConfig(cabinet);
    const scale = computeCabinetScale(cabinet, options);
    const geometry = buildCabinetDetailGeometry(cabinet, config, options);

    expect(scale).toBeGreaterThan(0);
    expect(scale).toBeLessThanOrEqual(0.3);
    expect(geometry.bodyX).toBe(10);
    expect(geometry.countertopHeight).toBe(38);
    expect(geometry.baseHeight).toBe(100);
    expect(geometry.svgWidth).toBeCloseTo(cabinet.width * scale + 20, 5);
  });

  it('builds front rect and vertical handle path', () => {
    const config = buildDefaultCabinetVisualConfig(cabinet);
    const geometry = buildCabinetDetailGeometry(cabinet, config, options);
    const front = config.fronts[0];

    const rect = getFrontRect(front, geometry);
    const path = buildHandlePath(front, geometry, config.defaultHandle);

    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    expect(path).toContain('M ');
    expect(path).toContain(' L ');
  });

  it('returns knob position when front uses knob handle', () => {
    const config = buildDefaultCabinetVisualConfig(cabinet);
    const geometry = buildCabinetDetailGeometry(cabinet, config, options);
    const knobFront: FrontElement = {
      ...config.fronts[0],
      handle: {
        type: 'KNOB',
        position: 'SIDE_RIGHT',
        orientation: 'VERTICAL',
        offsetFromEdge: 20
      }
    };

    expect(isKnobHandle(knobFront, config.defaultHandle)).toBeTrue();
    const knob = getKnobPosition(knobFront, geometry, config.defaultHandle);
    expect(knob.x).toBeGreaterThan(0);
    expect(knob.y).toBeGreaterThan(0);
  });

  it('creates hinge positions for tall doors and feet positions for feet base', () => {
    const fullCabinet = {
      type: KitchenCabinetType.TALL_CABINET,
      width: 600,
      height: 2100,
      depth: 560,
      zone: 'FULL' as const
    };
    const config = buildDefaultCabinetVisualConfig(fullCabinet);
    config.baseType = 'FEET';
    config.plinth = undefined;
    config.feet = { type: 'ADJUSTABLE', height: 100, quantity: 4 };

    const geometry = buildCabinetDetailGeometry(fullCabinet, config, options);
    const hinges = getHingePositions(config.fronts[0], geometry);
    const feet = getFeetPositions(config.feet, geometry);

    expect(hinges.length).toBe(3);
    expect(feet.length).toBe(4);
    expect(feet[0].x).toBeLessThan(feet[3].x);
  });
});
