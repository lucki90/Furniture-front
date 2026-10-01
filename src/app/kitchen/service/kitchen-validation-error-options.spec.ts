import { WallWithCabinets } from '../model/kitchen-state.model';
import { createKitchenValidationErrorOptions } from './kitchen-validation-error-options';

describe('createKitchenValidationErrorOptions', () => {
  it('uses the current project order instead of the numeric part of a cabinet id', () => {
    const options = createKitchenValidationErrorOptions([wall([
      cabinet('cabinet-1'),
      cabinet('cabinet-3', 'Zlew'),
      cabinet('cabinet-8')
    ])]);

    expect(options.formatArgument?.('cabinetId', 'cabinet-3')).toBe('#2 „Zlew” (Ściana główna)');
    expect(options.formatArgument?.('cabinetId2', 'cabinet-8')).toBe('#3 (Ściana główna)');
  });

  it('uses the number displayed on each wall and adds wall context', () => {
    const options = createKitchenValidationErrorOptions([
      wall([cabinet('main-4')], 'MAIN'),
      wall([cabinet('right-9')], 'RIGHT')
    ]);

    expect(options.formatArgument?.('cabinetId1', 'main-4')).toBe('#1 (Ściana główna)');
    expect(options.formatArgument?.('cabinetId2', 'right-9')).toBe('#1 (Ściana prawa)');
  });

  it('numbers the front and back sides of an island like the grouped cabinet list', () => {
    const options = createKitchenValidationErrorOptions([wall([
      cabinet('front-1', undefined, 'FRONT'),
      cabinet('back-1', undefined, 'BACK'),
      cabinet('front-2', undefined, 'FRONT')
    ], 'ISLAND')]);

    expect(options.formatArgument?.('cabinetId', 'front-1')).toBe('#1 (Wyspa kuchenna, strona FRONT)');
    expect(options.formatArgument?.('cabinetId', 'back-1')).toBe('#1 (Wyspa kuchenna, strona BACK)');
    expect(options.formatArgument?.('cabinetId', 'front-2')).toBe('#2 (Wyspa kuchenna, strona FRONT)');
  });

  it('leaves non-cabinet arguments and unknown cabinet ids unchanged', () => {
    const options = createKitchenValidationErrorOptions([wall([cabinet('cabinet-1')])]);

    expect(options.formatArgument?.('wallId', 'wall-7')).toBe('wall-7');
    expect(options.formatArgument?.('cabinetId', 'missing')).toBe('missing');
  });
});

function wall(
  cabinets: Array<{ id: string; name?: string; cabinetSide?: 'FRONT' | 'BACK' }>,
  type: WallWithCabinets['type'] = 'MAIN'
): WallWithCabinets {
  return {
    id: 'wall',
    type,
    widthMm: 3600,
    heightMm: 2600,
    cabinets
  } as WallWithCabinets;
}

function cabinet(
  id: string,
  name?: string,
  cabinetSide?: 'FRONT' | 'BACK'
): { id: string; name?: string; cabinetSide?: 'FRONT' | 'BACK' } {
  return { id, name, cabinetSide };
}
