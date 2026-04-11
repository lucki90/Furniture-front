import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DictionaryItem {
  code: string;
  label: string;
  description?: string;
}

export interface AllDictionaries {
  cooktopTypes: DictionaryItem[];
  cooktopFrontTypes: DictionaryItem[];
  sinkFrontTypes: DictionaryItem[];
  hoodFrontTypes: DictionaryItem[];
  ovenHeightTypes: DictionaryItem[];
  ovenLowerSectionTypes: DictionaryItem[];
  fridgeSectionTypes: DictionaryItem[];
  fridgeFreestandingTypes: DictionaryItem[];
  drawerModels: DictionaryItem[];
  openingTypes: DictionaryItem[];
  countertopMaterials: DictionaryItem[];
  countertopJoints: DictionaryItem[];
  countertopEdges: DictionaryItem[];
  countertopThicknesses: DictionaryItem[];
  plinthMaterials: DictionaryItem[];
  feetTypes: DictionaryItem[];
  cornerMechanisms: DictionaryItem[];
  segmentTypes: DictionaryItem[];
  enclosureTypes: DictionaryItem[];
}

/** Fallback — polskie etykiety gdy backend niedostępny */
export const DICTIONARY_FALLBACK: AllDictionaries = {
  cooktopTypes:            [{ code: 'INDUCTION', label: 'Indukcja' }, { code: 'GAS', label: 'Gaz' }],
  cooktopFrontTypes:       [{ code: 'DRAWERS', label: 'Szuflady' }, { code: 'TWO_DOORS', label: 'Dwoje drzwi' }, { code: 'ONE_DOOR', label: 'Jedne drzwi' }],
  sinkFrontTypes:          [{ code: 'ONE_DOOR', label: 'Jedne drzwi' }, { code: 'TWO_DOORS', label: 'Dwoje drzwi' }, { code: 'DRAWER', label: 'Szuflada' }],
  hoodFrontTypes:          [{ code: 'FLAP', label: 'Klapa (lift-up)' }, { code: 'TWO_DOORS', label: 'Dwoje drzwi' }, { code: 'OPEN', label: 'Otwarta' }],
  ovenHeightTypes:         [{ code: 'STANDARD', label: 'Standard (595 mm)' }, { code: 'COMPACT', label: 'Compact (455 mm)' }],
  ovenLowerSectionTypes:   [{ code: 'LOW_DRAWER', label: 'Szuflada niska' }, { code: 'HINGED_DOOR', label: 'Drzwi zawiasowe' }, { code: 'NONE', label: 'Brak' }],
  fridgeSectionTypes:      [{ code: 'ONE_DOOR', label: 'Jedne drzwi' }, { code: 'TWO_DOORS', label: 'Lodówka + zamrażarka' }],
  fridgeFreestandingTypes: [{ code: 'SINGLE_DOOR', label: 'Jedne drzwi' }, { code: 'TWO_DOORS', label: 'Lodówka + zamrażarka' }, { code: 'SIDE_BY_SIDE', label: 'Side-by-side' }],
  drawerModels:            [{ code: 'ANTARO_TANDEMBOX', label: 'Blum Antaro / Tandembox' }, { code: 'SEVROLL_BALL', label: 'Sevroll kulkowe' }],
  openingTypes:            [{ code: 'HANDLE', label: 'Uchwyt' }, { code: 'CLICK', label: 'Click (TIP-ON)' }, { code: 'MILLED', label: 'Frezowany' }, { code: 'NONE', label: 'Brak' }],
  countertopMaterials:     [{ code: 'LAMINATE', label: 'Laminat (standard)' }, { code: 'SOLID_WOOD', label: 'Lite drewno' }, { code: 'STONE', label: 'Kamień' }, { code: 'QUARTZ_COMPOSITE', label: 'Konglomerat kwarcowy' }, { code: 'COMPACT', label: 'Płyta kompaktowa' }],
  countertopJoints:        [{ code: 'NONE', label: 'Brak' }, { code: 'ALUMINUM_STRIP', label: 'Listewka aluminiowa' }, { code: 'MITER_JOINT', label: 'Łyżwa (45°)' }, { code: 'SEAMLESS', label: 'Bezszwowe' }],
  countertopEdges:         [{ code: 'NONE', label: 'Brak' }, { code: 'ABS_EDGE', label: 'Oklejina ABS/PVC' }, { code: 'WOOD_EDGE', label: 'Oklejina drewniana' }, { code: 'ALUMINUM_EDGE', label: 'Listewka aluminiowa' }, { code: 'POSTFORMED', label: 'Postforming' }, { code: 'PROFILED', label: 'Frezowana' }],
  countertopThicknesses:   [{ code: '28', label: '28 mm' }, { code: '38', label: '38 mm (standard)' }, { code: '40', label: '40 mm' }, { code: '60', label: '60 mm (gruby)' }],
  plinthMaterials:         [{ code: 'PVC', label: 'PVC (standard)' }, { code: 'MDF_LAMINATED', label: 'MDF laminowany' }, { code: 'ALUMINUM', label: 'Aluminium' }, { code: 'CHIPBOARD', label: 'Płyta wiórowa' }],
  feetTypes:               [{ code: 'FEET_100', label: 'Nóżki 100 mm (standard)' }, { code: 'FEET_150', label: 'Nóżki 150 mm (wysokie)' }],
  cornerMechanisms:        [{ code: 'FIXED_SHELVES', label: 'Półki stałe' }, { code: 'CAROUSEL_270', label: 'Karuzela 270°' }, { code: 'CAROUSEL_360', label: 'Karuzela 360°' }, { code: 'MAGIC_CORNER', label: 'Magic Corner' }, { code: 'LE_MANS', label: 'Fasolka (Le Mans)' }, { code: 'BLIND_CORNER', label: 'Ślepy narożnik' }, { code: 'NONE', label: 'Brak (pusta)' }],
  segmentTypes:            [{ code: 'DRAWER', label: 'Szuflady' }, { code: 'DOOR', label: 'Drzwi' }, { code: 'OPEN_SHELF', label: 'Otwarte półki' }, { code: 'OVEN', label: 'Piekarnik (wnęka)' }, { code: 'MICROWAVE', label: 'Mikrofalówka (wnęka)' }],
  enclosureTypes:          [{ code: 'NONE', label: 'Brak obudowy' }, { code: 'SIDE_PLATE_WITH_PLINTH', label: 'Płyta boczna + cokół' }, { code: 'SIDE_PLATE_TO_FLOOR', label: 'Płyta boczna do podłogi' }, { code: 'PARALLEL_FILLER_STRIP', label: 'Blenda równoległa' }],
};

@Injectable({ providedIn: 'root' })
export class DictionaryService {
  private readonly url = `${environment.apiUrl}/dictionaries/all-options`;

  private readonly _data = signal<AllDictionaries>(DICTIONARY_FALLBACK);
  private readonly _loaded = signal(false);

  /** Słowniki jako readonly signal — natychmiast dostępne z fallbacku */
  readonly data = this._data.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  constructor(private readonly http: HttpClient) {}

  /**
   * Ładuje słowniki z backendu dla podanego języka.
   * W przypadku błędu cicho używa fallbacku.
   */
  load(lang: string): Observable<AllDictionaries> {
    const params = new HttpParams().set('lang', lang);
    return this.http.get<AllDictionaries>(this.url, { params }).pipe(
      tap(data => {
        this._data.set(data);
        this._loaded.set(true);
      }),
      catchError(err => {
        console.warn('[DictionaryService] Using fallback dictionaries.', err);
        this._loaded.set(true);
        return of(this._data());
      })
    );
  }

  /** Przeładowanie po zmianie języka */
  reload(lang: string): void {
    this.load(lang).subscribe();
  }
}
