import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
import { ToastService } from '../../../../core/error/toast.service';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { JobVariantAdminResponse, Page } from '../../model/material-variant.model';
import { MaterialAdminService } from '../../service/material-admin.service';
import { JobVariantListComponent } from './job-variant-list.component';

function makeJobPage(content: JobVariantAdminResponse[]): Page<JobVariantAdminResponse> {
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

describe('JobVariantListComponent', () => {
  let fixture: ComponentFixture<JobVariantListComponent>;
  let component: JobVariantListComponent;
  let materialAdminService: jasmine.SpyObj<MaterialAdminService>;

  const variants: JobVariantAdminResponse[] = [{
    id: 1,
    jobId: 12,
    jobCode: 'CUTTING',
    jobCategory: 'MACHINING',
    variantCode: 'STRAIGHT',
    unit: 'mb',
    materialId: null,
    thicknessThresholdMm: null,
    priceEntryId: 102,
    currentPrice: 5.5,
    translationKey: null,
    active: true,
    createdAt: '2026-05-14T10:00:00Z',
    updatedAt: '2026-05-14T10:00:00Z'
  }];

  beforeEach(async () => {
    materialAdminService = jasmine.createSpyObj<MaterialAdminService>('MaterialAdminService', [
      'getJobVariants',
      'deleteJobVariant'
    ]);
    materialAdminService.getJobVariants.and.returnValue(of(makeJobPage(variants)));

    await TestBed.configureTestingModule({
      imports: [JobVariantListComponent, NoopAnimationsModule],
      providers: [
        { provide: MaterialAdminService, useValue: materialAdminService },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']) },
        { provide: ConfirmDialogService, useValue: jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JobVariantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads job variants on init', () => {
    const count = fixture.nativeElement.querySelector('.settings-toolbar-count') as HTMLElement;
    const firstRow = fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement;

    expect(materialAdminService.getJobVariants).toHaveBeenCalled();
    expect(count.textContent).toContain('1 wariant');
    expect(firstRow.textContent).toContain('CUTTING');
    expect(firstRow.textContent).toContain('STRAIGHT');
  });

  it('renders row action button', () => {
    const actionButton = fixture.nativeElement.querySelector('.actions-cell button') as HTMLElement;

    expect(actionButton).not.toBeNull();
  });

  it('anuluje aktywny request po zniszczeniu komponentu', () => {
    const result$ = new Subject<Page<JobVariantAdminResponse>>();
    materialAdminService.getJobVariants.and.returnValue(result$);
    const localFixture = TestBed.createComponent(JobVariantListComponent);

    localFixture.detectChanges();
    expect(result$.observers.length).toBe(1);

    localFixture.destroy();

    expect(result$.observers.length).toBe(0);
  });
});
