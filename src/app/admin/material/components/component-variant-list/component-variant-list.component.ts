import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastService } from '../../../../core/error/toast.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MaterialAdminService } from '../../service/material-admin.service';
import { ComponentVariantAdminResponse } from '../../model/material-variant.model';
import { VariantDialogComponent, VariantDialogData } from '../variant-dialog/variant-dialog.component';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { DIALOG_WIDTH } from '../../../../shared/constants/dialog.constants';

@Component({
  selector: 'app-component-variant-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './component-variant-list.component.html',
  styleUrl: './component-variant-list.component.css'
})
export class ComponentVariantListComponent implements OnInit {
  displayedColumns = ['componentCode', 'componentCategory', 'modelCode', 'additionalInfo', 'currentPrice', 'active', 'actions'];

  private readonly destroyRef = inject(DestroyRef);

  variants = signal<ComponentVariantAdminResponse[]>([]);
  loading = signal(false);
  totalElements = signal(0);
  pageSize = signal(10);
  pageIndex = signal(0);

  searchQuery = '';
  activeOnly = false;

  constructor(
    private readonly materialAdminService: MaterialAdminService,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.loadVariants();
  }

  get totalVariantsLabel(): string {
    return this.pluralize(this.totalElements(), 'wariant', 'warianty', 'wariantow');
  }

  loadVariants(): void {
    this.loading.set(true);

    this.materialAdminService.getComponentVariants(
      this.pageIndex(),
      this.pageSize(),
      this.searchQuery || undefined,
      this.activeOnly
    ).subscribe({
      next: page => {
        this.variants.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Blad podczas ladowania wariantow komponentow');
        this.loading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadVariants();
  }

  onSearch(): void {
    this.pageIndex.set(0);
    this.loadVariants();
  }

  onActiveFilterChange(): void {
    this.pageIndex.set(0);
    this.loadVariants();
  }

  openCreateDialog(): void {
    const dialogData: VariantDialogData = {
      type: 'component',
      mode: 'create'
    };

    const dialogRef = this.dialog.open(VariantDialogComponent, {
      data: dialogData,
      width: DIALOG_WIDTH.STANDARD
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result) {
        this.toast.success('Wariant komponentu zostal dodany');
        this.loadVariants();
      }
    });
  }

  openEditDialog(variant: ComponentVariantAdminResponse): void {
    const dialogData: VariantDialogData = {
      type: 'component',
      mode: 'edit',
      variant
    };

    const dialogRef = this.dialog.open(VariantDialogComponent, {
      data: dialogData,
      width: DIALOG_WIDTH.STANDARD
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result) {
        this.toast.success('Wariant komponentu zostal zaktualizowany');
        this.loadVariants();
      }
    });
  }

  onDelete(variant: ComponentVariantAdminResponse): void {
    this.confirmDialog.confirm({
      message: `Czy na pewno chcesz usunac wariant "${variant.modelCode}" komponentu "${variant.componentCode}"?`,
      confirmText: 'Tak'
    }).pipe(
      filter(Boolean),
      switchMap(() => this.materialAdminService.deleteComponentVariant(variant.id)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success('Wariant komponentu zostal usuniety');
        this.loadVariants();
      },
      error: () => {
        this.toast.error('Blad podczas usuwania wariantu');
      }
    });
  }

  private pluralize(count: number, singular: string, paucal: string, plural: string): string {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (count === 1) {
      return `${count} ${singular}`;
    }

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return `${count} ${paucal}`;
    }

    return `${count} ${plural}`;
  }
}
