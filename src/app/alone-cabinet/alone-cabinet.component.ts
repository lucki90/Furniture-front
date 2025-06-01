import {Component, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AloneCabinetService} from '../alone-cabinet.service';
import {TranslationService} from '../translation/translation.service';
import {PrintDocComponent} from '../print-doc/print-doc.component';
import {CabinetVisualizationComponent} from '../cabinet-visualization/cabinet-visualization.component';

@Component({
  selector: 'app-alone-cabinet',
  templateUrl: './alone-cabinet.component.html',
  styleUrls: ['./alone-cabinet.component.css']
})
export class AloneCabinetComponent implements OnInit {
  @ViewChild(PrintDocComponent) printDocComponent!: PrintDocComponent;
  @ViewChild(CabinetVisualizationComponent) cabinetVisualizationComponent!: CabinetVisualizationComponent;

  translationLoading: boolean = true;
  oneFront: boolean = true;
  needBacks: boolean = true;
  isHanging: boolean = false;
  isHangingOnRail: boolean = false;
  isStandingOnFeet: boolean = false;
  isBackInGroove: boolean = false;
  isFrontExtended: boolean = false;
  isCoveredWithCounterTop: boolean = false;
  varnishedFront: boolean = false;
  frontType: string = 'ONE_DOOR';
  cabinetType: string = 'STANDARD';
  openingType: string = 'HANDLE';

  boxMaterial: string = 'CHIPBOARD';
  boxBoardThickness: number = 18;
  boxColor: string = 'white';
  boxVeneerColor: string = 'white';

  frontMaterial: string = 'CHIPBOARD';
  frontBoardThickness: number = 18;
  frontColor: string = 'white';
  frontVeneerColor: string | null = 'white'; //TODO zmienic na null jesli lakierowany

  response: any;
  errorMessage: string | null = null;

  translations: { [key: string]: string } = {};
  selectedLanguage: string = 'pl'; // Default language

  cabinetTypes = [
    {value: 'STANDARD', label: 'GENERAL.cabinet.standard'},
    {value: 'INTERNAL', label: 'GENERAL.cabinet.internal'},
  ];

  openingTypes = [
    {value: 'HANDLE', label: 'OpeningModelEnum.HANDLE'},
    {value: 'CLICK', label: 'OpeningModelEnum.CLICK'},
    {value: 'MILLED', label: 'OpeningModelEnum.MILLED'},
    {value: 'NONE', label: 'OpeningModelEnum.NONE'},
  ]

  frontTypes = [
    {value: 'OPEN', label: 'alone-cabin.front.open'},
    {value: 'ONE_DOOR', label: 'alone-cabin.front.oneDoor'},
    {value: 'TWO_DOORS', label: 'alone-cabin.front.twoDoors'},
    {value: 'UPWARDS', label: 'alone-cabin.front.upward'},
    {value: 'DRAWER', label: 'alone-cabin.front.drawer'}
  ];

  materials = [
    {value: 'CHIPBOARD', label: 'GENERAL.material.CHIPBOARD'},
    {value: 'MDF', label: 'GENERAL.material.MDF'}
  ];
  thicknesses = [
    {value: 16, label: '16'},
    {value: 18, label: '18'},
    {value: 20, label: '20'}
  ];
  colors = [
    {value: 'white', label: 'GENERAL.color.white'},
    {value: 'black', label: 'GENERAL.color.black'},
    {value: 'red', label: 'GENERAL.color.red'}
  ];

  // Tablica przechowująca przygotowane requesty
  multiRequests: any[] = [];

  prepareDocPrintRequest(): any {
    // throw new Error('Method not implemented.');
    if (!this.response || !this.response.boards) {
      return null;
    }
    return this.response.boards.map((board: any) => {
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
        remarks: '' //TODO

      };
    });

    // return { boards: newBoards };
  }

/// tutaj definijemy domyslna wartosc
  form: FormGroup = this.fb.group({
    height: ['720', [
      Validators.required,
      Validators.min(50),
      Validators.max(2600)
    ]],
    width: ['600', [
      Validators.required,
      Validators.min(50),
      Validators.max(1000)
    ]],
    depth: ['300', [
      Validators.required,
      Validators.min(50),
      Validators.max(1000)
    ]],
    shelfQuantity: ['0', [
      Validators.required,
      Validators.min(0),
      Validators.max(20)
    ]],
    drawerQuantity: ['0', [
      Validators.required,
      Validators.min(0),
      Validators.max(10)
    ]],
    cabinetType: ['STANDARD', Validators.required],
    openingType: ['HANDLE', Validators.required],
    frontType: ['ONE_DOOR', Validators.required],
    // reszta kontrolek formularza
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

    // Nasłuchiwanie na zmiany w formularzu
    this.form.get('cabinetType')?.valueChanges.subscribe(value => {
      this.cabinetType = value;
    });

    this.form.get('openingType')?.valueChanges.subscribe(value => {
      this.openingType = value;
    });

    this.form.get('frontType')?.valueChanges.subscribe(value => {
      this.frontType = value;
      // Resetuje ilość szuflad, jeśli wybrano inny typ frontu
      if (this.frontType !== 'DRAWER') {
        this.form.patchValue({drawerQuantity: 0});
      }
    });
  }

  // Pobierz język przeglądarki
  getBrowserLanguage(): string {
    const lang = navigator.language || navigator.languages[0];
    return lang ? lang.split('-')[0] : this.selectedLanguage; // np. 'en-US' → 'en'
  }

  loadTranslations(lang: string) {
    this.selectedLanguage = lang;
    this.translationService.getTranslationsByPrefixes(lang, [
      'ERROR',
      'alone-cabin',
      'GENERAL',
      'VeneerModelEnum',
      'ComponentCategoryEnum',
      'JobCategoryEnum',
      'BoardNameEnum',
      'CuttingTypeEnum',
      'ShelfSupportModelEnum',
      'HangerModelEnum',
      'HingeTypeEnum',
      'FeetModelEnum',
      'OpeningModelEnum',
      'MillingTypeEnum'

    ]).subscribe(
      (translations) => {
        this.translations = translations;
        this.translationLoading = false;
      },
      (error) => {
        console.error('Failed to load translations:', error);
        this.errorMessage = 'Failed to load translations.';
      }
    );
  }

  // Metoda tłumacząca listę additionalInfo
  getTranslatedAdditionalInfo(additionalInfo: string[] | undefined): string {
    if (!additionalInfo) {
      return ''; // Jeśli brak danych, zwróć pusty ciąg
    }

    return additionalInfo
      .map((info) => this.translations[info] || info) // Tłumacz każdy element lub pozostaw oryginał
      .join('\n'); // Łącz przetłumaczone elementy w ciąg znaków
  }

  onLanguageChangeEvent(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedValue = target.value;
    this.onLanguageChange(selectedValue);
  }

  onLanguageChange(lang: string) {
    this.selectedLanguage = lang;
    if (this.selectedLanguage == null) {
      this.selectedLanguage = 'pl';
    }
    this.loadTranslations(this.selectedLanguage);
  }

  // switche
  // czy plecki potrzebne?
  onNeedBacksChange(value: boolean): void {
    this.needBacks = value;
    if (!this.needBacks) {
      this.isBackInGroove = false;
    }
  }

  /**
   * Obsługa zmiany typu szafki
   */
  onCabinetTypeChange(value: string): void {
    this.cabinetType = value;
    this.form.patchValue({cabinetType: value});
  }

  onOpeningTypeChange(value: string): void {
    this.openingType = value;
    this.form.patchValue({openingType: value});
  }

  onFrontTypeChange(value: string): void {
    this.frontType = value;
    this.form.patchValue({frontType: value});
    // Resetuje ilość szuflad, jeśli wybrano inny typ frontu
    if (this.frontType !== 'DRAWER') {
      this.form.patchValue({drawerQuantity: 0})
    }
  }

  onDrawerQuantityChange(value: number): void {
    this.form.patchValue({drawerQuantity: value});
  }

  onBoxMaterialChange(value: string): void {
    this.boxMaterial = value;
  }

  onBoxBoardThicknessChange(value: number): void {
    this.boxBoardThickness = value;
  }

  onVarnishedFrontChange(value: boolean): void {
    this.varnishedFront = value;
    if (this.varnishedFront) {
      this.frontVeneerColor = null;
    }
  }

  onHeightChange(newHeight: number): void {
    this.form.patchValue({height: newHeight});
  }

  onWidthChange(newWidth: number): void {
    this.form.patchValue({width: newWidth});
  }

  onDepthChange(newDepth: number): void {
    this.form.patchValue({depth: newDepth});
  }

  onShelfQuantityChange(newQuantity: number) {
    this.form.patchValue({shelfQuantity: newQuantity});
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  printDoc() {
    this.printDocComponent.downloadExcel2(this.response);
  }

  get formValid(): boolean {
    return this.form.valid;
  }

  calculateCabinet() {
    this.errorMessage = null; // Clear previous errors

    const requestBody = this.prepareRequestBody();

    this.cabinetService.calculateCabinet(requestBody).subscribe(
      (response) => {
        this.response = response;

        // Wywołaj metodę drawCabinet z komponentu CabinetVisualization
        if (this.cabinetVisualizationComponent) {
          this.cabinetVisualizationComponent.drawCabinet();
        }
      },
      (error) => {
        console.log(error);
        if (error.status === 406) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = this.translations['unexpected_error'] || 'Unexpected error occurred. Please try again later.';
        }
        console.error('Error:', error);
      }
    );
  }

  private prepareRequestBody() {
    return {
      lang: this.selectedLanguage,
      height: this.form.get('height')?.value,
      width: this.form.get('width')?.value,
      depth: this.form.get('depth')?.value,
      shelfQuantity: this.form.get('shelfQuantity')?.value,
      oneFront: this.oneFront,
      needBacks: this.needBacks,
      isHanging: this.isHanging,
      isHangingOnRail: this.isHangingOnRail,
      isStandingOnFeet: this.isStandingOnFeet,
      isBackInGroove: this.isBackInGroove,
      isFrontExtended: this.isFrontExtended,
      isCoveredWithCounterTop: this.isCoveredWithCounterTop,
      varnishedFront: this.varnishedFront,
      frontType: this.frontType,
      cabinetType: this.cabinetType,
      openingType: this.openingType,
      drawerQuantity: this.frontType === 'DRAWER' ? this.form.get('drawerQuantity')?.value : null,
      materialRequest: {
        boxMaterial: this.boxMaterial,
        boxBoardThickness: this.boxBoardThickness,
        boxColor: this.boxColor,
        frontMaterial: this.frontMaterial,
        frontBoardThickness: this.frontBoardThickness,
        frontColor: this.frontColor,
        frontVeneerColor: this.frontVeneerColor,
        boxVeneerColor: this.boxVeneerColor
      }
    };
  }

// Dodawanie wielu requestow z szafkami
  // Dodaje przygotowany request do listy multiRequests
  addRequest(): void {
    // Przygotowujemy obiekt requestu na podstawie bieżących danych formularza
    const req = this.prepareRequestBody();

    this.multiRequests.push(req);
    console.log('Added request:', req);
  }

  // Wysyła listę przygotowanych requestów do endpointu /calculate-many
  calculateMany(): void {
    if (this.multiRequests.length === 0) {
      console.warn('Brak przygotowanych requestów do wysłania');
      return;
    }
    this.cabinetService.calculateMany(this.multiRequests).subscribe(
      (response) => {
        console.log('Response from calculateMany:', response);
        this.response = response;
        // Możesz tutaj przypisać odpowiedź do właściwości lub wykonać inne akcje
      },
      (error) => {
        console.error('Error in calculateMany:', error);
        this.errorMessage = this.translations['unexpected_error'] || 'Unexpected error occurred. Please try again later.';
      }
    );
  }

  logMessage(message: string): void {
    console.log(message);
  }

  logMessage2(message: {}): void {
    console.log(message);
  }

}
