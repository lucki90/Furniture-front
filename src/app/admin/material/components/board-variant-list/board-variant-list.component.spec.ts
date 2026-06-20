import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ToastService } from '../../../../core/error/toast.service';
import { LanguageService } from '../../../../service/language.service';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { TranslationService } from '../../../../translation/translation.service';
import { BoardVariantAdminResponse, Page } from '../../model/material-variant.model';
import { MaterialAdminService } from '../../service/material-admin.service';
import { BoardVariantListComponent } from './board-variant-list.component';

function makeBoardPage(content: BoardVariantAdminResponse[]): Page<BoardVariantAdminResponse> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: content.length || 20,
    number: 0,
    first: true,
    last: true,
    empty: content.length === 0
  };
}

describe('BoardVariantListComponent', () => {
  let fixture: ComponentFixture<BoardVariantListComponent>;
  let component: BoardVariantListComponent;
  let materialAdminService: jasmine.SpyObj<MaterialAdminService>;
  let toast: jasmine.SpyObj<ToastService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const variants: BoardVariantAdminResponse[] = [{
    id: 1,
    materialId: 10,
    materialCode: 'CHIPBOARD',
    materialName: 'MATERIAL.CHIPBOARD',
    thicknessMm: 18,
    colorCode: 'WHITE',
    colorName: null,
    colorHex: '#ffffff',
    varnished: false,
    densityKgDm3: null,
    materialActive: true,
    priceEntryId: 100,
    currentPrice: 45,
    translationKey: 'BOARD_VARIANT.WHITE',
    active: true,
    createdById: null,
    createdByName: null,
    createdAt: '2026-05-14T10:00:00Z',
    updatedAt: '2026-05-14T10:00:00Z'
  }];

  beforeEach(async () => {
    materialAdminService = jasmine.createSpyObj<MaterialAdminService>('MaterialAdminService', [
      'getBoardVariants',
      'deleteBoardVariant'
    ]);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getByCategories']);

    materialAdminService.getBoardVariants.and.returnValue(of(makeBoardPage(variants)));
    translationService.getByCategories.and.returnValue(of({
      'MATERIAL.CHIPBOARD': 'Płyta wiórowa',
      'BOARD_VARIANT.WHITE': 'Biały'
    }));

    await TestBed.configureTestingModule({
      imports: [BoardVariantListComponent, NoopAnimationsModule],
      providers: [
        { provide: MaterialAdminService, useValue: materialAdminService },
        { provide: ToastService, useValue: toast },
        { provide: TranslationService, useValue: translationService },
        { provide: LanguageService, useValue: { lang: signal<'pl' | 'en'>('pl') } },
        { provide: ConfirmDialogService, useValue: jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BoardVariantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads variants on init and renders translated values', () => {
    const firstRow = fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement;
    const count = fixture.nativeElement.querySelector('.settings-toolbar-count') as HTMLElement;

    expect(materialAdminService.getBoardVariants).toHaveBeenCalled();
    expect(translationService.getByCategories).toHaveBeenCalledWith(['MATERIAL', 'BOARD_VARIANT'], 'pl');
    expect(firstRow.textContent).toContain('Płyta wiórowa');
    expect(firstRow.textContent).toContain('Biały');
    expect(count.textContent).toContain('1 wariant');
  });

  it('używa domyślnego rozmiaru strony 20 elementów', () => {
    expect(component.pageSize()).toBe(20);
    expect(materialAdminService.getBoardVariants).toHaveBeenCalledWith(0, 20, undefined, false);
  });

  it('renders section action buttons', () => {
    const actionButtons = Array.from<Element>(
      fixture.nativeElement.querySelectorAll('.admin-section-actions .btn')
    ).map(element => element.textContent?.trim().replace(/\s+/g, ' '));

    expect(actionButtons.some(label => label?.includes('Import CSV'))).toBeTrue();
    expect(actionButtons.some(label => label?.includes('Dodaj wariant'))).toBeTrue();
  });

  it('renders empty state when there are no variants', async () => {
    materialAdminService.getBoardVariants.and.returnValue(of(makeBoardPage([])));

    fixture = TestBed.createComponent(BoardVariantListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyState = fixture.nativeElement.querySelector('.empty-state p') as HTMLElement;

    expect(emptyState.textContent).toContain('Brak wariantów płyt');
  });
});
