import { Component, OnInit } from '@angular/core';
import { AloneCabinetService } from '../alone-cabinet.service';
import { TranslationService } from '../translation/translation.service';

@Component({
  selector: 'app-alone-cabinet',
  templateUrl: './alone-cabinet.component.html',
  styleUrls: ['./alone-cabinet.component.css']
})
export class AloneCabinetComponent implements OnInit {
  translationLoading: boolean = true;

  height: number = 600;
  width: number = 400;
  depth: number = 300;
  shelfQuantity: number = 0;
  drawerQuantity: number = 0;
  oneFront: boolean = true;
  needBacks: boolean = true;
  varnishedFront: boolean = false;
  frontType: string = 'ONE_DOOR';

  boxMaterial: string = 'CHIPBOARD';
  boxBoardThickness: number = 18;
  boxColor: string = 'white';
  boxVeneerColor: string = 'white';

  frontMaterial: string = 'CHIPBOARD';
  frontBoardThickness: number = 18;
  frontColor: string = 'white';
  frontVeneerColor: string = 'white'; //TODO zmienic na null jesli lakierowany

  response: any;
  errorMessage: string | null = null;

  translations: { [key: string]: string } = {};
  selectedLanguage: string = 'pl'; // Default language

  frontTypes = [
    { value: 'OPEN', label: 'alone-cabin.front.open' },
    { value: 'ONE_DOOR', label: 'alone-cabin.front.oneDoor' },
    { value: 'TWO_DOORS', label: 'alone-cabin.front.twoDoors' },
    { value: 'DRAWER', label: 'alone-cabin.front.drawer' }
  ];

  materials = [
    { value: 'CHIPBOARD', label: 'GENERAL.material.chipboard' },
    { value: 'MDF', label: 'GENERAL.material.MDF' }
  ];
  thicknesses = [16, 18, 20];
  colors = [
    { value: 'white', label: 'GENERAL.color.white' },
    { value: 'black', label: 'GENERAL.color.black' },
    { value: 'red', label: 'GENERAL.color.red' }
  ];

  onFrontTypeChange(): void {
    // Resetuje ilość szuflad, jeśli wybrano inny typ frontu
    if (this.frontType !== 'DRAWER') {
      this.drawerQuantity = 0;
    }
  }

  drawCabinet(): void {
    const canvas = document.getElementById('cabinetCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Resetowanie canvasu
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Proporcje szafki
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const scaleFactor = Math.min(
      canvasWidth / (this.width || 100),
      canvasHeight / (this.height || 100)
    );

    const cabinetWidth = (this.width || 100) * scaleFactor;
    const cabinetHeight = (this.height || 100) * scaleFactor;

    // Korpus
    ctx.fillStyle = '#ddd';
    ctx.fillRect(
      (canvasWidth - cabinetWidth) / 2,
      (canvasHeight - cabinetHeight) / 2,
      cabinetWidth,
      cabinetHeight
    );

    // Półki
    const shelfQuantity = this.shelfQuantity || 0;
    if (shelfQuantity > 0) {
      const shelfHeight = cabinetHeight / (shelfQuantity + 1);
      ctx.strokeStyle = '#000';
      for (let i = 1; i <= shelfQuantity; i++) {
        ctx.beginPath();
        ctx.moveTo((canvasWidth - cabinetWidth) / 2, (canvasHeight - cabinetHeight) / 2 + i * shelfHeight);
        ctx.lineTo((canvasWidth + cabinetWidth) / 2, (canvasHeight - cabinetHeight) / 2 + i * shelfHeight);
        ctx.stroke();
      }
    }

    // Fronty/Szuflady
    const frontType = this.frontType;
    if (frontType === 'DRAWER' && this.drawerQuantity) {
      const drawerQuantity = this.drawerQuantity;
      const drawerHeight = cabinetHeight / drawerQuantity;
      ctx.fillStyle = '#888';
      for (let i = 0; i < drawerQuantity; i++) {
        ctx.fillRect(
          (canvasWidth - cabinetWidth) / 2,
          (canvasHeight - cabinetHeight) / 2 + i * drawerHeight,
          cabinetWidth,
          drawerHeight - 5
        );
      }
    } else if (frontType === 'ONE_FRONT') {
      ctx.fillStyle = '#888';
      ctx.fillRect(
        (canvasWidth - cabinetWidth) / 2,
        (canvasHeight - cabinetHeight) / 2,
        cabinetWidth,
        cabinetHeight
      );
    } else if (frontType === 'TWO_FRONTS') {
      ctx.fillStyle = '#888';
      ctx.fillRect(
        (canvasWidth - cabinetWidth) / 2,
        (canvasHeight - cabinetHeight) / 2,
        cabinetWidth,
        cabinetHeight / 2 - 2
      );
      ctx.fillRect(
        (canvasWidth - cabinetWidth) / 2,
        (canvasHeight - cabinetHeight) / 2 + cabinetHeight / 2 + 2,
        cabinetWidth,
        cabinetHeight / 2 - 2
      );
    }

    // Obrys
    ctx.strokeStyle = '#000';
    ctx.strokeRect(
      (canvasWidth - cabinetWidth) / 2,
      (canvasHeight - cabinetHeight) / 2,
      cabinetWidth,
      cabinetHeight
    );
  }

  constructor(
    private cabinetService: AloneCabinetService,
    private translationService: TranslationService
  ) { }

  ngOnInit(): void {
    const browserLanguage = this.getBrowserLanguage();
    this.loadTranslations(browserLanguage);
    // this.drawCabinet();
  }

  // Pobierz język przeglądarki
  getBrowserLanguage(): string {
    const lang = navigator.language || navigator.languages[0];
    return lang ? lang.split('-')[0] : this.selectedLanguage; // np. 'en-US' → 'en'
  }

  loadTranslations(lang: string) {
    this.selectedLanguage = lang;
    this.translationService.getTranslationsByPrefixes(lang, ['alone-cabin', 'GENERAL',
            'VeneerModelEnum',
            'ComponentCategoryEnum',
            'JobCategoryEnum',
            'BoardNameEnum',
            'CuttingTypeEnum']).subscribe(
      (translations) => {
        this.translations = translations;
        this.translationLoading=false;
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

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  calculateCabinet() {
    this.errorMessage = null; // Clear previous errors

    const requestBody = {
      lang: this.selectedLanguage,
      height: this.height,
      width: this.width,
      depth: this.depth,
      shelfQuantity: this.shelfQuantity,
      oneFront: this.oneFront,
      needBacks: this.needBacks,
      varnishedFront: this.varnishedFront,
      frontType: this.frontType,
      drawerQuantity: this.frontType === 'DRAWER' ? this.drawerQuantity : null,
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

    this.cabinetService.calculateCabinet(requestBody).subscribe(
      (response) => {
        this.response = response;

        this.drawCabinet();
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

  // formatValidationError(details: any): string {
  //   const messages = [];
  //   for (const [field, message] of Object.entries(details)) {
  //     messages.push(`${field}: ${message}`);
  //   }
  //   return messages.join(', ');
  // }

  logMessage(message: string): void {
    console.log(message);
  }
 
  logMessage2(message: {}): void {
    console.log(message);
  }
}
