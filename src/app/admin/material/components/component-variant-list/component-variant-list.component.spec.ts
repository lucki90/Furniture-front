import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ToastService } from '../../../../core/error/toast.service';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { ComponentVariantAdminResponse, Page } from '../../model/material-variant.model';
import { MaterialAdminService } from '../../service/material-admin.service';
import { ComponentVariantListComponent } from './component-variant-list.component';

function makeComponentPage(content: ComponentVariantAdminResponse[]): Page<ComponentVariantAdminResponse> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: content.length || 10,
    number: 0,
    first: true,
    last: true,
    empty: content.length === 0
  };
}

describe('ComponentVariantListComponent', () => {
  let fixture: ComponentFixture<ComponentVariantListComponent>;
  let component: ComponentVariantListComponent;
  let materialAdminService: jasmine.SpyObj<MaterialAdminService>;

  const variants: ComponentVariantAdminResponse[] = [{
    id: 1,
    componentId: 11,
    componentCode: 'HINGE',
    componentCategory: 'HINGES',
    modelCode: 'BLUM-71B3550',
    additionalInfo: 'Soft close',
    priceEntryId: 101,
    currentPrice: 12.5,
    translationKey: null,
    active: true,
    createdAt: '2026-05-14T10:00:00Z',
    updatedAt: '2026-05-14T10:00:00Z'
  }];

  beforeEach(async () => {
    materialAdminService = jasmine.createSpyObj<MaterialAdminService>('MaterialAdminService', [
      'getComponentVariants',
      'deleteComponentVariant'
    ]);
    materialAdminService.getComponentVariants.and.returnValue(of(makeComponentPage(variants)));

    await TestBed.configureTestingModule({
      imports: [ComponentVariantListComponent, NoopAnimationsModule],
      providers: [
        { provide: MaterialAdminService, useValue: materialAdminService },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']) },
        { provide: ConfirmDialogService, useValue: jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentVariantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads component variants on init', () => {
    const count = fixture.nativeElement.querySelector('.settings-toolbar-count') as HTMLElement;
    const firstRow = fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement;

    expect(materialAdminService.getComponentVariants).toHaveBeenCalled();
    expect(count.textContent).toContain('1 wariant');
    expect(firstRow.textContent).toContain('HINGE');
    expect(firstRow.textContent).toContain('BLUM-71B3550');
  });

  it('renders create action button', () => {
    const createButton = fixture.nativeElement.querySelector('.admin-section-actions .btn-primary') as HTMLElement;

    expect(createButton.textContent).toContain('Dodaj wariant');
  });
});
