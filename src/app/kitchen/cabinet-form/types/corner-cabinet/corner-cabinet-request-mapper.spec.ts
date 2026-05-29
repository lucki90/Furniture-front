import { DEFAULT_MATERIAL_DEFAULTS } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { CornerOpeningType } from '../../model/corner-cabinet.model';
import { CornerCabinetRequestMapper } from './corner-cabinet-request-mapper';

describe('CornerCabinetRequestMapper', () => {
  it('preserves BLIND opening type for upper Type A corner instead of forcing TWO_DOORS', () => {
    const mapper = new CornerCabinetRequestMapper();

    const request = mapper.map({
      cornerMechanism: 'FIXED_SHELVES',
      cornerOpeningType: CornerOpeningType.BLIND,
      cornerWidthA: 700,
      cornerWidthB: 700,
      height: 720,
      depth: 320,
      isUpperCorner: true,
      cornerShelfQuantity: 2
    }, DEFAULT_MATERIAL_DEFAULTS);

    expect(request.frontType).toBe('ONE_DOOR');
    expect(request.cornerRequest.cornerOpeningType).toBe(CornerOpeningType.BLIND);
    expect(request.cornerRequest.upperCabinet).toBeTrue();
  });

  it('preserves split blind panel when FS1 is explicitly 0 mm', () => {
    const mapper = new CornerCabinetRequestMapper();

    const request = mapper.map({
      cornerMechanism: 'BLIND_CORNER',
      cornerWidthA: 1000,
      height: 720,
      depth: 510,
      cornerFrontUchylnyWidthMm: 500,
      blindPanelSplitEnabled: true,
      blindPanelVisibleWidthMm: 0,
      cornerHandleType: 'PUSH_TO_OPEN'
    }, DEFAULT_MATERIAL_DEFAULTS);

    expect(request.cornerRequest.blindPanelVisibleWidthMm).toBe(0);
  });
});
