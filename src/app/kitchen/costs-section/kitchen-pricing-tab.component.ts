import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PricingBreakdown } from '../service/project-pricing.service';

@Component({
  selector: 'app-kitchen-pricing-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './kitchen-pricing-tab.component.html',
  styleUrls: ['./kitchen-pricing-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenPricingTabComponent {
  @Input() pricing: PricingBreakdown | null = null;
  @Input() isPricingLoading = false;
  @Input() isPricingSaving = false;
  @Input() isPdfDownloading = false;
  @Input() pricingDiscountPct = 0;
  @Input() pricingManualOverrideEnabled = false;
  @Input() pricingManualOverride: number | null = null;
  @Input() pricingOfferNotes = '';

  @Output() pricingDiscountPctChange = new EventEmitter<number>();
  @Output() pricingManualOverrideEnabledChange = new EventEmitter<boolean>();
  @Output() pricingManualOverrideChange = new EventEmitter<number | null>();
  @Output() pricingOfferNotesChange = new EventEmitter<string>();
  @Output() savePricing = new EventEmitter<void>();
  @Output() downloadOfferPdf = new EventEmitter<void>();

  onPricingDiscountPctChange(value: string | number): void {
    this.pricingDiscountPctChange.emit(Number(value));
  }

  onPricingManualOverrideEnabledChange(value: boolean): void {
    this.pricingManualOverrideEnabledChange.emit(value);
  }

  onPricingManualOverrideChange(value: string | number): void {
    if (value === '' || value === null) {
      this.pricingManualOverrideChange.emit(null);
      return;
    }
    this.pricingManualOverrideChange.emit(Number(value));
  }

  onPricingOfferNotesChange(value: string): void {
    this.pricingOfferNotesChange.emit(value);
  }
}
