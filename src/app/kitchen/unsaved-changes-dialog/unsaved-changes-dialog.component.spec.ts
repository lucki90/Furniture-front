import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UnsavedChangesDialogComponent } from './unsaved-changes-dialog.component';

describe('UnsavedChangesDialogComponent', () => {
  let fixture: ComponentFixture<UnsavedChangesDialogComponent>;
  let component: UnsavedChangesDialogComponent;
  let dialogRef: jasmine.SpyObj<MatDialogRef<UnsavedChangesDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<UnsavedChangesDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [UnsavedChangesDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { targetLabel: 'otwórz inny projekt' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UnsavedChangesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('closes with save decision', () => {
    component.onSave();

    expect(dialogRef.close).toHaveBeenCalledWith('save');
  });

  it('closes with discard decision', () => {
    component.onDiscard();

    expect(dialogRef.close).toHaveBeenCalledWith('discard');
  });

  it('closes with cancel decision', () => {
    component.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith('cancel');
  });
});
