import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OfferDialogOptions, OfferOptionsDialogComponent } from './offer-options-dialog.component';

describe('OfferOptionsDialogComponent', () => {
  let dialogRef: jasmine.SpyObj<MatDialogRef<OfferOptionsDialogComponent>>;

  function createFixture(data: Partial<OfferDialogOptions> | null): ComponentFixture<OfferOptionsDialogComponent> {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [OfferOptionsDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    const fixture = TestBed.createComponent(OfferOptionsDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  function create(data: Partial<OfferDialogOptions> | null): OfferOptionsDialogComponent {
    return createFixture(data).componentInstance;
  }

  it('domyślnie dołącza widoki poglądowe i pokazuje szczegóły kosztów', () => {
    const component = create(null);

    expect(component.includeViews).toBeTrue();
    expect(component.showCostDetails).toBeTrue();
    expect(component.hardwareDescription).toBe('Blum');
  });

  it('przywraca poprzedni wybór, także wyłączone widoki', () => {
    const component = create({ showCostDetails: false, includeViews: false, frontDescription: 'MDF' });

    expect(component.includeViews).toBeFalse();
    expect(component.showCostDetails).toBeFalse();
    expect(component.frontDescription).toBe('MDF');
  });

  it('zwraca opcje z decyzją o widokach i przyciętymi opisami (puste jako brak)', () => {
    const component = create(null);
    component.includeViews = false;
    component.frontDescription = '  Lakier mat  ';
    component.countertopDescription = '   ';

    component.onGenerate();

    expect(dialogRef.close).toHaveBeenCalledWith({
      showCostDetails: true,
      frontDescription: 'Lakier mat',
      countertopDescription: undefined,
      hardwareDescription: 'Blum',
      includeViews: false
    });
  });

  it('pole wyboru widoków jest w oknie', () => {
    const fixture = createFixture(null);

    expect(fixture.nativeElement.textContent).toContain('Dołącz widoki poglądowe (rzut z góry i widoki ścian)');
  });
});
