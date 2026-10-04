import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BulkCabinetChangeDialogComponent, BulkCabinetChangeDialogData } from './bulk-cabinet-change-dialog.component';
import { OAK_PRESET } from './testing/bulk-change.fixture';

describe('BulkCabinetChangeDialogComponent', () => {
  function create(wallCabinetCount = 3) {
    const dialogRef = jasmine.createSpyObj<MatDialogRef<BulkCabinetChangeDialogComponent>>('MatDialogRef', ['close']);
    const data: BulkCabinetChangeDialogData = {
      wallLabel: 'MAIN', wallCabinetCount, projectCabinetCount: 5,
      openingTypes: [{ value: 'HANDLE', label: 'Uchwyt' }, { value: 'CLICK', label: 'Click' }],
      materialPresets: [{ preset: OAK_PRESET, label: 'Dąb' }]
    };
    TestBed.configureTestingModule({
      imports: [BulkCabinetChangeDialogComponent],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }, { provide: MAT_DIALOG_DATA, useValue: data }]
    });
    const fixture = TestBed.createComponent(BulkCabinetChangeDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, dialogRef };
  }

  it('bez wybranej zmiany nie można zastosować; zmiana z presetem materiałowym', () => {
    const { component, dialogRef } = create();
    expect(component.hasChange()).toBeFalse();
    component.apply();
    expect(dialogRef.close).not.toHaveBeenCalled();

    component.form.patchValue({ scope: 'PROJECT', frontMountingType: 'INSET', material: 'OAK' });
    component.apply();

    expect(dialogRef.close).toHaveBeenCalledWith({
      scope: 'PROJECT', openingType: null, frontMountingType: 'INSET', material: { mode: 'PRESET', preset: OAK_PRESET }
    });
  });

  it('materiał z projektu; pusta ściana — domyślnie zakres projektu', () => {
    const { component, dialogRef } = create(0);
    expect(component.form.getRawValue().scope).toBe('PROJECT');

    component.form.patchValue({ material: 'PROJECT' });
    component.apply();

    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({ material: { mode: 'PROJECT' } }));
  });
});
