import { FormBuilder } from '@angular/forms';
import { DefaultKitchenFormFactory } from '../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../model/kitchen-cabinet-type';
import { ProjectSettingsConstraints } from '../model/kitchen-cabinet-constants';
import { KitchenCabinetTypeConfig } from './kitchen-cabinet-type-config';
import { CabinetFormVisibility } from './preparer/cabinet-form-visibility';
import {
  CabinetRequestFormValue,
  DEFAULT_MATERIAL_DEFAULTS
} from './request-mapper/kitchen-cabinet-request-mapper';

describe('Simple door cabinet type factories', () => {
  const cases = [
    {
      type: KitchenCabinetType.BASE_ONE_DOOR,
      level: 'BASE',
      width: 400,
      depth: 500,
      frontType: 'ONE_DOOR'
    },
    {
      type: KitchenCabinetType.BASE_TWO_DOOR,
      level: 'BASE',
      width: 600,
      depth: 500,
      frontType: 'TWO_DOORS'
    },
    {
      type: KitchenCabinetType.UPPER_ONE_DOOR,
      level: 'UPPER',
      width: 400,
      depth: 340,
      frontType: 'ONE_DOOR',
      resetsLiftUp: true
    },
    {
      type: KitchenCabinetType.UPPER_TWO_DOOR,
      level: 'UPPER',
      width: 600,
      depth: 340,
      frontType: 'TWO_DOORS',
      resetsLiftUp: false
    }
  ] as const;

  for (const testCase of cases) {
    it(`prepares ${testCase.type} defaults and visibility`, () => {
      const form = DefaultKitchenFormFactory.create(new FormBuilder());
      const visibility = {} as CabinetFormVisibility;
      form.get('isLiftUp')?.setValue(true);

      KitchenCabinetTypeConfig[testCase.type].preparer.prepare(form, visibility);

      expect(form.getRawValue()).toEqual(jasmine.objectContaining({
        width: testCase.width,
        height: 720,
        depth: testCase.depth,
        shelfQuantity: 1,
        drawerQuantity: 0,
        drawerModel: null
      }));
      expect(visibility.width).toBeTrue();
      expect(visibility.shelfQuantity).toBeTrue();
      expect(visibility.drawerQuantity).toBeFalse();
      expect(form.get('shelfQuantity')?.enabled).toBeTrue();
      expect(form.get('drawerQuantity')?.disabled).toBeTrue();
      expect(form.get('drawerModel')?.disabled).toBeTrue();

      if (testCase.level === 'UPPER') {
        expect(visibility.positioningMode).toBeTrue();
        expect(visibility.gapFromCountertopMm).toBeTrue();
        expect(form.getRawValue()).toEqual(jasmine.objectContaining({
          positioningMode: 'RELATIVE_TO_CEILING',
          gapFromCountertopMm: ProjectSettingsConstraints.UPPER_GAP_FROM_COUNTERTOP_DEFAULT,
          isFrontExtended: false
        }));
        expect(form.get('isLiftUp')?.value).toBe(testCase.resetsLiftUp ? false : true);
      } else {
        expect(visibility.bottomWreathOnFloor).toBeTrue();
        expect(visibility.positioningMode).toBeFalse();
      }
    });

    it(`maps ${testCase.type} to the standard calculation request`, () => {
      const formValue = {
        width: testCase.width,
        height: 720,
        depth: testCase.depth,
        shelfQuantity: 2,
        openingType: 'CLICK',
        isFrontExtended: true,
        isLiftUp: false
      } as CabinetRequestFormValue;

      const request = KitchenCabinetTypeConfig[testCase.type].requestMapper.map(
        formValue,
        DEFAULT_MATERIAL_DEFAULTS
      );

      expect(request).toEqual(jasmine.objectContaining({
        kitchenCabinetType: testCase.type,
        width: testCase.width,
        height: 720,
        depth: testCase.depth,
        shelfQuantity: 2,
        frontType: testCase.frontType,
        openingType: 'CLICK',
        needBacks: true,
        isHanging: testCase.level === 'UPPER',
        isHangingOnRail: testCase.level === 'UPPER',
        isStandingOnFeet: false,
        isFrontExtended: testCase.level === 'UPPER',
        drawerRequest: null,
        materialRequest: jasmine.objectContaining({
          boxMaterial: DEFAULT_MATERIAL_DEFAULTS.boxMaterial,
          frontMaterial: DEFAULT_MATERIAL_DEFAULTS.frontMaterial
        })
      }));
    });
  }

  it('maps lift-up only for UPPER_ONE_DOOR when explicitly enabled', () => {
    const request = KitchenCabinetTypeConfig[KitchenCabinetType.UPPER_ONE_DOOR].requestMapper.map(
      {
        width: 400,
        height: 720,
        depth: 340,
        shelfQuantity: 1,
        openingType: 'HANDLE',
        isLiftUp: true
      } as CabinetRequestFormValue,
      DEFAULT_MATERIAL_DEFAULTS
    );

    expect(request.isLiftUp).toBeTrue();
    expect(request.frontType).toBe('UPWARDS');
  });

  it('does not expose lift-up in the UPPER_TWO_DOOR request', () => {
    const request = KitchenCabinetTypeConfig[KitchenCabinetType.UPPER_TWO_DOOR].requestMapper.map(
      {
        width: 600,
        height: 720,
        depth: 340,
        shelfQuantity: 1,
        openingType: 'HANDLE',
        isLiftUp: true
      } as CabinetRequestFormValue,
      DEFAULT_MATERIAL_DEFAULTS
    );

    expect(request.isLiftUp).toBeUndefined();
    expect(request.frontType).toBe('TWO_DOORS');
  });
});
