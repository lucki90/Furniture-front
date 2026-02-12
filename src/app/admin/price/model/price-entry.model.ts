/**
 * Response z danymi pozycji cenowej dla panelu administracyjnego.
 */
export interface PriceEntryAdminResponse {
  id: number;
  name: string | null;
  description: string | null;
  unit: string;
  currency: string;
  currentPrice: number;
  sourceUrl: string | null;
  urlSelector: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request do utworzenia nowej pozycji cenowej.
 */
export interface PriceEntryCreateRequest {
  name?: string;
  description?: string;
  unit: string;
  currency?: string;
  currentPrice: number;
  sourceUrl?: string;
  urlSelector?: string;
}

/**
 * Request do aktualizacji pozycji cenowej.
 */
export interface PriceEntryUpdateRequest {
  name?: string;
  description?: string;
  unit?: string;
  currency?: string;
  currentPrice?: number;
  sourceUrl?: string;
  urlSelector?: string;
  isActive?: boolean;
}

/**
 * Wynik importu cen z pliku CSV/Excel.
 */
export interface PriceImportResultResponse {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: ImportError[] | null;
}

export interface ImportError {
  rowNumber: number;
  field?: string;
  message: string;
}

/**
 * Wynik scrapingu pojedynczej ceny.
 */
export interface ScrapingResultResponse {
  priceEntryId: number;
  priceEntryName: string | null;
  success: boolean;
  previousPrice: number | null;
  newPrice: number | null;
  priceDifference: number | null;
  errorMessage: string | null;
  scrapedAt: string;
}

/**
 * Wynik scrapingu wszystkich cen.
 */
export interface ScrapingAllResultResponse {
  totalPriceEntries: number;
  successfulScrapes: number;
  failedScrapes: number;
  skippedNoUrl: number;
  results: ScrapingResultResponse[];
}

/**
 * Pageable response z Spring Data.
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
