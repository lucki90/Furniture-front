import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CabinetPresetNameDialogComponent } from './cabinet-preset-name-dialog.component';

describe('CabinetPresetNameDialogComponent', () => {
  function create(name: string) {
    const dialogRef = jasmine.createSpyObj<MatDialogRef<CabinetPresetNameDialogComponent>>('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [CabinetPresetNameDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { title: 'Zapisz jako preset', name, confirmLabel: 'Zapisz preset' } }
      ]
    });
    const fixture = TestBed.createComponent(CabinetPresetNameDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, dialogRef };
  }

  it('zwraca nazwę bez spacji na brzegach', () => {
    const { component, dialogRef } = create('  Dolna 600  ');

    component.confirm();

    expect(dialogRef.close).toHaveBeenCalledWith('Dolna 600');
  });

  it('pusta nazwa nie zamyka okna', () => {
    const { component, dialogRef } = create('   ');

    component.confirm();

    expect(component.nameControl.invalid).toBeTrue();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
