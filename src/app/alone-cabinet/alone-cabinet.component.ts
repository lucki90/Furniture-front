import { Component, OnDestroy, OnInit, effect, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { of, Subject } from 'rxjs';

import { AloneCabinetService } from './service/alone-cabinet.service';
import { TranslationService } from '../translation/translation.service';
import { CabinetConstants } from './model/cabinet-constants';
import { AppLanguage, LanguageService } from '../service/language.service';
import { Board, CabinetRequest, CabinetResponse, PrintDocRequest } from './model/cabinet-form.model';
import { ApiErrorResponse } from '../core/error/api-error.model';
import { ErrorTranslationService } from '../core/error/error-translation.service';

type AloneCabinetView = 'config' | 'costs';

@Component({
  selector: 'app-alone-cabinet',
  templateUrl: './alone-cabinet.component.html',
  styleUrls: ['./alone-cabinet.component.css'],
  standalone: false
})
export class AloneCabinetComponent implements OnInit, OnDestroy {
  readonly cabinetTypes = CabinetConstants.CABINET_TYPES;
  readonly openingTypes = CabinetConstants.OPENING_TYPES;
  readonly frontTypes = CabinetConstants.FRONT_TYPES;
  readonly drawerModels = CabinetConstants.DRAWER_MODELS;
  readonly materials = CabinetConstants.MATERIALS;
  readonly thicknesses = CabinetConstants.THICKNESSES;
  readonly colors = CabinetConstants.COLORS;

  private readonly DEFAULT_MESSAGES = {
    NO_REQUESTS: 'No requests prepared for sending',
    NO_REQUESTS_PL: 'Brak przygotowanych requestow do wyslania',
    NETWORK_ERROR: 'Network connection error',
    INVALID_INPUT: 'Invalid input data',
    INVALID_REQUEST: 'Invalid request. Please check your data.',
    UNEXPECTED_ERROR: 'Unexpected error occurred. Please try again later.'
  };

  private readonly FORM_VALIDATORS = {
    height: [Validators.required, Validators.min(50), Validators.max(2600)],
    width: [Validators.required, Validators.min(50), Validators.max(1000)],
    depth: [Validators.required, Validators.min(50), Validators.max(1000)],
    shelfQuantity: [Validators.required, Validators.min(0), Validators.max(20)],
    drawerQuantity: [Validators.required, Validators.min(0), Validators.max(10)]
  };

  private readonly CONTROL_LABELS: Record<string, { translationKey?: string; fallback: string }> = {
    cabinetType: { translationKey: 'UI.cabinetType', fallback: 'Typ szafki' },
    openingType: { translationKey: 'UI.openingType', fallback: 'Typ otwierania' },
    frontType: { translationKey: 'UI.frontType', fallback: 'Uklad frontu' },
    height: { translationKey: 'UI.height', fallback: 'Wysokosc' },
    width: { translationKey: 'UI.width', fallback: 'Szerokosc' },
    depth: { translationKey: 'UI.depth', fallback: 'Glebokosc' },
    shelfQuantity: { translationKey: 'UI.shelfQuantity', fallback: 'Liczba polek' },
    drawerQuantity: { translationKey: 'UI.drawerQuantity', fallback: 'Liczba szuflad' },
    drawerModel: { translationKey: 'UI.drawerModel', fallback: 'Model szuflady' },
    drawerBaseHdf: { translationKey: 'UI.isDrawerBaseHdf', fallback: 'Dno szuflady' },
    needBacks: { translationKey: 'UI.shouldAddBack', fallback: 'Plecy' },
    isBackInGroove: { fallback: 'Mocowanie plecow' },
    isHanging: { translationKey: 'UI.isHanging', fallback: 'Typ ustawienia' },
    isHangingOnRail: { translationKey: 'UI.isHangingOnRail', fallback: 'Mocowanie wiszace' },
    isStandingOnFeet: { translationKey: 'UI.isOnFeet', fallback: 'Podparcie dolne' },
    isFrontExtended: { translationKey: 'UI.isFrontExtended', fallback: 'Przedluzenie frontu' },
    isCoveredWithCounterTop: { translationKey: 'UI.isCoveredWithCounterTop', fallback: 'Gorna plyta / blat' },
    varnishedFront: { translationKey: 'UI.frontWithVeneerOrVarnished', fallback: 'Wykonczenie frontu' },
    frontVeneerColor: { translationKey: 'UI.frontVeneerColor', fallback: 'Kolor okleiny frontu' },
    frontMaterial: { translationKey: 'UI.materialFront', fallback: 'Material frontu' },
    boxMaterial: { translationKey: 'UI.materialBox', fallback: 'Material korpusu' },
    boxBoardThickness: { translationKey: 'UI.boxBoardThickness', fallback: 'Grubosc plyty korpusu' },
    boxColor: { translationKey: 'UI.colorBox', fallback: 'Kolor korpusu' },
    boxVeneerColor: { translationKey: 'UI.boxVeneerColor', fallback: 'Kolor okleiny korpusu' },
    frontBoardThickness: { translationKey: 'UI.frontBoardThickness', fallback: 'Grubosc frontu' },
    frontColor: { translationKey: 'UI.colorFront', fallback: 'Kolor frontu' }
  };

  translationLoading = true;
  translations: { [key: string]: string } = {};

  private readonly languageService = inject(LanguageService);
  private readonly errorTranslationService = inject(ErrorTranslationService);

  get selectedLanguage(): string {
    return this.languageService.lang();
  }

  loading = false;
  view: AloneCabinetView = 'config';
  multiRequests: CabinetRequest[] = [];
  response?: CabinetResponse;
  errorMessage: string | null = null;
  validationErrorId: string | null = null;
  serverFieldErrors: Record<string, string> = {};
  serverGlobalErrors: string[] = [];

  private readonly destroy$ = new Subject<void>();

  readonly form: FormGroup = this.fb.group({
    height: ['720', this.FORM_VALIDATORS.height],
    width: ['600', this.FORM_VALIDATORS.width],
    depth: ['500', this.FORM_VALIDATORS.depth],
    shelfQuantity: [{ value: '0', disabled: true }, this.FORM_VALIDATORS.shelfQuantity],
    drawerQuantity: [{ value: '0', disabled: false }, this.FORM_VALIDATORS.drawerQuantity],
    cabinetType: ['STANDARD', Validators.required],
    openingType: ['HANDLE', Validators.required],
    frontType: ['DRAWER', Validators.required],
    drawerModel: ['SEVROLL_BALL', Validators.required],
    drawerBaseHdf: [true, Validators.required],
    needBacks: [true, Validators.required],
    isBackInGroove: [false, Validators.required],
    isHanging: [false, Validators.required],
    isHangingOnRail: [false, Validators.required],
    isStandingOnFeet: [false, Validators.required],
    isFrontExtended: [{ value: false, disabled: true }, Validators.required],
    isCoveredWithCounterTop: [false, Validators.required],
    varnishedFront: [{ value: false, disabled: true }, Validators.required],
    frontVeneerColor: ['WHITE', Validators.required],
    frontMaterial: ['CHIPBOARD', Validators.required],
    boxMaterial: ['CHIPBOARD', Validators.required],
    boxBoardThickness: [18, Validators.required],
    boxColor: ['WHITE', Validators.required],
    boxVeneerColor: ['WHITE', Validators.required],
    frontBoardThickness: [18, Validators.required],
    frontColor: ['WHITE', Validators.required]
  });

  private readonly defaultFormValue = this.form.getRawValue();
  private readonly validationSummaryOrder = [
    'cabinetType',
    'openingType',
    'frontType',
    'height',
    'width',
    'depth',
    'shelfQuantity',
    'drawerQuantity',
    'drawerModel',
    'drawerBaseHdf',
    'needBacks',
    'isBackInGroove',
    'isHanging',
    'isHangingOnRail',
    'isStandingOnFeet',
    'isFrontExtended',
    'isCoveredWithCounterTop',
    'varnishedFront',
    'frontVeneerColor',
    'frontMaterial',
    'boxMaterial',
    'boxBoardThickness',
    'boxColor',
    'boxVeneerColor',
    'frontBoardThickness',
    'frontColor'
  ] as const;

  constructor(
    private readonly cabinetService: AloneCabinetService,
    private readonly translationService: TranslationService,
    private readonly fb: FormBuilder
  ) {
    effect(() => {
      this.loadTranslations(this.languageService.lang());
    });
  }

  ngOnInit(): void {
    const frontTypeControl = this.form.get('frontType');
    this.syncFrontTypeState(frontTypeControl?.value);
    frontTypeControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.syncFrontTypeState(value));

    const needBacksControl = this.form.get('needBacks');
    this.syncNeedBacksState(needBacksControl?.value);
    needBacksControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.syncNeedBacksState(value));

    const isHangingControl = this.form.get('isHanging');
    this.syncHangingState(isHangingControl?.value);
    isHangingControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.syncHangingState(value));

    const varnishedFrontControl = this.form.get('varnishedFront');
    this.syncVarnishedFrontState(varnishedFrontControl?.value);
    varnishedFrontControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.syncVarnishedFrontState(value));

    const frontMaterialControl = this.form.get('frontMaterial');
    this.syncFrontMaterialState(frontMaterialControl?.value);
    frontMaterialControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.syncFrontMaterialState(value));

    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.validationErrorId || Object.keys(this.serverFieldErrors).length > 0 || this.serverGlobalErrors.length > 0) {
          this.clearValidationState();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get formValid(): boolean {
    return this.form.valid;
  }

  get preparedRequestsCount(): number {
    return this.multiRequests.length;
  }

  get hasPreparedRequests(): boolean {
    return this.preparedRequestsCount > 0;
  }

  get preparedRequestsLabel(): string {
    return this.pluralize(this.preparedRequestsCount, 'konfiguracja', 'konfiguracje', 'konfiguracji');
  }

  get hasResult(): boolean {
    return !!this.response;
  }

  get selectedCabinetTypeLabel(): string {
    return this.resolveOptionLabel(this.cabinetTypes, this.form.get('cabinetType')?.value);
  }

  get selectedOpeningTypeLabel(): string {
    return this.resolveOptionLabel(this.openingTypes, this.form.get('openingType')?.value);
  }

  get selectedFrontTypeLabel(): string {
    return this.resolveOptionLabel(this.frontTypes, this.form.get('frontType')?.value);
  }

  get cabinetPlacementLabel(): string {
    return this.form.get('isHanging')?.value ? 'Wiszaca' : 'Stojaca';
  }

  get currentRequestDimensionsLabel(): string {
    return `${this.form.get('width')?.value || 0} x ${this.form.get('height')?.value || 0} x ${this.form.get('depth')?.value || 0} mm`;
  }

  get totalBoardPieces(): number {
    return this.response?.boards?.reduce((sum, board) => sum + (board.quantity || 0), 0) ?? 0;
  }

  get totalComponentPieces(): number {
    return this.response?.components?.reduce((sum, component) => sum + (component.quantity || 0), 0) ?? 0;
  }

  get totalJobUnits(): number {
    return this.response?.jobs?.reduce((sum, job) => sum + (job.quantity || 0), 0) ?? 0;
  }

  get validationSummaryEntries(): string[] {
    const entries: string[] = [];

    for (const controlName of this.validationSummaryOrder) {
      const message = this.getFieldError(controlName) || this.getClientControlMessage(controlName);
      if (message) {
        entries.push(`${this.getControlLabel(controlName)}: ${message}`);
      }
    }

    return [...entries, ...this.serverGlobalErrors];
  }

  setView(view: AloneCabinetView): void {
    this.view = view;
  }

  calculate(isMany: boolean): void {
    this.errorMessage = null;
    this.clearValidationState();

    if (!isMany && this.form.invalid) {
      this.view = 'config';
      this.form.markAllAsTouched();
      return;
    }

    if (isMany && this.multiRequests.length === 0) {
      this.errorMessage = this.translations['no_requests_prepared'] || this.DEFAULT_MESSAGES.NO_REQUESTS;
      return;
    }

    this.loading = true;
    isMany ? this.calculateMany() : this.calculateCabinet();
  }

  addRequest(): void {
    this.errorMessage = null;
    this.clearValidationState();

    if (this.form.invalid) {
      this.view = 'config';
      this.form.markAllAsTouched();
      return;
    }

    this.multiRequests.push(this.prepareRequestBody());
  }

  removeRequest(index: number): void {
    this.multiRequests.splice(index, 1);
  }

  clearRequests(): void {
    this.multiRequests = [];
  }

  resetWorkspace(): void {
    this.view = 'config';
    this.response = undefined;
    this.errorMessage = null;
    this.multiRequests = [];
    this.clearValidationState();

    this.form.reset(this.defaultFormValue, { emitEvent: false });
    this.applyInitialControlState();
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  describePreparedRequest(request: CabinetRequest): string {
    const typeLabel = this.resolveOptionLabel(this.cabinetTypes, request.cabinetType);
    return `${typeLabel} | ${request.width} x ${request.height} x ${request.depth} mm`;
  }

  prepareDocPrintRequest(): PrintDocRequest[] | null {
    if (!this.response?.boards) {
      return null;
    }

    return this.response.boards.map((board: Board): PrintDocRequest => ({
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
    }));
  }

  loadTranslations(lang: string): void {
    this.translationLoading = true;
    this.translationService
      .getByCategories(CabinetConstants.TRANSLATION_CATEGORIES, lang)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(this.translationService.getDefaultTranslations()))
      )
      .subscribe({
        next: translations => (this.translations = translations),
        complete: () => (this.translationLoading = false)
      });
  }

  getTranslatedAdditionalInfo(additionalInfo: string[] | undefined): string {
    if (!additionalInfo) {
      return '';
    }

    return additionalInfo.map(info => this.translations[info] || info).join('\n');
  }

  getComponentModelTranslation(component: { category: string; model: string }): string {
    const categoryToPrefix: Record<string, string> = {
      HINGE: 'HINGE_TYPE',
      HANGER: 'HANGER_MODEL',
      FEET: 'FEET_MODEL',
      LIFT: 'LIFT_TYPE',
      SHELF_SUPPORT: 'SHELF_SUPPORT_MODEL',
      OPENING: 'OPENING_MODEL',
      VENEER: 'VENEER_MODEL',
      DRAWER: 'DRAWER_MODEL'
    };
    const prefix = categoryToPrefix[component.category] || component.category;
    const key = `${prefix}.${component.model}`;
    return this.translations[key] || component.model;
  }

  getJobTypeTranslation(job: { category: string; type: string }): string {
    const categoryToPrefix: Record<string, string> = {
      BOARD_CUTTING: 'CUTTING_TYPE',
      MILLING: 'MILLING_TYPE'
    };
    const prefix = categoryToPrefix[job.category] || job.category;
    const key = `${prefix}.${job.type}`;
    return this.translations[key] || job.type;
  }

  onLanguageChangeEvent(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.onLanguageChange(target.value);
  }

  onLanguageChange(lang: string): void {
    this.languageService.setLanguage((lang || 'pl') as AppLanguage);
  }

  getFieldError(controlName: string): string | null {
    return this.serverFieldErrors[controlName] ?? null;
  }

  getControlErrorMessage(controlName: string, fallback: string): string {
    return this.getClientControlMessage(controlName) || fallback;
  }

  protected readonly trackByIndex = (index: number) => index;
  protected readonly trackByPreparedRequest = (index: number, request: CabinetRequest) =>
    `${request.cabinetType}-${request.width}-${request.height}-${request.depth}-${index}`;

  private prepareRequestBody(): CabinetRequest {
    const frontType = this.form.get('frontType')?.value;
    const drawerRequest =
      frontType === 'DRAWER'
        ? {
            drawerModel: this.form.get('drawerModel')?.value,
            drawerQuantity: this.form.get('drawerQuantity')?.value,
            drawerBaseHdf: this.form.get('drawerBaseHdf')?.value,
            drawerFrontDetails: null
          }
        : null;

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
      frontType,
      cabinetType: this.form.get('cabinetType')?.value,
      openingType: this.form.get('openingType')?.value,
      drawerRequest,
      materialRequest: {
        boxMaterial: this.form.get('boxMaterial')?.value,
        boxBoardThickness: this.form.get('boxBoardThickness')?.value,
        boxColor: this.form.get('boxColor')?.value,
        frontMaterial: this.form.get('frontMaterial')?.value,
        frontBoardThickness: this.form.get('frontBoardThickness')?.value,
        frontColor: this.form.get('frontColor')?.value,
        frontVeneerColor: this.form.get('frontVeneerColor')?.value,
        boxVeneerColor: this.form.get('boxVeneerColor')?.value
      }
    };
  }

  private calculateCabinet(): void {
    const requestBody = this.prepareRequestBody();
    this.cabinetService
      .calculateCabinet(requestBody)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: response => {
          this.errorMessage = null;
          this.clearValidationState();
          this.response = response;
        },
        error: error => {
          this.handleRequestError(error);
        }
      });
  }

  private calculateMany(): void {
    this.cabinetService
      .calculateMany(this.multiRequests)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: response => {
          this.errorMessage = null;
          this.clearValidationState();
          this.response = response;
          this.view = 'costs';
        },
        error: error => {
          this.handleRequestError(error);
        }
      });
  }

  private handleRequestError(error: HttpErrorResponse): void {
    const apiError = this.errorTranslationService.extractApiError(error);

    if (apiError && this.isValidationApiError(apiError)) {
      this.applyApiValidationErrors(apiError);
      this.errorMessage = null;
      this.view = 'config';
      return;
    }

    this.clearValidationState();

    if (error.status === 0) {
      this.errorMessage = this.translations['network_error'] || this.DEFAULT_MESSAGES.NETWORK_ERROR;
      return;
    }

    if (error.status === 406) {
      this.errorMessage = error.error?.message ?? this.DEFAULT_MESSAGES.INVALID_INPUT;
      return;
    }

    if (error.status >= 400 && error.status < 500) {
      this.errorMessage = this.translations['client_error'] || this.DEFAULT_MESSAGES.INVALID_REQUEST;
      return;
    }

    this.errorMessage = this.translations['unexpected_error'] || this.DEFAULT_MESSAGES.UNEXPECTED_ERROR;
  }

  private isValidationApiError(apiError: ApiErrorResponse): boolean {
    return (
      apiError.title === 'VALIDATION_ERROR' ||
      apiError.code === 'ex.validation.failed' ||
      (apiError.errors?.length ?? 0) > 0
    );
  }

  private applyApiValidationErrors(apiError: ApiErrorResponse): void {
    this.clearValidationState();

    for (const translatedError of this.errorTranslationService.translateApiError(apiError)) {
      const controlName = this.mapApiFieldToControlName(translatedError.field);

      if (controlName) {
        if (!this.serverFieldErrors[controlName]) {
          this.serverFieldErrors[controlName] = translatedError.message;
        }
        this.form.get(controlName)?.markAsTouched();
        continue;
      }

      this.serverGlobalErrors.push(translatedError.message);
    }

    this.validationErrorId = apiError.errorId;
  }

  private clearValidationState(): void {
    this.serverFieldErrors = {};
    this.serverGlobalErrors = [];
    this.validationErrorId = null;
  }

  private mapApiFieldToControlName(field?: string): string | null {
    if (!field) {
      return null;
    }

    const normalized = field.replace(/\[\d+\]/g, '');
    const candidates = [normalized, normalized.split('.').pop() ?? normalized];

    for (const candidate of candidates) {
      if (candidate && this.form.get(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private getControlLabel(controlName: string): string {
    const labelConfig = this.CONTROL_LABELS[controlName];
    if (!labelConfig) {
      return controlName;
    }

    return (labelConfig.translationKey && this.translations[labelConfig.translationKey]) || labelConfig.fallback;
  }

  private getClientControlMessage(controlName: string): string | null {
    const control = this.form.get(controlName);
    if (!control || control.disabled || !control.touched || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return 'To pole jest wymagane.';
    }

    if (control.errors['min']) {
      return `Minimum: ${control.errors['min'].min}.`;
    }

    if (control.errors['max']) {
      return `Maksimum: ${control.errors['max'].max}.`;
    }

    return 'To pole zawiera nieprawidlowa wartosc.';
  }

  private applyInitialControlState(): void {
    this.syncFrontTypeState(this.form.get('frontType')?.value);
    this.syncNeedBacksState(this.form.get('needBacks')?.value);
    this.syncHangingState(this.form.get('isHanging')?.value);
    this.syncFrontMaterialState(this.form.get('frontMaterial')?.value);
    this.syncVarnishedFrontState(this.form.get('varnishedFront')?.value);
  }

  private syncFrontTypeState(frontType: unknown): void {
    const drawerQuantityControl = this.form.get('drawerQuantity');
    const drawerModelControl = this.form.get('drawerModel');
    const drawerBaseHdfControl = this.form.get('drawerBaseHdf');
    const shelfQuantityControl = this.form.get('shelfQuantity');
    const isFrontExtendedControl = this.form.get('isFrontExtended');
    const isHanging = !!this.form.get('isHanging')?.value;

    if (!drawerQuantityControl || !drawerModelControl || !drawerBaseHdfControl || !shelfQuantityControl || !isFrontExtendedControl) {
      return;
    }

    if (frontType !== 'DRAWER') {
      this.form.patchValue(
        {
          drawerQuantity: 0,
          drawerModel: '',
          drawerBaseHdf: false
        },
        { emitEvent: false }
      );
      drawerQuantityControl.disable({ emitEvent: false });
      drawerModelControl.disable({ emitEvent: false });
      drawerBaseHdfControl.disable({ emitEvent: false });
      shelfQuantityControl.enable({ emitEvent: false });
      if (isHanging) {
        isFrontExtendedControl.enable({ emitEvent: false });
      }
      drawerQuantityControl.setValidators([Validators.required, Validators.min(0), Validators.max(10)]);
    } else {
      if ((Number(drawerQuantityControl.value) || 0) < 1) {
        drawerQuantityControl.setValue(1, { emitEvent: false });
      }
      this.form.patchValue(
        {
          shelfQuantity: 0,
          drawerModel: this.form.get('drawerModel')?.value || 'ANTARO_TANDEMBOX',
          drawerBaseHdf: !!this.form.get('drawerBaseHdf')?.value
        },
        { emitEvent: false }
      );
      drawerQuantityControl.enable({ emitEvent: false });
      drawerModelControl.enable({ emitEvent: false });
      drawerBaseHdfControl.enable({ emitEvent: false });
      shelfQuantityControl.disable({ emitEvent: false });
      isFrontExtendedControl.disable({ emitEvent: false });
      drawerQuantityControl.setValidators([Validators.required, Validators.min(1), Validators.max(10)]);
    }

    drawerQuantityControl.updateValueAndValidity({ emitEvent: false });
    shelfQuantityControl.updateValueAndValidity({ emitEvent: false });
  }

  private syncNeedBacksState(needBacks: unknown): void {
    const isBackInGrooveControl = this.form.get('isBackInGroove');
    if (!isBackInGrooveControl) {
      return;
    }

    if (needBacks) {
      isBackInGrooveControl.enable({ emitEvent: false });
      return;
    }

    this.form.patchValue({ isBackInGroove: false }, { emitEvent: false });
    isBackInGrooveControl.disable({ emitEvent: false });
  }

  private syncHangingState(isHanging: unknown): void {
    const isHangingOnRailControl = this.form.get('isHangingOnRail');
    const isStandingOnFeetControl = this.form.get('isStandingOnFeet');
    const isFrontExtendedControl = this.form.get('isFrontExtended');
    const isCoveredWithCounterTopControl = this.form.get('isCoveredWithCounterTop');
    const frontType = this.form.get('frontType')?.value;

    if (
      !isHangingOnRailControl ||
      !isStandingOnFeetControl ||
      !isFrontExtendedControl ||
      !isCoveredWithCounterTopControl
    ) {
      return;
    }

    if (isHanging) {
      isHangingOnRailControl.enable({ emitEvent: false });
      isStandingOnFeetControl.disable({ emitEvent: false });
      this.form.patchValue({ isStandingOnFeet: false }, { emitEvent: false });
      if (frontType !== 'DRAWER') {
        isFrontExtendedControl.enable({ emitEvent: false });
      }
      isCoveredWithCounterTopControl.disable({ emitEvent: false });
      return;
    }

    this.form.patchValue(
      {
        isHangingOnRail: false,
        isFrontExtended: false
      },
      { emitEvent: false }
    );
    isHangingOnRailControl.disable({ emitEvent: false });
    isStandingOnFeetControl.enable({ emitEvent: false });
    isFrontExtendedControl.disable({ emitEvent: false });
    isCoveredWithCounterTopControl.enable({ emitEvent: false });
  }

  private syncVarnishedFrontState(varnishedFront: unknown): void {
    const frontVeneerColorControl = this.form.get('frontVeneerColor');
    if (!frontVeneerColorControl) {
      return;
    }

    if (varnishedFront) {
      frontVeneerColorControl.disable({ emitEvent: false });
      return;
    }

    frontVeneerColorControl.enable({ emitEvent: false });
  }

  private syncFrontMaterialState(frontMaterial: unknown): void {
    const varnishedFrontControl = this.form.get('varnishedFront');
    if (!varnishedFrontControl) {
      return;
    }

    if (frontMaterial === 'MDF') {
      varnishedFrontControl.enable({ emitEvent: false });
      this.syncVarnishedFrontState(varnishedFrontControl.value);
      return;
    }

    this.form.patchValue({ varnishedFront: false }, { emitEvent: false });
    varnishedFrontControl.disable({ emitEvent: false });
    this.syncVarnishedFrontState(false);
  }

  private resolveOptionLabel(options: { value: any; label: string }[], value: unknown): string {
    const match = options.find(option => option.value === value);
    const rawLabel = match?.label ?? String(value ?? '-');
    return this.translations[rawLabel] || rawLabel;
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
