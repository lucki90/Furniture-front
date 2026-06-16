import { DEFAULT_MATERIAL_DEFAULTS, CabinetCalculateRequest } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { CornerCabinetRequest, CornerOpeningType } from '../../model/corner-cabinet.model';
import { CornerCabinetRequestMapper } from './corner-cabinet-request-mapper';

describe('CornerCabinetRequestMapper', () => {
  it('zachowuje BLIND dla wiszącego narożnika Type A zamiast wymuszać TWO_DOORS', () => {
    const mapper = new CornerCabinetRequestMapper();

    const request = mapper.map({
      cornerMechanism: 'FIXED_SHELVES',
      cornerOpeningType: CornerOpeningType.BLIND,
      cornerWidthA: 700,
      cornerWidthB: 700,
      height: 720,
      width: 700,
      depth: 320,
      isUpperCorner: true,
      cornerShelfQuantity: 2
    }, DEFAULT_MATERIAL_DEFAULTS);
    const cornerRequest = expectCornerRequest(request);

    expect(request.frontType).toBe('ONE_DOOR');
    expect(cornerRequest.cornerOpeningType).toBe(CornerOpeningType.BLIND);
    expect(cornerRequest.upperCabinet).toBeTrue();
  });

  it('mapuje wiszący blind corner jako szafkę wiszącą bez nóżek z opcjonalnym przedłużanym frontem', () => {
    const mapper = new CornerCabinetRequestMapper();

    const request = mapper.map({
      cornerMechanism: 'BLIND_CORNER',
      cornerWidthA: 1000,
      height: 720,
      width: 1000,
      depth: 510,
      cornerFrontUchylnyWidthMm: 500,
      isUpperCorner: true,
      isFrontExtended: true
    }, DEFAULT_MATERIAL_DEFAULTS);
    const cornerRequest = expectCornerRequest(request);

    expect(request.frontType).toBe('CORNER_BLIND');
    expect(cornerRequest.upperCabinet).toBeTrue();
    expect(request.isHanging).toBeTrue();
    expect(request.isHangingOnRail).toBeTrue();
    expect(request.isStandingOnFeet).toBeFalse();
    expect(request.isCoveredWithCounterTop).toBeFalse();
    expect(request.isFrontExtended).toBeTrue();
  });

  // Tylko BLIND_CORNER ma wariant wiszący. Magic/Le Mans pozostają dolne niezależnie od flagi.
  it('pozostawia Magic Corner jako szafkę dolną nawet gdy formularz ma isUpperCorner', () => {
    const mapper = new CornerCabinetRequestMapper();

    const request = mapper.map({
      cornerMechanism: 'MAGIC_CORNER_COMFORT',
      cornerWidthA: 1000,
      height: 720,
      width: 1000,
      depth: 510,
      cornerFrontUchylnyWidthMm: 500,
      isUpperCorner: true,
      isFrontExtended: true
    }, DEFAULT_MATERIAL_DEFAULTS);
    const cornerRequest = expectCornerRequest(request);

    expect(cornerRequest.upperCabinet).toBeFalse();
    expect(request.isHanging).toBeFalse();
    expect(request.isStandingOnFeet).toBeTrue();
    expect(request.isCoveredWithCounterTop).toBeTrue();
    expect(request.isFrontExtended).toBeFalse();
  });

  it('zachowuje split frontu ślepego, gdy FS1 jest jawnie ustawione na 0 mm', () => {
    const mapper = new CornerCabinetRequestMapper();

    const request = mapper.map({
      cornerMechanism: 'BLIND_CORNER',
      cornerWidthA: 1000,
      height: 720,
      width: 1000,
      depth: 510,
      cornerFrontUchylnyWidthMm: 500,
      blindPanelSplitEnabled: true,
      blindPanelVisibleWidthMm: 0,
      cornerHandleType: 'PUSH_TO_OPEN'
    }, DEFAULT_MATERIAL_DEFAULTS);
    const cornerRequest = expectCornerRequest(request);

    expect(cornerRequest.blindPanelVisibleWidthMm).toBe(0);
  });
});

function expectCornerRequest(request: CabinetCalculateRequest): CornerCabinetRequest {
  expect(request.cornerRequest).toBeDefined();
  return request.cornerRequest as CornerCabinetRequest;
}
