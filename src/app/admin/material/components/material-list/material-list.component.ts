import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MaterialAdminService } from '../../service/material-admin.service';
import { MaterialOption } from '../../model/material-variant.model';

@Component({
  selector: 'app-material-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  templateUrl: './material-list.component.html',
  styleUrl: './material-list.component.css'
})
export class MaterialListComponent implements OnInit {
  displayedColumns = ['code', 'translationKey', 'active'];

  materials = signal<MaterialOption[]>([]);
  loading = signal(false);

  constructor(
    private materialAdminService: MaterialAdminService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadMaterials();
  }

  loadMaterials(): void {
    this.loading.set(true);
    this.materialAdminService.getAllMaterials().subscribe({
      next: (materials) => {
        this.materials.set(materials);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Błąd podczas ładowania materiałów', 'OK', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  onToggleActive(material: MaterialOption): void {
    this.materialAdminService.toggleMaterialActive(material.id).subscribe({
      next: (updated) => {
        const list = this.materials().map(m =>
          m.id === updated.id ? { ...m, active: updated.active } : m
        );
        this.materials.set(list);
        const status = updated.active ? 'aktywny' : 'nieaktywny';
        this.snackBar.open(`Materiał "${updated.code}" — ${status}`, 'OK', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Błąd podczas zmiany statusu materiału', 'OK', { duration: 3000 });
      }
    });
  }
}
