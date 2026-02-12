import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MaterialAdminService } from '../../service/material-admin.service';
import {
  MaterialOptionResponse,
  ComponentOptionResponse,
  JobOptionResponse,
  BoardVariantCreateRequest,
  BoardVariantUpdateRequest,
  ComponentVariantCreateRequest,
  ComponentVariantUpdateRequest,
  JobVariantCreateRequest,
  JobVariantUpdateRequest
} from '../../model/material-variant.model';

export type VariantType = 'board' | 'component' | 'job';

export interface VariantDialogData {
  type: VariantType;
  mode: 'create' | 'edit';
  variant?: any;
}

@Component({
  selector: 'app-variant-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './variant-dialog.component.html',
  styleUrl: './variant-dialog.component.css'
})
export class VariantDialogComponent implements OnInit {
  form!: FormGroup;
  loading = signal(false);
  saving = signal(false);

  // Options for dropdowns
  materials = signal<MaterialOptionResponse[]>([]);
  components = signal<ComponentOptionResponse[]>([]);
  jobs = signal<JobOptionResponse[]>([]);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VariantDialogComponent>,
    private materialAdminService: MaterialAdminService,
    @Inject(MAT_DIALOG_DATA) public data: VariantDialogData
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadOptions();

    if (this.data.mode === 'edit' && this.data.variant) {
      this.populateForm();
    }
  }

  private initForm(): void {
    switch (this.data.type) {
      case 'board':
        this.form = this.fb.group({
          materialId: [null, Validators.required],
          thicknessMm: [null, [Validators.required, Validators.min(1)]],
          colorCode: ['', Validators.required],
          varnished: [false],
          densityKgDm3: [null],
          priceEntryId: [null, Validators.required],
          translationKey: [''],
          active: [true]
        });
        break;

      case 'component':
        this.form = this.fb.group({
          componentId: [null, Validators.required],
          modelCode: ['', Validators.required],
          additionalInfo: [''],
          priceEntryId: [null, Validators.required],
          translationKey: [''],
          active: [true]
        });
        break;

      case 'job':
        this.form = this.fb.group({
          jobId: [null, Validators.required],
          variantCode: ['', Validators.required],
          unit: ['', Validators.required],
          materialId: [null],
          thicknessThresholdMm: [null],
          priceEntryId: [null, Validators.required],
          translationKey: [''],
          active: [true]
        });
        break;
    }
  }

  private loadOptions(): void {
    this.loading.set(true);

    switch (this.data.type) {
      case 'board':
        this.materialAdminService.getMaterialOptions().subscribe({
          next: (options) => {
            this.materials.set(options);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
        break;

      case 'component':
        this.materialAdminService.getComponentOptions().subscribe({
          next: (options) => {
            this.components.set(options);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
        break;

      case 'job':
        this.materialAdminService.getJobOptions().subscribe({
          next: (options) => {
            this.jobs.set(options);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
        break;
    }
  }

  private populateForm(): void {
    const v = this.data.variant;

    switch (this.data.type) {
      case 'board':
        this.form.patchValue({
          materialId: v.materialId,
          thicknessMm: v.thicknessMm,
          colorCode: v.colorCode,
          varnished: v.varnished,
          densityKgDm3: v.densityKgDm3,
          priceEntryId: v.priceEntryId,
          translationKey: v.translationKey,
          active: v.active
        });
        break;

      case 'component':
        this.form.patchValue({
          componentId: v.componentId,
          modelCode: v.modelCode,
          additionalInfo: v.additionalInfo,
          priceEntryId: v.priceEntryId,
          translationKey: v.translationKey,
          active: v.active
        });
        break;

      case 'job':
        this.form.patchValue({
          jobId: v.jobId,
          variantCode: v.variantCode,
          unit: v.unit,
          materialId: v.materialId,
          thicknessThresholdMm: v.thicknessThresholdMm,
          priceEntryId: v.priceEntryId,
          translationKey: v.translationKey,
          active: v.active
        });
        break;
    }
  }

  getDialogTitle(): string {
    const action = this.data.mode === 'create' ? 'Dodaj' : 'Edytuj';
    switch (this.data.type) {
      case 'board': return `${action} wariant płyty`;
      case 'component': return `${action} wariant komponentu`;
      case 'job': return `${action} wariant pracy`;
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const formValue = this.form.value;

    if (this.data.mode === 'create') {
      this.createVariant(formValue);
    } else {
      this.updateVariant(formValue);
    }
  }

  private createVariant(formValue: any): void {
    switch (this.data.type) {
      case 'board':
        const boardCreate: BoardVariantCreateRequest = {
          materialId: formValue.materialId,
          thicknessMm: formValue.thicknessMm,
          colorCode: formValue.colorCode,
          varnished: formValue.varnished,
          densityKgDm3: formValue.densityKgDm3,
          priceEntryId: formValue.priceEntryId,
          translationKey: formValue.translationKey
        };
        this.materialAdminService.createBoardVariant(boardCreate).subscribe({
          next: () => this.dialogRef.close(true),
          error: () => this.saving.set(false)
        });
        break;

      case 'component':
        const componentCreate: ComponentVariantCreateRequest = {
          componentId: formValue.componentId,
          modelCode: formValue.modelCode,
          additionalInfo: formValue.additionalInfo,
          priceEntryId: formValue.priceEntryId,
          translationKey: formValue.translationKey
        };
        this.materialAdminService.createComponentVariant(componentCreate).subscribe({
          next: () => this.dialogRef.close(true),
          error: () => this.saving.set(false)
        });
        break;

      case 'job':
        const jobCreate: JobVariantCreateRequest = {
          jobId: formValue.jobId,
          variantCode: formValue.variantCode,
          unit: formValue.unit,
          materialId: formValue.materialId,
          thicknessThresholdMm: formValue.thicknessThresholdMm,
          priceEntryId: formValue.priceEntryId,
          translationKey: formValue.translationKey
        };
        this.materialAdminService.createJobVariant(jobCreate).subscribe({
          next: () => this.dialogRef.close(true),
          error: () => this.saving.set(false)
        });
        break;
    }
  }

  private updateVariant(formValue: any): void {
    const id = this.data.variant.id;

    switch (this.data.type) {
      case 'board':
        const boardUpdate: BoardVariantUpdateRequest = {
          thicknessMm: formValue.thicknessMm,
          colorCode: formValue.colorCode,
          varnished: formValue.varnished,
          densityKgDm3: formValue.densityKgDm3,
          priceEntryId: formValue.priceEntryId,
          translationKey: formValue.translationKey,
          active: formValue.active
        };
        this.materialAdminService.updateBoardVariant(id, boardUpdate).subscribe({
          next: () => this.dialogRef.close(true),
          error: () => this.saving.set(false)
        });
        break;

      case 'component':
        const componentUpdate: ComponentVariantUpdateRequest = {
          modelCode: formValue.modelCode,
          additionalInfo: formValue.additionalInfo,
          priceEntryId: formValue.priceEntryId,
          translationKey: formValue.translationKey,
          active: formValue.active
        };
        this.materialAdminService.updateComponentVariant(id, componentUpdate).subscribe({
          next: () => this.dialogRef.close(true),
          error: () => this.saving.set(false)
        });
        break;

      case 'job':
        const jobUpdate: JobVariantUpdateRequest = {
          variantCode: formValue.variantCode,
          unit: formValue.unit,
          materialId: formValue.materialId,
          thicknessThresholdMm: formValue.thicknessThresholdMm,
          priceEntryId: formValue.priceEntryId,
          translationKey: formValue.translationKey,
          active: formValue.active
        };
        this.materialAdminService.updateJobVariant(id, jobUpdate).subscribe({
          next: () => this.dialogRef.close(true),
          error: () => this.saving.set(false)
        });
        break;
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
