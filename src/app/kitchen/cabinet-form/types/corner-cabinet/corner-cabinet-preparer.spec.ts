import { FormBuilder } from '@angular/forms';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { CornerCabinetPreparer } from './corner-cabinet-preparer';

describe('CornerCabinetPreparer', () => {
  it('keeps the generic width control enabled so other cabinet types can still edit width after switching away from corner', () => {
    const form = DefaultKitchenFormFactory.create(new FormBuilder());
    const visibility = {} as CabinetFormVisibility;

    new CornerCabinetPreparer().prepare(form, visibility);

    expect(form.get('width')?.enabled).toBeTrue();
  });
});
