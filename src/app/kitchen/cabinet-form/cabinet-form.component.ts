import { Component, EventEmitter, Output } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import { KitchenService } from '../service/kitchen.service';
import { KitchenCabinetTypeConfig } from './type-config/kitchen-cabinet-type-config';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import {CommonModule} from "@angular/common";

@Component({
  selector: 'app-cabinet-form',
  templateUrl: './cabinet-form.component.html',
  styleUrls: ['./cabinet-form.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class CabinetFormComponent {

  @Output()
  calculated = new EventEmitter<any>();

  form: FormGroup;
  visibility: any = {};
  loading = false;

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

  private onTypeChange(type: KitchenCabinetType): void {
    const config = KitchenCabinetTypeConfig[type];
    config.preparer.prepare(this.form, this.visibility);
    config.validator.validate(this.form);
  }

  calculate(): void {
    this.loading = true;

    const type = this.form.get('kitchenCabinetType')!.value as KitchenCabinetType;
    const mapper = KitchenCabinetTypeConfig[type].requestMapper;
    const request = mapper.map(this.form.getRawValue());

    this.kitchenService.calculateCabinet(request).subscribe({
      next: res => {
        this.calculated.emit(res); // ⬅️ kluczowa zmiana
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.loading = false;
      }
    });
  }
}
