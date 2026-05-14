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
    private readonly materialAdminService: MaterialAdminService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadMaterials();
  }

  get activeMaterialsCount(): number {
    return this.materials().filter(material => material.active).length;
  }

  get inactiveMaterialsCount(): number {
    return this.materials().length - this.activeMaterialsCount;
  }

  get activeMaterialsLabel(): string {
    return this.pluralize(this.activeMaterialsCount, 'aktywny', 'aktywne', 'aktywnych');
  }

  get inactiveMaterialsLabel(): string {
    return this.pluralize(this.inactiveMaterialsCount, 'nieaktywny', 'nieaktywne', 'nieaktywnych');
  }

  get materialsCountLabel(): string {
    return this.pluralize(this.materials().length, 'material', 'materialy', 'materialow');
  }

  loadMaterials(): void {
    this.loading.set(true);
    this.materialAdminService.getAllMaterials()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: materials => {
          this.materials.set(materials);
          this.loading.set(false);
        },
        error: () => {
          this.toast.error('Blad podczas ladowania materialow');
          this.loading.set(false);
        }
      });
  }

  onToggleActive(material: MaterialOption): void {
    this.materialAdminService.toggleMaterialActive(material.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          const nextMaterials = this.materials().map(item =>
            item.id === updated.id ? { ...item, active: updated.active } : item
          );

          this.materials.set(nextMaterials);
          const status = updated.active ? 'aktywny' : 'nieaktywny';
          this.toast.success(`Material "${updated.code}" - ${status}`);
        },
        error: () => {
          this.toast.error('Blad podczas zmiany statusu materialu');
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
