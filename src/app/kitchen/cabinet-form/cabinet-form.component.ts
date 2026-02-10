import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { KitchenService } from '../service/kitchen.service';
import { KitchenCabinetTypeConfig } from './type-config/kitchen-cabinet-type-config';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { OPENING_TYPES } from './model/kitchen-cabinet-constants';
import { CommonModule } from "@angular/common";
import { CabinetCalculatedEvent, KitchenCabinet } from '../model/kitchen-state.model';

@Component({
  selector: 'app-cabinet-form',
  templateUrl: './cabinet-form.component.html',
  styleUrls: ['./cabinet-form.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class CabinetFormComponent implements OnChanges {

  @Input()
  editingCabinet: KitchenCabinet | null = null;

  @Output()
  calculated = new EventEmitter<CabinetCalculatedEvent>();

  @Output()
  cancelEdit = new EventEmitter<void>();

  form: FormGroup;
  visibility: any = {};
  loading = false;

  readonly openingTypes = OPENING_TYPES;

  get isEditMode(): boolean {
    return this.editingCabinet !== null;
  }

  constructor(
    private fb: FormBuilder,
    private kitchenService: KitchenService
  ) {
    this.form = DefaultKitchenFormFactory.create(this.fb);

    this.onTypeChange(this.form.value.kitchenCabinetType);

    this.form.get('kitchenCabinetType')!
      .valueChanges
      .subscribe(type => this.onTypeChange(type as KitchenCabinetType));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingCabinet'] && this.editingCabinet) {
      this.fillFormWithCabinet(this.editingCabinet);
    }
  }

  private fillFormWithCabinet(cabinet: KitchenCabinet): void {
    this.form.patchValue({
      kitchenCabinetType: cabinet.type,
      openingType: cabinet.openingType,
      width: cabinet.width,
      height: cabinet.height,
      depth: cabinet.depth,
      shelfQuantity: cabinet.shelfQuantity
    });

    this.onTypeChange(cabinet.type);
  }

  private onTypeChange(type: KitchenCabinetType): void {
    const config = KitchenCabinetTypeConfig[type];
    config.preparer.prepare(this.form, this.visibility);
    config.validator.validate(this.form);

    // Jeśli edytujemy, przywróć wartości po przygotowaniu
    if (this.editingCabinet && this.editingCabinet.type === type) {
      this.form.patchValue({
        openingType: this.editingCabinet.openingType,
        width: this.editingCabinet.width,
        height: this.editingCabinet.height,
        depth: this.editingCabinet.depth,
        shelfQuantity: this.editingCabinet.shelfQuantity
      });
    }
  }

  calculate(): void {
    this.loading = true;

    const type = this.form.get('kitchenCabinetType')!.value as KitchenCabinetType;
    const mapper = KitchenCabinetTypeConfig[type].requestMapper;
    const formData = this.form.getRawValue();
    const request = mapper.map(formData);

    this.kitchenService.calculateCabinet(request).subscribe({
      next: res => {
        this.calculated.emit({
          formData: formData,
          result: res,
          editingCabinetId: this.editingCabinet?.id
        });
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.cancelEdit.emit();
  }
}
