import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DropdownComponent, DropdownOption } from './dropdown.component';

@Component({
  template: `
    <form [formGroup]="form">
      <app-dropdown
        formControlName="choice"
        [options]="options"
      ></app-dropdown>
    </form>
  `,
  standalone: false
})
class DropdownHostComponent {
  form = new FormGroup({
    choice: new FormControl<number | null>(2),
  });

  options: DropdownOption<number>[] = [
    { value: 1, label: 'Jeden' },
    { value: 2, label: 'Dwa' },
  ];
}

describe('DropdownComponent', () => {
  let component: DropdownComponent;
  let fixture: ComponentFixture<DropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DropdownComponent, DropdownHostComponent],
      imports: [ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(DropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('powinien utworzyć komponent', () => {
    expect(component).toBeTruthy();
  });

  it('powinien wyświetlić własny komunikat błędu, gdy wartość jest niepoprawna', () => {
    component.errorMessage = 'Wybierz poprawną opcję.';
    component.writeValue(null);

    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.dropdown-error');
    expect(error?.textContent).toContain('Wybierz poprawną opcję.');
  });

  it('powinien wyświetlić zewnętrzny komunikat błędu zamiast domyślnego', () => {
    component.errorMessage = 'Wybierz poprawną opcję.';
    component.externalErrorMessage = 'Opcja niedostępna dla tej szafki.';
    component.writeValue(1);

    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.dropdown-error');
    expect(error?.textContent).toContain('Opcja niedostępna dla tej szafki.');
  });

  it('powinien zachować typ wartości przy zmianie przez formularz CVA', () => {
    const hostFixture = TestBed.createComponent(DropdownHostComponent);
    hostFixture.detectChanges();

    const select = hostFixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('1');

    select.value = '0';
    select.dispatchEvent(new Event('change'));
    hostFixture.detectChanges();

    expect(hostFixture.componentInstance.form.controls.choice.value).toBe(1);
  });
});
