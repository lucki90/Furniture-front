import { UpperLiftUpRequestMapper } from './upper-lift-up-request-mapper';

describe('UpperLiftUpRequestMapper', () => {
  const mapper = new UpperLiftUpRequestMapper();
  const materialDefaults = { varnishedFront: false } as any;

  it('maps the selected lift mechanism into the request', () => {
    const result = mapper.map(
      { width: 600, height: 400, depth: 340, liftMechanismType: 'AVENTOS_HK_S' },
      materialDefaults
    );

    expect(result.kitchenCabinetType).toBe('UPPER_LIFT_UP');
    expect(result.isLiftUp).toBeTrue();
    expect(result.frontType).toBe('UPWARDS');
    expect(result.liftMechanismType).toBe('AVENTOS_HK_S');
  });

  it('defaults to GAS_GTV when no mechanism is provided (legacy form data)', () => {
    const result = mapper.map({ width: 600, height: 400, depth: 340 }, materialDefaults);

    expect(result.liftMechanismType).toBe('GAS_GTV');
  });

  it('maps the allowThirdLiftMechanism opt-in flag into the request', () => {
    const result = mapper.map(
      { width: 600, height: 400, depth: 340, liftMechanismType: 'AVENTOS_HK_S', allowThirdLiftMechanism: true },
      materialDefaults
    );

    expect(result.allowThirdLiftMechanism).toBeTrue();
  });

  it('defaults allowThirdLiftMechanism to false when not provided (legacy form data)', () => {
    const result = mapper.map({ width: 600, height: 400, depth: 340 }, materialDefaults);

    expect(result.allowThirdLiftMechanism).toBeFalse();
  });

  it('maps hfUpperFrontHeightMm for AVENTOS_HF_TOP (asymmetric front)', () => {
    const result = mapper.map(
      { width: 600, height: 700, depth: 340, liftMechanismType: 'AVENTOS_HF_TOP', hfUpperFrontHeightMm: 420 },
      materialDefaults
    );

    expect(result.hfUpperFrontHeightMm).toBe(420);
  });

  it('forces hfUpperFrontHeightMm to null for non-HF mechanisms (stale value defense)', () => {
    // Fronty asymetryczne obsługuje tylko AVENTOS_HF_TOP — wartość pozostała po zmianie mechanizmu nie może
    // trafić do backendu (walidator BE odrzuciłby request).
    const result = mapper.map(
      { width: 600, height: 400, depth: 340, liftMechanismType: 'AVENTOS_HK_S', hfUpperFrontHeightMm: 420 },
      materialDefaults
    );

    expect(result.hfUpperFrontHeightMm).toBeNull();
  });

  it('maps hfUpperFrontHeightMm to null when not provided (symmetric default)', () => {
    const result = mapper.map(
      { width: 600, height: 700, depth: 340, liftMechanismType: 'AVENTOS_HF_TOP' },
      materialDefaults
    );

    expect(result.hfUpperFrontHeightMm).toBeNull();
  });
});
