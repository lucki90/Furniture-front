import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DraftRecoveryDialogComponent, DraftRecoveryDialogData } from './draft-recovery-dialog.component';

describe('DraftRecoveryDialogComponent', () => {
  function create(data: DraftRecoveryDialogData) {
    const dialogRef = jasmine.createSpyObj<MatDialogRef<DraftRecoveryDialogComponent>>('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [DraftRecoveryDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    const fixture = TestBed.createComponent(DraftRecoveryDialogComponent);
    fixture.detectChanges();
    return { element: fixture.nativeElement as HTMLElement, dialogRef };
  }

  it('pokazuje projekt i czas kopii, a przyciski zwracają wybór', () => {
    const { element, dialogRef } = create({ savedAt: '04.10.2026 10:30', projectName: 'Kuchnia', newerVersionSaved: false });

    expect(element.textContent).toContain('„Kuchnia”');
    expect(element.textContent).toContain('04.10.2026 10:30');
    expect(element.querySelector('.draft-warning')).toBeNull();

    (element.querySelector('.draft-restore-btn') as HTMLButtonElement).click();
    expect(dialogRef.close).toHaveBeenCalledWith('RESTORE');
    (element.querySelector('.draft-discard-btn') as HTMLButtonElement).click();
    expect(dialogRef.close).toHaveBeenCalledWith('DISCARD');
  });

  it('ostrzega, gdy w międzyczasie zapisano nowszą wersję projektu', () => {
    const { element } = create({ savedAt: '04.10.2026 10:30', projectName: null, newerVersionSaved: true });

    expect(element.querySelector('.draft-warning')?.textContent).toContain('nowszą wersję');
  });
});
