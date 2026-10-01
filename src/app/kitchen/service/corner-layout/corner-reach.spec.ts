import { KitchenCabinetType } from '../../cabinet-form/model/kitchen-cabinet-type';
import {
  cabinetFrontProtrusionMm,
  cabinetReachMm,
  createCornerGeometrySettings,
  isCabinetOnCornerLevel,
  maxCabinetReachMm
} from './corner-reach';
import { base, CORNER_TEST_SETTINGS, placed, tall, upper, upperBlindCorner } from './corner-layout.test-fixtures';

describe('corner-reach', () => {
  describe('cabinetReachMm', () => {
    it('zasięg = głębokość + domyślna grubość frontu', () => {
      expect(cabinetReachMm(base('b', 0, 600).cabinet, CORNER_TEST_SETTINGS)).toBe(578);
    });

    it('grubość frontu z materiału szafki ma pierwszeństwo przed ustawieniem', () => {
      const cabinet = { ...base('b', 0, 600).cabinet, materialRequest: { frontBoardThickness: 22 } } as any;

      expect(cabinetReachMm(cabinet, CORNER_TEST_SETTINGS)).toBe(582);
    });

    it('front wpuszczany nie wystaje przed korpus', () => {
      const cabinet = { ...base('b', 0, 600).cabinet, frontMountingType: 'INSET' } as any;

      expect(cabinetReachMm(cabinet, CORNER_TEST_SETTINGS)).toBe(560);
    });

    it('szafki otwarte i wolnostojące AGD nie mają wystającego frontu', () => {
      const types = [
        KitchenCabinetType.BASE_OPEN,
        KitchenCabinetType.UPPER_OPEN_SHELF,
        KitchenCabinetType.BASE_DISHWASHER_FREESTANDING,
        KitchenCabinetType.BASE_OVEN_FREESTANDING,
        KitchenCabinetType.BASE_FRIDGE_FREESTANDING
      ];

      for (const type of types) {
        expect(cabinetFrontProtrusionMm(placed('c', type, 0, 600, 720, 560).cabinet, CORNER_TEST_SETTINGS))
          .withContext(type)
          .toBe(0);
      }
    });
  });

  describe('createCornerGeometrySettings', () => {
    it('bez ustawień → front 18 mm, luz i blenda 50 mm', () => {
      expect(createCornerGeometrySettings(undefined, null)).toEqual(CORNER_TEST_SETTINGS);
    });

    it('luz narożny pochodzi z ustawienia szerokości blendy', () => {
      expect(createCornerGeometrySettings(40, 19)).toEqual({
        defaultFrontThicknessMm: 19, cornerClearanceMm: 40, enclosureFillerWidthMm: 40
      });
    });

    it('zerowa blenda jest świadomym ustawieniem, a zerowy front — brakiem wartości', () => {
      expect(createCornerGeometrySettings(0, 0)).toEqual({
        defaultFrontThicknessMm: 18, cornerClearanceMm: 0, enclosureFillerWidthMm: 0
      });
    });
  });

  describe('poziomy narożnika', () => {
    it('szafka dolna należy do BASE, wisząca i górny narożnik do UPPER, słupek do obu', () => {
      expect(isCabinetOnCornerLevel(base('b', 0, 600).cabinet, 'BASE')).toBeTrue();
      expect(isCabinetOnCornerLevel(base('b', 0, 600).cabinet, 'UPPER')).toBeFalse();
      expect(isCabinetOnCornerLevel(upper('u', 0, 600).cabinet, 'UPPER')).toBeTrue();
      expect(isCabinetOnCornerLevel(upperBlindCorner('c', 0, 800, 400).cabinet, 'BASE')).toBeFalse();
      expect(isCabinetOnCornerLevel(tall('t', 0, 600).cabinet, 'BASE')).toBeTrue();
      expect(isCabinetOnCornerLevel(tall('t', 0, 600).cabinet, 'UPPER')).toBeTrue();
    });

    it('maxCabinetReachMm liczy tylko szafki danego poziomu', () => {
      const cabinets = [base('b', 0, 600).cabinet, upper('u', 0, 600).cabinet];

      expect(maxCabinetReachMm(cabinets, 'BASE', CORNER_TEST_SETTINGS)).toBe(578);
      expect(maxCabinetReachMm(cabinets, 'UPPER', CORNER_TEST_SETTINGS)).toBe(338);
      expect(maxCabinetReachMm([], 'UPPER', CORNER_TEST_SETTINGS)).toBe(0);
    });
  });
});
