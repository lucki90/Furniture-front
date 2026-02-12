import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { MaterialAdminService } from '../../service/material-admin.service';
import { BoardVariantAdminResponse } from '../../model/material-variant.model';
import { VariantDialogComponent, VariantDialogData } from '../variant-dialog/variant-dialog.component';

@Component({
  selector: 'app-board-variant-list',
  templateUrl: './board-variant-list.component.html',
  styleUrls: ['./board-variant-list.component.css'],
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
    MatCheckboxModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule
  ]
})
export class BoardVariantListComponent implements OnInit {

  displayedColumns: string[] = ['id', 'materialCode', 'thicknessMm', 'colorCode', 'varnished', 'currentPrice', 'active', 'actions'];

  variants = signal<BoardVariantAdminResponse[]>([]);
  totalElements = signal(0);
  pageSize = signal(20);
  pageIndex = signal(0);
  loading = signal(false);

  searchMaterialCode = '';
  activeOnly = false;

  constructor(
    private readonly materialService: MaterialAdminService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadVariants();
  }

  loadVariants(): void {
    this.loading.set(true);
    this.materialService.getBoardVariants(
      this.pageIndex(),
      this.pageSize(),
      this.searchMaterialCode || undefined,
      this.activeOnly
    ).subscribe({
      next: (page) => {
        this.variants.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        this.snackBar.open('Błąd podczas ładowania wariantów płyt', 'Zamknij', { duration: 3000 });
        this.loading.set(false);
        console.error('Error loading board variants:', err);
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

  onClearSearch(): void {
    this.searchMaterialCode = '';
    this.pageIndex.set(0);
    this.loadVariants();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(VariantDialogComponent, {
      width: '600px',
      data: { mode: 'create', type: 'board' } as VariantDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadVariants();
        this.snackBar.open('Wariant płyty został dodany', 'Zamknij', { duration: 3000 });
      }
    });
  }

  openEditDialog(variant: BoardVariantAdminResponse): void {
    const dialogRef = this.dialog.open(VariantDialogComponent, {
      width: '600px',
      data: { mode: 'edit', type: 'board', variant } as VariantDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadVariants();
        this.snackBar.open('Wariant płyty został zaktualizowany', 'Zamknij', { duration: 3000 });
      }
    });
  }

  onDelete(variant: BoardVariantAdminResponse): void {
    if (confirm(`Czy na pewno chcesz usunąć wariant "${variant.materialCode} ${variant.thicknessMm}mm ${variant.colorCode}"?`)) {
      this.materialService.deleteBoardVariant(variant.id).subscribe({
        next: () => {
          this.loadVariants();
          this.snackBar.open('Wariant płyty został usunięty', 'Zamknij', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open('Błąd podczas usuwania wariantu', 'Zamknij', { duration: 3000 });
          console.error('Error deleting board variant:', err);
        }
      });
    }
  }
}
