import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { KitchenCabinetType } from '../model/kitchen-cabinet-type';
import { isUpperCabinetType } from '../../model/kitchen-state.model';

interface TypeCard {
  type: KitchenCabinetType;
  label: string;
  svgTemplate: string;
  /**
   * Opcjonalny preset dla CORNER_CABINET — jeśli podany, picker zwraca
   * `{type, isUpperCorner}` i formularz auto-ustawia `isUpperCorner` przed prepare.
   * Pozwala uniknąć dodatkowego dropdown "Typ montażu" w formularzu — wybór jest tutaj.
   */
  presetIsUpperCorner?: boolean;
}

interface TypeGroup {
  title: string;
  types: TypeCard[];
}

/**
 * Wynik zwracany przez picker. Dla CORNER_CABINET zawiera dodatkowo `isUpperCorner`
 * (z preset zdefiniowanego na karcie). Dla innych typów `isUpperCorner` jest pominięte.
 */
export interface CabinetTypePickerResult {
  type: KitchenCabinetType;
  isUpperCorner?: boolean;
}

@Component({
  selector: 'app-cabinet-type-picker',
  templateUrl: './cabinet-type-picker.component.html',
  styleUrls: ['./cabinet-type-picker.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatDialogModule, MatIconModule]
})
export class CabinetTypePickerComponent {

  private dialogRef = inject(MatDialogRef<CabinetTypePickerComponent>);
  private readonly dialogData = inject<{ isIslandWall?: boolean } | null>(MAT_DIALOG_DATA, { optional: true });
  /** Na wyspie blokujemy szafki wiszące i słupki (brak zasilania/odprowadzenia od sufitu). */
  private readonly isIslandWall = this.dialogData?.isIslandWall ?? false;

  private readonly allGroups: TypeGroup[] = [
    {
      title: 'Szafki dolne',
      types: [
        { type: KitchenCabinetType.BASE_TWO_DOOR,              label: '2 drzwi',             svgTemplate: 'base-two-door' },
        { type: KitchenCabinetType.BASE_ONE_DOOR,              label: '1 drzwi',             svgTemplate: 'base-one-door' },
        { type: KitchenCabinetType.BASE_OPEN,                  label: 'Otwarta',             svgTemplate: 'base-open' },
        { type: KitchenCabinetType.BASE_CARGO,                 label: 'Cargo',               svgTemplate: 'base-cargo' },
        { type: KitchenCabinetType.BASE_WITH_DRAWERS,          label: 'Szuflady',            svgTemplate: 'base-drawers' },
        { type: KitchenCabinetType.BASE_SINK,                  label: 'Zlewowa',             svgTemplate: 'base-sink' },
        { type: KitchenCabinetType.BASE_COOKTOP,               label: 'Płyta grzewcza',      svgTemplate: 'base-cooktop' },
        { type: KitchenCabinetType.BASE_DISHWASHER,            label: 'Zmywarka (front)',    svgTemplate: 'base-dishwasher' },
        { type: KitchenCabinetType.BASE_DISHWASHER_FREESTANDING, label: 'Zmywarka wol.',    svgTemplate: 'base-dishwasher-free' },
        { type: KitchenCabinetType.BASE_OVEN,                  label: 'Piekarnik',           svgTemplate: 'base-oven' },
        { type: KitchenCabinetType.BASE_OVEN_FREESTANDING,    label: 'Piekarnik wol.',      svgTemplate: 'base-oven-free' },
        { type: KitchenCabinetType.BASE_FRIDGE,                label: 'Lodówka (zabudowa)', svgTemplate: 'base-fridge' },
        { type: KitchenCabinetType.BASE_FRIDGE_FREESTANDING,  label: 'Lodówka wol.',        svgTemplate: 'base-fridge-free' },
        // Iteracja 3 poprawka 2026-05-24: narożna dolna jako entry-point w sekcji dolnych
        // (preset isUpperCorner=false), zamiast osobnego dropdownu "Typ montażu" w formularzu.
        { type: KitchenCabinetType.CORNER_CABINET,             label: 'Narożna',             svgTemplate: 'corner', presetIsUpperCorner: false },
      ]
    },
    {
      title: 'Szafki wiszące',
      types: [
        { type: KitchenCabinetType.UPPER_ONE_DOOR,   label: '1 drzwi',       svgTemplate: 'upper-one-door' },
        { type: KitchenCabinetType.UPPER_TWO_DOOR,   label: '2 drzwi',       svgTemplate: 'upper-two-door' },
        { type: KitchenCabinetType.UPPER_OPEN_SHELF, label: 'Otwarta półka', svgTemplate: 'upper-open' },
        { type: KitchenCabinetType.UPPER_CASCADE,    label: 'Kaskadowa',     svgTemplate: 'upper-cascade' },
        { type: KitchenCabinetType.UPPER_HOOD,       label: 'Na okap',       svgTemplate: 'upper-hood' },
        { type: KitchenCabinetType.UPPER_DRAINER,    label: 'Ociekacz',      svgTemplate: 'upper-drainer' },
        // Iteracja 3 poprawka 2026-05-24: narożna górna jako entry-point w sekcji wiszących
        // (preset isUpperCorner=true). Ten sam typ szafki (CORNER_CABINET) co dolna, tylko inny preset.
        { type: KitchenCabinetType.CORNER_CABINET,   label: 'Narożna',       svgTemplate: 'corner', presetIsUpperCorner: true },
      ]
    },
    {
      title: 'Specjalne',
      types: [
        { type: KitchenCabinetType.TALL_CABINET,   label: 'Słupek',   svgTemplate: 'tall' },
        { type: KitchenCabinetType.PANTRY_PASSAGE, label: 'Przejście do spiżarni', svgTemplate: 'passage' },
        // CORNER_CABINET przeniesiony do sekcji dolnych/wiszących (Iteracja 3 poprawka 2026-05-24)
      ]
    }
  ];

  /** Grupy widoczne dla aktualnego typu ściany — wyszące i słupki ukryte na wyspie. */
  get groups(): TypeGroup[] {
    if (!this.isIslandWall) {
      return this.allGroups;
    }
    return this.allGroups
      .map(group => ({
        ...group,
        types: group.types.filter(card => this.isAllowedOnIsland(card))
      }))
      .filter(group => group.types.length > 0);
  }

  /**
   * Filtr typów dla wyspy. Usuwa szafki wiszące, słupki, przejście do spiżarni
   * oraz wariant CORNER górnej (preset isUpperCorner=true) — bo wyspa nie wspiera szafek wiszących.
   * Codex review fix 2026-05-28: dodano filtr po `presetIsUpperCorner` żeby nie pokazywać "Narożnej górnej"
   * w sekcji wiszących na wyspie (poprzednio sam `isUpperCabinetType(CORNER_CABINET)` zwracał false,
   * więc CORNER górna ślizgała się przez filtr).
   */
  private isAllowedOnIsland(card: TypeCard): boolean {
    if (card.presetIsUpperCorner === true) {
      return false;  // CORNER górna — wariant wiszący, nie dla wyspy
    }
    return !isUpperCabinetType(card.type)
      && card.type !== KitchenCabinetType.TALL_CABINET
      && card.type !== KitchenCabinetType.PANTRY_PASSAGE;
  }

  select(card: TypeCard): void {
    const result: CabinetTypePickerResult = card.presetIsUpperCorner !== undefined
      ? { type: card.type, isUpperCorner: card.presetIsUpperCorner }
      : { type: card.type };
    this.dialogRef.close(result);
  }

  close(): void {
    this.dialogRef.close(null);
  }

  protected trackByIndex = (index: number) => index;
  /**
   * trackBy używa kompozytu type+presetIsUpperCorner, bo CORNER_CABINET występuje 2× w pickerze
   * (raz dla dolnej, raz dla górnej). Sam `type` nie wystarczy do unikalności w `*ngFor`.
   */
  protected trackByType = (_: number, card: TypeCard) =>
    `${card.type}::${card.presetIsUpperCorner ?? ''}`;
}
