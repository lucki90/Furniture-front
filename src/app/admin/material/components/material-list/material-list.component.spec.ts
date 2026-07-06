import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ToastService } from '../../../../core/error/toast.service';
import { MaterialAdminService } from '../../service/material-admin.service';
import { MaterialOption } from '../../model/material-variant.model';
import { MaterialListComponent } from './material-list.component';

describe('MaterialListComponent', () => {
  let fixture: ComponentFixture<MaterialListComponent>;
  let component: MaterialListComponent;
  let materialAdminService: jasmine.SpyObj<MaterialAdminService>;
  let toastService: jasmine.SpyObj<ToastService>;

  const materials: MaterialOption[] = [
    { id: 1, code: 'CHIPBOARD', translationKey: 'MATERIAL.CHIPBOARD', active: true },
    { id: 2, code: 'MDF', translationKey: 'MATERIAL.MDF', active: false }
  ];

  beforeEach(async () => {
    materialAdminService = jasmine.createSpyObj<MaterialAdminService>('MaterialAdminService', [
      'getAllMaterials',
      'toggleMaterialActive'
    ]);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);

    materialAdminService.getAllMaterials.and.returnValue(of(materials));
    materialAdminService.toggleMaterialActive.and.returnValue(of({ ...materials[0], active: false }));

    await TestBed.configureTestingModule({
      imports: [MaterialListComponent, NoopAnimationsModule],
      providers: [
        { provide: MaterialAdminService, useValue: materialAdminService },
        { provide: ToastService, useValue: toastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MaterialListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads materials on init and renders summary chips', () => {
    const chips = Array.from<Element>(
      fixture.nativeElement.querySelectorAll('.admin-meta-chip')
    ).map(element => element.textContent?.trim());
    const count = fixture.nativeElement.querySelector('.settings-toolbar-count') as HTMLElement;

    expect(materialAdminService.getAllMaterials).toHaveBeenCalled();
    expect(component.materials().length).toBe(2);
    expect(chips).toContain('1 aktywny');
    expect(chips).toContain('1 nieaktywny');
    expect(count.textContent).toContain('2 materiały');
  });

  it('renders an empty state when the service returns no materials', async () => {
    materialAdminService.getAllMaterials.and.returnValue(of([]));

    fixture = TestBed.createComponent(MaterialListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyState = fixture.nativeElement.querySelector('.empty-state p') as HTMLElement;

    expect(emptyState.textContent).toContain('Brak materiałów w bazie danych');
  });

  it('updates local state after toggling material status', () => {
    component.onToggleActive(materials[0]);
    fixture.detectChanges();

    expect(materialAdminService.toggleMaterialActive).toHaveBeenCalledWith(1);
    expect(component.materials()[0].active).toBeFalse();
    expect(toastService.success).toHaveBeenCalledWith('Materiał "CHIPBOARD" - nieaktywny');
  });
});
