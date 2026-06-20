import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastService } from '../../../../core/error/toast.service';
import { MaterialAdminService } from '../../service/material-admin.service';
import { JobVariantAdminResponse } from '../../model/material-variant.model';
import { VariantDialogComponent, VariantDialogData } from '../variant-dialog/variant-dialog.component';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { DIALOG_WIDTH } from '../../../../shared/constants/dialog.constants';
import { VariantListBase } from '../variant-list-base';

@Component({
  selector: 'app-job-variant-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatChipsModule,
    MatProgressSpinnerModule, MatDialogModule, MatTooltipModule,
  ],
  templateUrl: './job-variant-list.component.html',
  styleUrl: './job-variant-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobVariantListComponent extends VariantListBase<JobVariantAdminResponse> implements OnInit {
  displayedColumns = ['jobCode', 'jobCategory', 'variantCode', 'unit', 'currentPrice', 'active', 'actions'];

  private readonly materialAdminService = inject(MaterialAdminService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  ngOnInit(): void {
    this.loadVariants();
  }

  override loadVariants(): void {
    this.loading.set(true);
    this.materialAdminService.getJobVariants(
      this.pageIndex(), this.pageSize(), this.searchQuery || undefined, this.activeOnly
    ).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: page => {
        this.variants.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Błąd podczas ładowania wariantów prac');
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(): void {
    this.dialog.open(VariantDialogComponent, {
      data: { type: 'job', mode: 'create' } as VariantDialogData,
      width: DIALOG_WIDTH.STANDARD,
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      if (result) {
        this.toast.success('Wariant pracy został dodany');
        this.loadVariants();
      }
    });
  }

  openEditDialog(variant: JobVariantAdminResponse): void {
    this.dialog.open(VariantDialogComponent, {
      data: { type: 'job', mode: 'edit', variant } as VariantDialogData,
      width: DIALOG_WIDTH.STANDARD,
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      if (result) {
        this.toast.success('Wariant pracy został zaktualizowany');
        this.loadVariants();
      }
    });
  }

  onDelete(variant: JobVariantAdminResponse): void {
    this.confirmDialog.confirm({
      message: `Czy na pewno chcesz usunąć wariant "${variant.variantCode}" pracy "${variant.jobCode}"?`,
      confirmText: 'Tak',
    }).pipe(
      filter(Boolean),
      switchMap(() => this.materialAdminService.deleteJobVariant(variant.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.toast.success('Wariant pracy został usunięty');
        this.loadVariants();
      },
      error: () => this.toast.error('Błąd podczas usuwania wariantu'),
    });
  }
}
