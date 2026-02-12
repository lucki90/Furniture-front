import { Page } from '../../price/model/price-entry.model';

// ============ Board Variants ============

export interface BoardVariantAdminResponse {
  id: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  thicknessMm: number;
  colorCode: string;
  varnished: boolean;
  densityKgDm3: number | null;
  priceEntryId: number;
  currentPrice: number | null;
  translationKey: string | null;
  active: boolean;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardVariantCreateRequest {
  materialId: number;
  thicknessMm: number;
  colorCode: string;
  varnished?: boolean;
  densityKgDm3?: number;
  priceEntryId: number;
  translationKey?: string;
}

export interface BoardVariantUpdateRequest {
  thicknessMm?: number;
  colorCode?: string;
  varnished?: boolean;
  densityKgDm3?: number;
  priceEntryId?: number;
  translationKey?: string;
  active?: boolean;
}

// ============ Component Variants ============

export interface ComponentVariantAdminResponse {
  id: number;
  componentId: number;
  componentCode: string;
  componentCategory: string;
  modelCode: string;
  additionalInfo: string | null;
  priceEntryId: number;
  currentPrice: number | null;
  translationKey: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentVariantCreateRequest {
  componentId: number;
  modelCode: string;
  additionalInfo?: string;
  priceEntryId: number;
  translationKey?: string;
}

export interface ComponentVariantUpdateRequest {
  modelCode?: string;
  additionalInfo?: string;
  priceEntryId?: number;
  translationKey?: string;
  active?: boolean;
}

// ============ Job Variants ============

export interface JobVariantAdminResponse {
  id: number;
  jobId: number;
  jobCode: string;
  jobCategory: string;
  variantCode: string;
  unit: string;
  materialId: number | null;
  thicknessThresholdMm: number | null;
  priceEntryId: number;
  currentPrice: number | null;
  translationKey: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobVariantCreateRequest {
  jobId: number;
  variantCode: string;
  unit: string;
  materialId?: number;
  thicknessThresholdMm?: number;
  priceEntryId: number;
  translationKey?: string;
}

export interface JobVariantUpdateRequest {
  variantCode?: string;
  unit?: string;
  materialId?: number;
  thicknessThresholdMm?: number;
  priceEntryId?: number;
  translationKey?: string;
  active?: boolean;
}

// ============ Options (for dropdowns) ============

export interface MaterialOption {
  id: number;
  code: string;
  translationKey: string;
}

export interface ComponentOption {
  id: number;
  code: string;
  category: string;
  translationKey: string;
}

export interface JobOption {
  id: number;
  code: string;
  category: string;
  translationKey: string;
}

// Aliasy zgodne z backendem
export type MaterialOptionResponse = MaterialOption;
export type ComponentOptionResponse = ComponentOption;
export type JobOptionResponse = JobOption;

// ============ Bulk Operations ============

export interface BulkPriceUpdateRequest {
  updates: PriceUpdate[];
}

export interface PriceUpdate {
  priceEntryId: number;
  newPrice: number;
}

export interface BulkPriceUpdateResponse {
  totalRequested: number;
  successfulUpdates: number;
  failedUpdates: number;
  errors: UpdateError[] | null;
}

export interface UpdateError {
  priceEntryId: number;
  message: string;
}

// Re-export Page
export { Page };
