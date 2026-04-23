import { ProjectWallCabinetsBuilder } from './project-wall-cabinets.builder';
import { ProjectWallAddonsRequestBuilder } from './project-wall-addons-request.builder';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { KitchenCabinet, WallWithCabinets } from '../model/kitchen-state.model';
import { WallBuildSettings } from './project-request-builder.models';

/**
 * Tests for ProjectWallCabinetsBuilder focusing on positionY calculation
 * with TALL cabinet auto-detection (Phase 13.3).
 */
describe('ProjectWallCabinetsBuilder', () => {
  let builder: ProjectWallCabinetsBuilder;

  const settings: WallBuildSettings = {
    plinthHeightMm: 100,
    countertopThicknessMm: 38,
    upperFillerHeightMm: 100,
    fillerWidthMm: 0   // no enclosures for simplicity
  };

  beforeEach(() => {
    builder = new ProjectWallCabinetsBuilder(new ProjectWallAddonsRequestBuilder());
  });

  const makeCabinet = (overrides: Partial<KitchenCabinet> & { id?: string }): KitchenCabinet => ({
    id: overrides.id ?? 'cab-test',
    type: KitchenCabinetType.BASE_ONE_DOOR,
    openingType: 'HANDLE',
    width: 600,
    height: 720,
    depth: 560,
    positionY: 0,
    shelfQuantity: 1,
    ...overrides
  } as KitchenCabinet);

  const makeTall = (id = 'tall-1', width = 600, height = 2000): KitchenCabinet =>
    makeCabinet({ id, type: KitchenCabinetType.TALL_CABINET, width, height, depth: 560 });

  const makeFridge = (id = 'fridge-1', width = 600, height = 2000): KitchenCabinet =>
    makeCabinet({ id, type: KitchenCabinetType.BASE_FRIDGE, width, height, depth: 560 });

  const makeUpper = (id = 'upper-1', overrides: Partial<KitchenCabinet> = {}): KitchenCabinet =>
    makeCabinet({
      id,
      type: KitchenCabinetType.UPPER_ONE_DOOR,
      height: 400,
      depth: 320,
      positioningMode: 'RELATIVE_TO_CEILING',
      ...overrides
    });

  const buildWall = (cabinets: KitchenCabinet[], heightMm = 2600): WallWithCabinets => ({
    id: 'wall-1',
    type: 'MAIN',
    widthMm: 3000,
    heightMm,
    cabinets
  });

  const buildRequests = (cabinets: KitchenCabinet[], wallHeightMm = 2600) =>
    builder.buildCabinets(buildWall(cabinets, wallHeightMm), settings);

  // ── calculatePositionY — RELATIVE_TO_CEILING ──────────────────────────────

  describe('calculatePositionY() — UPPER RELATIVE_TO_CEILING', () => {
    /**
     * gapFromAnchorMm jest polem wyłącznie walidacyjnym (backend PlacementValidator).
     * Nie wpływa na obliczoną pozycję — CEILING mode zawsze: wallH - fillerH - upperH.
     * Słupki (TALL_CABINET, BASE_FRIDGE) nie zmieniają positionY szafki wiszącej.
     */

    it('CEILING: wallH - filler - upperH (bez słupka)', () => {
      const upper = makeUpper('upper-1');

      const requests = buildRequests([upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // wallH(2600) - filler(100) - upperH(400) = 2100
      expect(upperReq.positionY).toBe(2100);
    });

    it('CEILING: słupek w tym samym X-range nie zmienia positionY (gapFromAnchorMm = walidacja, nie offset)', () => {
      const tall = makeTall('tall-1', 600, 2000);
      const upper = makeUpper('upper-1');  // X=0, wallH=2600, filler=100, h=400 → 2100

      const requests = buildRequests([tall, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // Ceiling formula: 2600 - 100 - 400 = 2100 (tallTop=2100 to zbieżność, nie powód)
      expect(upperReq.positionY).toBe(2100);
    });

    it('CEILING: gapFromAnchorMm nie jest dodawany do positionY', () => {
      const tall = makeTall('tall-1', 600, 2000);
      const upper = makeUpper('upper-1', { gapFromAnchorMm: 20 });

      const requests = buildRequests([tall, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // positionY = 2600 - 100 - 400 = 2100 (NIE 2120)
      expect(upperReq.positionY).toBe(2100);
    });

    it('CEILING: słupek w innym X-range — ta sama formuła sufitowa', () => {
      // BASE (600mm) przesuwa TALL do X=600. UPPER zaczyna od X=0 → brak X-overlap.
      const base = makeCabinet({ id: 'base-1', type: KitchenCabinetType.BASE_ONE_DOOR });
      const tall = makeTall('tall-1', 600, 2000);
      const upper = makeUpper('upper-1');  // X=0 w strefie TOP

      const requests = buildRequests([base, tall, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // wallH(2600) - filler(100) - upperH(400) = 2100
      expect(upperReq.positionY).toBe(2100);
    });

    it('CEILING: BASE_FRIDGE w tym samym X-range — pozycja od sufitu (nie od lodówki)', () => {
      const fridge = makeFridge('fridge-1', 600, 2000);
      const upper = makeUpper('upper-1');

      const requests = buildRequests([fridge, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // Ceiling formula: 2600 - 100 - 400 = 2100 (fridgeTop=2100 to zbieżność)
      expect(upperReq.positionY).toBe(2100);
    });

    it('BASE_FRIDGE positionY = plinthH (siedzi na cokole jak TALL_CABINET)', () => {
      const fridge = makeFridge('fridge-1', 600, 2000);

      const requests = buildRequests([fridge]);
      const fridgeReq = requests.find(r => r.cabinetId === 'fridge-1')!;

      // BASE_FRIDGE jest pełnowysoka i siedzi na cokole → positionY = plinthH
      expect(fridgeReq.positionY).toBe(settings.plinthHeightMm);
    });

    it('RELATIVE_TO_COUNTERTOP: słupek w zasięgu X nie wpływa na pozycję', () => {
      const tall = makeTall('tall-1', 600, 2000);
      const upper = makeUpper('upper-1', {
        positioningMode: 'RELATIVE_TO_COUNTERTOP',
        gapFromCountertopMm: 500
      });

      const requests = buildRequests([tall, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // countertopH = plinthH(100) + maxBaseH(720 default) + countertopT(38) = 858
      // positionY = 858 + gap(500) = 1358
      expect(upperReq.positionY).toBe(1358);
    });
  });

  // ── Auto-repositioning: UPPER beside TALL when it doesn't fit above ────────

  describe('auto-repositioning: CEILING mode UPPER placed beside TALL when too tall', () => {
    /**
     * When ceilingY (wallH - fillerH - upperH) < tallTop (plinthH + tallH),
     * the UPPER cannot fit above the TALL without going below the anchor top.
     * Frontend auto-repositions it beside the TALL (X = tallEnd) so the SVG
     * doesn't show overlapping cabinets and the backend returns a valid request.
     */

    it('UPPER height=700: ceilingY=1800 < tallTop=2100 → placed beside TALL at X=600', () => {
      // tallTop = plinthH(100) + tallH(2000) = 2100
      const tall = makeTall('tall-1', 600, 2000);
      // ceilingY = wallH(2600) - filler(100) - upperH(700) = 1800 < 2100 → doesn't fit above
      const upper = makeUpper('upper-1', { height: 700, positioningMode: 'RELATIVE_TO_CEILING' });

      const requests = buildRequests([tall, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      expect(upperReq.positionX).toBe(600);    // placed beside TALL
      expect(upperReq.positionY).toBe(1800);   // ceiling formula always: 2600-100-700
    });

    it('UPPER height=400: ceilingY=2100 == tallTop=2100 → fits exactly → stays at X=0', () => {
      // tallTop = 100 + 2000 = 2100; ceilingY = 2600 - 100 - 400 = 2100 — exactly on the boundary
      const tall = makeTall('tall-1', 600, 2000);
      const upper = makeUpper('upper-1', { height: 400, positioningMode: 'RELATIVE_TO_CEILING' });

      const requests = buildRequests([tall, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // tallTop > ceilingY → false (equal, not strictly greater) → no repositioning
      expect(upperReq.positionX).toBe(0);
    });

    it('BASE_FRIDGE as anchor: UPPER too tall → placed beside fridge', () => {
      const fridge = makeFridge('fridge-1', 600, 2000);  // tallTop = 100+2000 = 2100
      const upper = makeUpper('upper-1', { height: 700, positioningMode: 'RELATIVE_TO_CEILING' });
      // ceilingY = 1800 < 2100 → placed beside fridge

      const requests = buildRequests([fridge, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      expect(upperReq.positionX).toBe(600);
    });

    it('UPPER after BASE cabinet does not need repositioning past non-conflicting TALL', () => {
      // BASE occupies X=[0,600], TALL occupies X=[600,1200]. UPPER starts at currentXTop=0.
      // UPPER width=400: range [0,400]. TALL at [600,1200] — no X overlap → stays at X=0.
      const base = makeCabinet({ id: 'base-1', type: KitchenCabinetType.BASE_ONE_DOOR, width: 600 });
      const tall = makeTall('tall-1', 600, 2000);  // tallTop=2100
      const upper = makeUpper('upper-1', { height: 700, positioningMode: 'RELATIVE_TO_CEILING' });

      const requests = buildRequests([base, tall, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // ceilingY=1800 < tallTop=2100, but TALL X=[600,1200] doesn't overlap with UPPER X=[0,400]
      expect(upperReq.positionX).toBe(0);
    });
  });

  // ── blockUpperAbove ───────────────────────────────────────────────────────

  describe('blockUpperAbove — forced repositioning regardless of positioning mode', () => {

    const makeTallBlocked = (id = 'tall-blocked', width = 600, height = 2000): KitchenCabinet =>
      makeCabinet({ id, type: KitchenCabinetType.TALL_CABINET, width, height, depth: 560, blockUpperAbove: true });

    it('CEILING + blockUpperAbove=true: UPPER geometrycznie mieści się (ceilingY==tallTop) → przesuwa obok', () => {
      // tallTop = 100 + 2000 = 2100; ceilingY = 2600 - 100 - 400 = 2100 → równe (fits geometrically)
      // ale blockUpperAbove=true wymusza przesunięcie obok
      const tall = makeTallBlocked('tall-1', 600, 2000);
      const upper = makeUpper('upper-1', { height: 400, positioningMode: 'RELATIVE_TO_CEILING' });

      const requests = buildRequests([tall, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      expect(upperReq.positionX).toBe(600);  // przesuwa obok TALL mimo, że geometrycznie by się zmieścił
    });

    it('RELATIVE_TO_COUNTERTOP + blockUpperAbove=true: UPPER pozycjonowana od blatu → nadal przesuwa X obok', () => {
      // Kluczowy test P1 — bez poprawki COUNTERTOP mode omijał skipPastConflictingAnchors.
      // TALL: X=[0,600], blockUpperAbove=true. UPPER: RELATIVE_TO_COUNTERTOP, starts at X=0.
      const tall = makeTallBlocked('tall-1', 600, 2000);
      const upper = makeUpper('upper-1', {
        positioningMode: 'RELATIVE_TO_COUNTERTOP',
        gapFromCountertopMm: 500
      });

      const requests = buildRequests([tall, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // positionX: przesuwa obok TALL (X=600) mimo trybu COUNTERTOP
      expect(upperReq.positionX).toBe(600);
      // positionY: nadal obliczona jako countertopH + gapFromCountertopMm (nie zmieniona)
      // countertopH = plinthH(100) + maxBaseH(720 default) + countertopT(38) = 858
      expect(upperReq.positionY).toBe(1358);  // 858 + 500
    });

    it('RELATIVE_TO_COUNTERTOP + blockUpperAbove=false: brak przesunięcia (TALL geometrycznie pasuje)', () => {
      // Normalny TALL (blockUpperAbove=false) w COUNTERTOP mode → nie przesuwa
      const tall = makeTall('tall-1', 600, 2000);  // blockUpperAbove domyślnie false/undefined
      const upper = makeUpper('upper-1', {
        positioningMode: 'RELATIVE_TO_COUNTERTOP',
        gapFromCountertopMm: 500
      });

      const requests = buildRequests([tall, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // Brak przesunięcia — geometryczny check (tallTop > ceilingY) nie dotyczy COUNTERTOP mode
      expect(upperReq.positionX).toBe(0);
    });

    it('blockUpperAbove=true + UPPER obok TALL (inny X-range) → brak przesunięcia', () => {
      // UPPER zaczyna za TALL (X=600+) — brak X-overlap → blockUpperAbove nie ma efektu
      const base = makeCabinet({ id: 'base-1', type: KitchenCabinetType.BASE_ONE_DOOR, width: 600 });
      const tall = makeTallBlocked('tall-1', 600, 2000);
      const upper = makeUpper('upper-1', { positioningMode: 'RELATIVE_TO_COUNTERTOP', gapFromCountertopMm: 500 });
      // UPPER currentXTop=0, TALL X=[600,1200] → overlap [0,600] ∩ [600,1200] = touching, nie overlap
      // (strict: anchor.xBodyStart < upperBodyEnd && anchor.xBodyEnd > upperBodyStart)

      const requests = buildRequests([base, tall, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // UPPER X=[0,600], TALL X=[600,1200]: xBodyStart(600) < upperBodyEnd(600)? NO (not strictly)
      // → brak przesunięcia
      expect(upperReq.positionX).toBe(0);
    });

    it('BASE_ONE_DOOR blockUpperAbove=true: UPPER przesuwa obok zwykłej szafki dolnej', () => {
      // Nowy scenariusz: BOTTOM cabinet (nie FULL-zone) z blockUpperAbove=true.
      // BASE: X=[0,600], height=720 → tallTop=820 << ceilingY=2100 (geometry nie blokuje).
      // Ale blockUpperAbove=true → UPPER musi zostać przesunięty za BASE (X=600).
      const base = makeCabinet({ id: 'base-1', type: KitchenCabinetType.BASE_ONE_DOOR, width: 600, blockUpperAbove: true });
      const upper = makeUpper('upper-1', { positioningMode: 'RELATIVE_TO_CEILING' });

      const requests = buildRequests([base, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // UPPER musi zostać przesunięty poza BASE (X=600)
      expect(upperReq.positionX).toBe(600);
    });

    it('BASE_ONE_DOOR blockUpperAbove=true + brak X-overlap: UPPER zostaje w miejscu', () => {
      // BASE: X=[0,600]. Dwie szafki dolne: UPPER startuje od currentXTop=0,
      // ale base2 (X=[600,1200]) nie ma blockUpperAbove — więc UPPER=0 i base nakłada się na X?
      // Uproszczony test: BASE blocked na X=[600,1200], UPPER zaczyna od X=0 (currentXTop=0),
      // więc nie pokrywa się z blocked BASE → brak przesunięcia.
      const base1 = makeCabinet({ id: 'base-1', type: KitchenCabinetType.BASE_ONE_DOOR, width: 600 });
      const base2 = makeCabinet({ id: 'base-2', type: KitchenCabinetType.BASE_ONE_DOOR, width: 400, blockUpperAbove: true });
      // base1 zajmuje X=[0,600], base2 zajmuje X=[600,1000] i ma blockUpperAbove=true.
      // UPPER (width=600) zaczyna od currentXTop=0 → body X=[0,600].
      // base2 body X=[600,1000] → 600 < 600+600? YES. 1000 > 0? YES.
      // WAIT: 600 < 1200? YES. 1000 > 0? YES. Overlap jest! → przesuwa.
      // Zmiana: użyj UPPER width=400, body=[0,400]. base2=[600,1000] → 600 < 400? NO → brak overlap.
      const upper = makeUpper('upper-1', { width: 400, positioningMode: 'RELATIVE_TO_CEILING' });

      const requests = buildRequests([base1, base2, upper]);
      const upperReq = requests.find(r => r.cabinetId === 'upper-1')!;

      // UPPER body X=[0,400] nie pokrywa się z base2 X=[600,1000] → brak przesunięcia
      expect(upperReq.positionX).toBe(0);
    });
  });
});
