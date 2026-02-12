import { Component, OnInit, signal } from '@angular/core';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MaterialAdminService } from '../../service/material-admin.service';
import { ComponentVariantAdminResponse } from '../../model/material-variant.model';
import { VariantDialogComponent, VariantDialogData } from '../variant-dialog/variant-dialog.component';

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
    MatSnackBarModule
  ],
  templateUrl: './component-variant-list.component.html',
  styleUrl: './component-variant-list.component.css'
})
export class ComponentVariantListComponent implements OnInit {
  displayedColumns = ['componentCode', 'componentCategory', 'modelCode', 'additionalInfo', 'currentPrice', 'active', 'actions'];

  variants = signal<ComponentVariantAdminResponse[]>([]);
  loading = signal(false);
  totalElements = signal(0);
  pageSize = signal(10);
  pageIndex = signal(0);

  // Filters
  searchQuery = '';
  activeOnly = false;

  constructor(
    private materialAdminService: MaterialAdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadVariants();
  }

  loadVariants(): void {
    this.loading.set(true);

    this.materialAdminService.getComponentVariants(
      this.pageIndex(),
      this.pageSize(),
      this.searchQuery || undefined,
      this.activeOnly
    ).subscribe({
      next: (page) => {
        this.variants.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Błąd podczas ładowania wariantów komponentów', 'OK', { duration: 3000 });
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
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Wariant komponentu został dodany', 'OK', { duration: 3000 });
        this.loadVariants();
      }
    });
  }

  openEditDialog(variant: ComponentVariantAdminResponse): void {
    const dialogData: VariantDialogData = {
      type: 'component',
      mode: 'edit',
      variant: variant
    };

    const dialogRef = this.dialog.open(VariantDialogComponent, {
      data: dialogData,
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Wariant komponentu został zaktualizowany', 'OK', { duration: 3000 });
        this.loadVariants();
      }
    });
  }

  onDelete(variant: ComponentVariantAdminResponse): void {
    if (confirm(`Czy na pewno chcesz usunąć wariant "${variant.modelCode}" komponentu "${variant.componentCode}"?`)) {
      this.materialAdminService.deleteComponentVariant(variant.id).subscribe({
        next: () => {
          this.snackBar.open('Wariant komponentu został usunięty', 'OK', { duration: 3000 });
          this.loadVariants();
        },
        error: () => {
          this.snackBar.open('Błąd podczas usuwania wariantu', 'OK', { duration: 3000 });
        }
      });
    }
  }
}
