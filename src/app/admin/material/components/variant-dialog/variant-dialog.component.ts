import { Component, DestroyRef, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EMPTY, Observable, debounceTime, distinctUntilChanged, forkJoin, of, switchMap } from 'rxjs';
import { MaterialAdminService } from '../../service/material-admin.service';
import { ApiErrorHandler } from '../../../../core/error/api-error-handler.service';
import { TranslationService } from '../../../../translation/translation.service';
import {
  MaterialOptionResponse,
  ComponentOptionResponse,
  BoardVariantCreateRequest,
  BoardVariantUpdateRequest,
  ComponentVariantCreateRequest,
  ComponentVariantUpdateRequest,
  JobVariantUpdateRequest,
  BoardVariantAdminResponse,
  ComponentVariantAdminResponse,
  JobVariantAdminResponse
} from '../../model/material-variant.model';

export type VariantType = 'board' | 'component' | 'job';

export interface VariantDialogData {
  type: VariantType;
  mode: 'create' | 'edit';
  variant?: BoardVariantAdminResponse | ComponentVariantAdminResponse | JobVariantAdminResponse;
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
  errorMessage = signal<string | null>(null);

  // Options for dropdowns
  materials = signal<MaterialOptionResponse[]>([]);
  components = signal<ComponentOptionResponse[]>([]);

  // Translation management
  translationPl = signal<string>('');
  translationEn = signal<string>('');
  translationKeyExists = signal<boolean | null>(null); // null=unknown, true=exists, false=new key
  translationLoading = signal(false);
  private destroyRef = inject(DestroyRef);
  private translationService = inject(TranslationService);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VariantDialogComponent>,
    private materialAdminService: MaterialAdminService,
    private errorHandler: ApiErrorHandler,
    @Inject(MAT_DIALOG_DATA) public data: VariantDialogData
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadOptions();
    this.setupTranslationPreview();

    if (this.data.mode === 'edit' && this.data.variant) {
      this.populateForm();
    }
  }

  private initForm(): void {
    switch (this.data.type) {
      case 'board':
        this.form = this.fb.group({
          materialId: [null, Validators.required],
          thicknessMm: [null, [Validators.required, Validators.min(2), Validators.max(50)]],
          colorCode: ['', Validators.required],
          colorName: [''],
          colorHex: [''],
          varnished: [false],
          currentPrice: [null, [Validators.required, Validators.min(0.01)]],
          translationKey: [''],
          active: [true]
        });
        if (this.data.mode === 'edit') {
          this.form.get('materialId')?.disable();
        }
        break;

      case 'component':
        this.form = this.fb.group({
          componentId: [null, Validators.required],
          modelCode: ['', [Validators.required, Validators.maxLength(100)]],
          additionalInfo: ['', Validators.maxLength(500)],
          currentPrice: [null, [Validators.required, Validators.min(0.01)]],
          translationKey: ['', Validators.maxLength(255)],
          active: [true]
        });
        if (this.data.mode === 'edit') {
          this.form.get('componentId')?.disable();
        }
        break;

      case 'job':
        this.form = this.fb.group({
          currentPrice: [null, [Validators.required, Validators.min(0.01)]]
        });
        break;
    }
  }

  private setupTranslationPreview(): void {
    const ctrl = this.form?.get('translationKey');
    if (!ctrl) return;

    ctrl.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((key: string) => {
        if (!key || key.length < 3) {
          this.translationPl.set('');
          this.translationEn.set('');
          this.translationKeyExists.set(null);
          return EMPTY;
        }
        this.translationLoading.set(true);
        const category = key.split('.')[0] || key;
        return forkJoin({
          plMap: this.translationService.getByCategory(category, 'pl'),
          enMap: this.translationService.getByCategory(category, 'en'),
          key: Promise.resolve(key)
        });
      })
    ).subscribe(({ plMap, enMap, key }) => {
      this.translationLoading.set(false);
      const plVal = plMap[key] ?? '';
      const enVal = enMap[key] ?? '';
      this.translationPl.set(plVal);
      this.translationEn.set(enVal);
      this.translationKeyExists.set(!!(plVal || enVal));
    });
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
        // Job variant edit — no dropdown needed, only price
        this.loading.set(false);
        break;
    }
  }

  private populateForm(): void {
    if (!this.data.variant) return;

    switch (this.data.type) {
      case 'board': {
        const v = this.data.variant as BoardVariantAdminResponse;
        this.form.patchValue({
          materialId: v.materialId,
          thicknessMm: v.thicknessMm,
          colorCode: v.colorCode,
          colorName: v.colorName || '',
          colorHex: v.colorHex || '',
          varnished: v.varnished,
          currentPrice: v.currentPrice,
          translationKey: v.translationKey,
          active: v.active
        });
        break;
      }

      case 'component': {
        const v = this.data.variant as ComponentVariantAdminResponse;
        this.form.patchValue({
          componentId: v.componentId,
          modelCode: v.modelCode,
          additionalInfo: v.additionalInfo,
          currentPrice: v.currentPrice,
          translationKey: v.translationKey,
          active: v.active
        });
        break;
      }

      case 'job': {
        const v = this.data.variant as JobVariantAdminResponse;
        this.form.patchValue({
          currentPrice: v.currentPrice
        });
        break;
      }
    }
  }

  getDialogTitle(): string {
    const action = this.data.mode === 'create' ? 'Dodaj' : 'Edytuj';
    switch (this.data.type) {
      case 'board': return `${action} wariant płyty`;
      case 'component': return `${action} wariant komponentu`;
      case 'job': return `Edytuj cenę pracy`;
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    const formValue = this.form.getRawValue();

    if (this.data.mode === 'create') {
      this.createVariant(formValue);
    } else {
      this.updateVariant(formValue);
    }
  }

  private handleError(err: unknown): void {
    this.saving.set(false);
    if (err instanceof HttpErrorResponse && err.error?.errors?.length) {
      const messages = (err.error.errors as { field?: string; code: string }[]).map(e =>
        e.field ? `${e.field}: ${e.code}` : e.code
      );
      this.errorMessage.set(messages.join(', '));
    } else if (err instanceof HttpErrorResponse && err.error?.code) {
      this.errorMessage.set(err.error.code as string);
    } else {
      this.errorMessage.set('Wystąpił błąd podczas zapisywania');
    }
    this.errorHandler.handle(err);
  }

  private createVariant(formValue: any): void {
    switch (this.data.type) {
      case 'board':
        const boardCreate: BoardVariantCreateRequest = {
          materialId: formValue.materialId,
          thicknessMm: formValue.thicknessMm,
          colorCode: formValue.colorCode,
          colorName: formValue.colorName || undefined,
          colorHex: formValue.colorHex || undefined,
          varnished: formValue.varnished,
          currentPrice: formValue.currentPrice,
          translationKey: formValue.translationKey
        };
        this.materialAdminService.createBoardVariant(boardCreate).pipe(
          switchMap(() => this.saveTranslationsIfNeeded(formValue.translationKey))
        ).subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => this.handleError(err)
        });
        break;

      case 'component':
        const componentCreate: ComponentVariantCreateRequest = {
          componentId: formValue.componentId,
          modelCode: formValue.modelCode,
          additionalInfo: formValue.additionalInfo,
          currentPrice: formValue.currentPrice,
          translationKey: formValue.translationKey
        };
        this.materialAdminService.createComponentVariant(componentCreate).pipe(
          switchMap(() => this.saveTranslationsIfNeeded(formValue.translationKey))
        ).subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => this.handleError(err)
        });
        break;
    }
  }

  private updateVariant(formValue: any): void {
    // variant is always present in edit mode (checked by caller)
    const id = this.data.variant!.id;

    switch (this.data.type) {
      case 'board':
        const boardUpdate: BoardVariantUpdateRequest = {
          thicknessMm: formValue.thicknessMm,
          colorCode: formValue.colorCode,
          colorName: formValue.colorName || undefined,
          colorHex: formValue.colorHex || undefined,
          varnished: formValue.varnished,
          currentPrice: formValue.currentPrice,
          translationKey: formValue.translationKey,
          active: formValue.active
        };
        this.materialAdminService.updateBoardVariant(id, boardUpdate).pipe(
          switchMap(() => this.saveTranslationsIfNeeded(formValue.translationKey))
        ).subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => this.handleError(err)
        });
        break;

      case 'component':
        const componentUpdate: ComponentVariantUpdateRequest = {
          modelCode: formValue.modelCode,
          additionalInfo: formValue.additionalInfo,
          currentPrice: formValue.currentPrice,
          translationKey: formValue.translationKey,
          active: formValue.active
        };
        this.materialAdminService.updateComponentVariant(id, componentUpdate).pipe(
          switchMap(() => this.saveTranslationsIfNeeded(formValue.translationKey))
        ).subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => this.handleError(err)
        });
        break;

      case 'job':
        const jobUpdate: JobVariantUpdateRequest = {
          currentPrice: formValue.currentPrice
        };
        this.materialAdminService.updateJobVariant(id, jobUpdate).subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => this.handleError(err)
        });
        break;
    }
  }

  /** Saves PL/EN translations if a key is set and values are non-empty. Returns Observable<void>. */
  private saveTranslationsIfNeeded(key: string | null | undefined): Observable<void> {
    if (!key || key.trim().length < 3) return of(undefined as void);
    const entries: { lang: string; value: string }[] = [];
    const pl = this.translationPl().trim();
    const en = this.translationEn().trim();
    if (pl) entries.push({ lang: 'PL', value: pl });
    if (en) entries.push({ lang: 'EN', value: en });
    if (entries.length === 0) return of(undefined as void);
    return this.translationService.upsertTranslations(key.trim(), entries);
  }

  get jobVariant(): JobVariantAdminResponse | undefined {
    return this.data.type === 'job' ? this.data.variant as JobVariantAdminResponse : undefined;
  }

  onColorPickerChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.form.get('colorHex')?.setValue(value);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
