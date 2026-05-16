import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { DropdownComponent } from './dropdown.component';

describe('DropdownComponent', () => {
  let component: DropdownComponent;
  let fixture: ComponentFixture<DropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DropdownComponent],
      imports: [FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(DropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders custom error message when invalid', () => {
    component.errorMessage = 'Wybierz poprawna opcje.';
    component.writeValue(null);

    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.dropdown-error');
    expect(error?.textContent).toContain('Wybierz poprawna opcje.');
  });
});
