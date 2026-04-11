import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '../../../../core/error/toast.service';
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

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private materialAdminService: MaterialAdminService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadMaterials();
  }

  loadMaterials(): void {
    this.loading.set(true);
    this.materialAdminService.getAllMaterials()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (materials) => {
          this.materials.set(materials);
          this.loading.set(false);
        },
        error: () => {
          this.toast.error('Błąd podczas ładowania materiałów');
          this.loading.set(false);
        }
      });
  }

  onToggleActive(material: MaterialOption): void {
    this.materialAdminService.toggleMaterialActive(material.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          const list = this.materials().map(m =>
            m.id === updated.id ? { ...m, active: updated.active } : m
          );
          this.materials.set(list);
          const status = updated.active ? 'aktywny' : 'nieaktywny';
          this.toast.success(`Materiał "${updated.code}" — ${status}`);
        },
        error: () => {
          this.toast.error('Błąd podczas zmiany statusu materiału');
        }
      });
  }
}
