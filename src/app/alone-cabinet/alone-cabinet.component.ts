import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AloneCabinetService} from './service/alone-cabinet.service';
import {TranslationService} from '../translation/translation.service';
import {PrintDocComponent} from '../print-doc/print-doc.component';
import {CabinetVisualizationComponent} from '../cabinet-visualization/cabinet-visualization.component';
import {CabinetConstants} from "./model/cabinet-constants";
import {catchError, finalize, retry, takeUntil, throttleTime} from 'rxjs/operators';
import {of, Subject} from 'rxjs';
import {HttpErrorResponse} from "@angular/common/http";
import {Board, CabinetRequest, CabinetResponse, PrintDocRequest} from "./model/cabinet-form.model";

@Component({
    selector: 'app-alone-cabinet',
    templateUrl: './alone-cabinet.component.html',
    styleUrls: ['./alone-cabinet.component.css'],
    standalone: false
})
export class AloneCabinetComponent implements OnInit, OnDestroy {
  @ViewChild(PrintDocComponent) printDocComponent!: PrintDocComponent;
  @ViewChild(CabinetVisualizationComponent) cabinetVisualizationComponent!: CabinetVisualizationComponent;
  /// stale
  readonly cabinetTypes = CabinetConstants.CABINET_TYPES;
  readonly openingTypes = CabinetConstants.OPENING_TYPES;
  readonly frontTypes = CabinetConstants.FRONT_TYPES;
  readonly materials = CabinetConstants.MATERIALS;
  readonly thicknesses = CabinetConstants.THICKNESSES;
  readonly colors = CabinetConstants.COLORS;
  private readonly DEFAULT_MESSAGES = {
    NO_REQUESTS: 'No requests prepared for sending',
    NO_REQUESTS_PL: 'Brak przygotowanych requestów do wysłania',
    VISUALIZATION_ERROR: 'Visualization error',
    VISUALIZATION_UNAVAILABLE: 'cabinetVisualizationComponent not available',
    NETWORK_ERROR: 'Network connection error',
    INVALID_INPUT: 'Invalid input data',
    INVALID_REQUEST: 'Invalid request. Please check your data.',
    UNEXPECTED_ERROR: 'Unexpected error occurred. Please try again later.',
    // ... inne
  };
  private readonly FORM_VALIDATORS = {
    height: [Validators.required, Validators.min(50), Validators.max(2600)],
    width: [Validators.required, Validators.min(50), Validators.max(1000)],
    depth: [Validators.required, Validators.min(50), Validators.max(1000)],
    shelfQuantity: [Validators.required, Validators.min(0), Validators.max(20)],
    drawerQuantity: [Validators.required, Validators.min(0), Validators.max(10)],
    // ... reszta walidatorów
  };

  /// zmienne
  translationLoading: boolean = true;
  translations: { [key: string]: string } = {};
  selectedLanguage: string = 'pl'; // Default language

  loading = false;
  /** zarządzania subskrypcjami, np:
   * W metodzie ngOnDestroy() emitujemy sygnał
   * w pipe'ach Observable używamy takeUntil(this.destroy$):
   * Gdy destroy$ emituje wartość, wszystkie subskrypcje z takeUntil są automatycznie zakończone
   */
  private destroy$ = new Subject<void>();

  // Tablica przechowująca przygotowane requesty
  multiRequests: CabinetRequest[] = [];
  response?: CabinetResponse;
  errorMessage: string | null = null;

  /// tutaj definijemy domyslna wartosc
  readonly form: FormGroup = this.fb.group({
    height: ['720', this.FORM_VALIDATORS.height],
    width: ['600', this.FORM_VALIDATORS.width],
    depth: ['300', this.FORM_VALIDATORS.depth],
    shelfQuantity: ['0', this.FORM_VALIDATORS.shelfQuantity],
    drawerQuantity: [{value: '0', disabled: true},
      this.FORM_VALIDATORS.drawerQuantity],
    cabinetType: ['STANDARD', Validators.required],
    openingType: ['HANDLE', Validators.required],
    frontType: ['ONE_DOOR', Validators.required],
    needBacks: [true, Validators.required],
    isBackInGroove: [false, Validators.required],
    isHanging: [false, Validators.required],
    isHangingOnRail: [false, Validators.required],
    isStandingOnFeet: [false, Validators.required],
    isFrontExtended: [{value: false, disabled: true}, Validators.required],
    isCoveredWithCounterTop: [false, Validators.required],
    varnishedFront: [{value: false, disabled: true}, Validators.required],
    frontVeneerColor: ['white', Validators.required],
    frontMaterial: ['CHIPBOARD', Validators.required],
    boxMaterial: ['CHIPBOARD', Validators.required],
    boxBoardThickness: [18, Validators.required],
    boxColor: ['white', Validators.required],
    boxVeneerColor: ['white', Validators.required],
    frontBoardThickness: [18, Validators.required],
    frontColor: ['white', Validators.required],
  });

  constructor(
    private cabinetService: AloneCabinetService,
    private translationService: TranslationService,
    private fb: FormBuilder
    // private printDocComponent: PrintDocComponent,
  ) {
  }

  ngOnInit(): void {
    const browserLanguage = this.getBrowserLanguage();
    this.loadTranslations(browserLanguage);

    this.form.get('frontType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(newValue => {
        // Resetuje ilość szuflad, jeśli wybrano inny typ frontu
        if (newValue !== 'DRAWER') {
          this.form.patchValue({drawerQuantity: 0});
          this.form.get('drawerQuantity')?.disable();
          if (this.form.get('isHanging')?.value) {
            this.form.get('isFrontExtended')?.enable()
          }
        } else if (newValue === 'DRAWER') {
          this.form.patchValue({drawerQuantity: 1});
          this.form.get('drawerQuantity')?.enable();
          this.form.get('isFrontExtended')?.disable()
        }
      });

    this.form.get('needBacks')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(newValue => {
        if (newValue) {
          this.form.get('isBackInGroove')?.enable()
        } else {
          this.form.patchValue({isBackInGroove: null});
          this.form.get('isBackInGroove')?.disable()
        }
      });

    this.form.get('isHanging')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(newValue => {
        if (newValue) {
          this.form.get('isHangingOnRail')?.enable()
          this.form.get('isStandingOnFeet')?.disable()
          this.form.patchValue({isStandingOnFeet: false});
          if (this.form.get('frontType')?.value !== 'DRAWER') {
            this.form.get('isFrontExtended')?.enable()
          }
          this.form.get('isCoveredWithCounterTop')?.disable()
        } else {
          this.form.patchValue({isHangingOnRail: false, isFrontExtended: false});
          this.form.get('isHangingOnRail')?.disable()
          this.form.get('isStandingOnFeet')?.enable()
          this.form.get('isFrontExtended')?.disable()
          this.form.get('isCoveredWithCounterTop')?.enable()
        }
      });

    this.form.get('varnishedFront')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(newValue => {
        if (newValue) {
          this.form.get('frontVeneerColor')?.disable()
        } else {
          this.form.patchValue({frontVeneerColor: null});
          this.form.get('frontVeneerColor')?.enable()
        }
      });
    this.form.get('frontMaterial')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(newValue => {
        if (newValue !== 'MDF') {
          this.form.get('varnishedFront')?.disable()
          this.form.patchValue({varnishedFront: false})
        } else if (newValue === 'MDF') {
          this.form.get('varnishedFront')?.enable()
        }
      });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get formValid(): boolean {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
    }
    return this.form.valid;
  }

  private prepareRequestBody(): CabinetRequest {
    return {
      lang: this.selectedLanguage,
      height: this.form.get('height')?.value,
      width: this.form.get('width')?.value,
      depth: this.form.get('depth')?.value,
      shelfQuantity: this.form.get('shelfQuantity')?.value,
      needBacks: this.form.get('needBacks')?.value,
      isHanging: this.form.get('isHanging')?.value,
      isHangingOnRail: this.form.get('isHangingOnRail')?.value,
      isStandingOnFeet: this.form.get('isStandingOnFeet')?.value,
      isBackInGroove: this.form.get('isBackInGroove')?.value,
      isFrontExtended: this.form.get('isFrontExtended')?.value,
      isCoveredWithCounterTop: this.form.get('isCoveredWithCounterTop')?.value,
      varnishedFront: this.form.get('varnishedFront')?.value,
      frontType: this.form.get('frontType')?.value,
      cabinetType: this.form.get('cabinetType')?.value,
      openingType: this.form.get('openingType')?.value,
      drawerQuantity: this.form.get('drawerQuantity')?.value,
      materialRequest: {
        boxMaterial: this.form.get('boxMaterial')?.value,
        boxBoardThickness: this.form.get('boxBoardThickness')?.value,
        boxColor: this.form.get('boxColor')?.value,
        frontMaterial: this.form.get('frontMaterial')?.value,
        frontBoardThickness: this.form.get('frontBoardThickness')?.value,
        frontColor: this.form.get('frontColor')?.value,
        frontVeneerColor: this.form.get('frontVeneerColor')?.value,
        boxVeneerColor: this.form.get('boxVeneerColor')?.value,
      }
    };
  }

  /// Sekcja wysylanai requestow---------------------------------------------------------------------------------------
  calculate(isMany: boolean): void {
    if (isMany && this.multiRequests.length === 0) {
      console.warn(this.DEFAULT_MESSAGES.NO_REQUESTS_PL);
      this.errorMessage = this.translations['no_requests_prepared'] || this.DEFAULT_MESSAGES.NO_REQUESTS;
      return;
    }

    this.errorMessage = null;
    this.loading = true;

    isMany ? this.calculateMany() : this.calculateCabinet();
  }

  private calculateCabinet(): void {
    const requestBody = this.prepareRequestBody();
    this.cabinetService.calculateCabinet(requestBody).pipe(
      retry(2),
      throttleTime(3000),
      takeUntil(this.destroy$), // Automatyczne unsubscribe
      finalize(() => this.loading = false) // Ukrywamy loader w każdym przypadku
    ).subscribe({
      next: (response) => {
        this.response = response;
        this.handleVisualization();
      },
      error: (error) => {
        this.handleRequestError(error);
      }
    });
  }

  // Wysyła listę przygotowanych requestów do endpointu /calculate-many
  private calculateMany(): void {
    this.cabinetService.calculateMany(this.multiRequests).pipe(
      retry(2),
      throttleTime(3000),
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (response) => {
        this.response = response;
      },
      error: (error) => {
        this.handleRequestError(error);
      }
    });
  }

  private handleVisualization(): void {
    if (!this.cabinetVisualizationComponent) {
      console.warn(this.DEFAULT_MESSAGES.VISUALIZATION_UNAVAILABLE);
      return;
    }

    try {
      this.cabinetVisualizationComponent.drawCabinet();
    } catch (e) {
      console.error(this.DEFAULT_MESSAGES.VISUALIZATION_ERROR, e);
      this.errorMessage = this.translations['visualization_error'] || this.DEFAULT_MESSAGES.VISUALIZATION_ERROR;
    }
  }

  private handleRequestError(error: HttpErrorResponse): void {
    if (error.status === 0) {
      this.errorMessage = this.translations['network_error'] || this.DEFAULT_MESSAGES.NETWORK_ERROR;
      return;
    } else if (error.status === 406) {
      this.errorMessage = error.error?.message ?? this.DEFAULT_MESSAGES.INVALID_INPUT;
      return;
    } else if (error.status >= 400 && error.status < 500) {
      this.errorMessage = this.translations['client_error'] || this.DEFAULT_MESSAGES.INVALID_REQUEST;
      return;
    }
    this.errorMessage = this.translations['unexpected_error'] || this.DEFAULT_MESSAGES.UNEXPECTED_ERROR;
  }

// Dodawanie wielu requestow z szafkami
  addRequest(): void {
    const request = this.prepareRequestBody();
    this.multiRequests.push(request);
  }

  /// Sekcja drukowania ------------------------------------------------------------------------------------------------
  prepareDocPrintRequest(): PrintDocRequest[] | null {
    if (!this.response?.boards) return null;

    return this.response?.boards?.map((board: Board) : PrintDocRequest => {
      return {
        quantity: board.quantity,
        symbol: board.color,
        thickness: board.boardThickness,
        length: board.sideX,
        lengthVeneer: board.veneerX,
        width: board.sideY,
        widthVeneer: board.veneerY,
        veneerColor: board.veneerColor,
        sticker: this.translations[board.boardName],
        remarks: board.remarks
      };
    });
  }


  /// Sekcja tlumaczen ------------------------------------------------------------------------------------------------
  /**
   * Pobiera język przeglądarki użytkownika w formacie skróconym (np. 'en' z 'en-US').
   * Jeśli nie można określić języka, zwraca aktualnie wybraną wartość `this.selectedLanguage`.
   *
   * @returns {string} Skrócony kod języka (np. 'pl', 'en').
   */
  getBrowserLanguage(): string {
    const lang = navigator.language || navigator.languages[0];
    return lang ? lang.split('-')[0] : this.selectedLanguage; // np. 'en-US' → 'en'
  }

  /**
   * Ładuje tłumaczenia dla danego języka na podstawie predefiniowanych prefiksów.
   * Ustawia język jako aktualnie wybrany i aktualizuje mapę tłumaczeń po otrzymaniu danych z serwisu.
   * W przypadku błędu wyświetla komunikat w konsoli i ustawia wiadomość o błędzie.
   *
   * @param {string} lang - Kod języka (np. 'pl', 'en'), dla którego mają zostać pobrane tłumaczenia.
   */

  loadTranslations(lang: string): void {
    this.selectedLanguage = lang || 'pl';
    this.translationService.getTranslationsByPrefixes(this.selectedLanguage, CabinetConstants.TRANSLATION_PREFIXES)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(this.translationService.getDefaultTranslations())))
      .subscribe({
        next: translations => this.translations = translations,
        complete: () => this.translationLoading = false
      });
  }

  /**
   * Zwraca przetłumaczoną wersję listy dodatkowych informacji.
   *
   * Każdy element tablicy `additionalInfo` jest tłumaczony na podstawie mapy `translations`.
   * Jeśli tłumaczenie dla danego elementu nie istnieje, zwracana jest jego oryginalna wartość.
   * Elementy są łączone w pojedynczy ciąg znaków, oddzielone znakiem nowej linii.
   *
   * @param additionalInfo - Tablica kluczy do przetłumaczenia (może być undefined).
   * @returns Pojedynczy ciąg przetłumaczonych informacji, oddzielony nowymi liniami.
   */
  getTranslatedAdditionalInfo(additionalInfo: string[] | undefined): string {
    if (!additionalInfo) {
      return ''; // Jeśli brak danych, zwróć pusty ciąg
    }

    return additionalInfo
      .map((info) => this.translations[info] || info) // Tłumacz każdy element lub pozostaw oryginał
      .join('\n'); // Łącz przetłumaczone elementy w ciąg znaków
  }

  /**
   * Obsługuje zmianę języka z kontrolki (np. <select>).
   * Wyciąga wartość języka z eventu i przekazuje ją do metody `onLanguageChange`.
   *
   * @param event - Obiekt zdarzenia DOM pochodzący z elementu select.
   */
  onLanguageChangeEvent(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedValue = target.value;
    this.onLanguageChange(selectedValue);
  }

  /**
   * Ustawia wybrany język i ładuje odpowiadające mu tłumaczenia.
   * Jeżeli przekazany język jest null/undefined, domyślnie ustawiany jest język 'pl'.
   *
   * @param lang - Kod języka, np. 'en', 'pl'.
   */
  onLanguageChange(lang: string) {
    this.selectedLanguage = lang;
    this.selectedLanguage ??= 'pl';
    this.loadTranslations(this.selectedLanguage);
  }

}
