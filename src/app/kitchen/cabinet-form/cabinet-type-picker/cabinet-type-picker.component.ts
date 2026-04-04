import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { KitchenCabinetType } from '../model/kitchen-cabinet-type';

interface TypeCard {
  type: KitchenCabinetType;
  label: string;
  svgTemplate: string;
}

interface TypeGroup {
  title: string;
  types: TypeCard[];
}

@Component({
  selector: 'app-cabinet-type-picker',
  templateUrl: './cabinet-type-picker.component.html',
  styleUrls: ['./cabinet-type-picker.component.css'],
  standalone: true,
  imports: [CommonModule, MatDialogModule]
})
export class CabinetTypePickerComponent {

  private dialogRef = inject(MatDialogRef<CabinetTypePickerComponent>);

  readonly groups: TypeGroup[] = [
    {
      title: 'Szafki dolne',
      types: [
        { type: KitchenCabinetType.BASE_TWO_DOOR,              label: '2 drzwi',             svgTemplate: 'base-two-door' },
        { type: KitchenCabinetType.BASE_ONE_DOOR,              label: '1 drzwi',             svgTemplate: 'base-one-door' },
        { type: KitchenCabinetType.BASE_WITH_DRAWERS,          label: 'Szuflady',            svgTemplate: 'base-drawers' },
        { type: KitchenCabinetType.BASE_SINK,                  label: 'Zlewowa',             svgTemplate: 'base-sink' },
        { type: KitchenCabinetType.BASE_COOKTOP,               label: 'Płyta grzewcza',      svgTemplate: 'base-cooktop' },
        { type: KitchenCabinetType.BASE_DISHWASHER,            label: 'Zmywarka (front)',    svgTemplate: 'base-dishwasher' },
        { type: KitchenCabinetType.BASE_DISHWASHER_FREESTANDING, label: 'Zmywarka wol.',    svgTemplate: 'base-dishwasher-free' },
        { type: KitchenCabinetType.BASE_OVEN,                  label: 'Piekarnik',           svgTemplate: 'base-oven' },
        { type: KitchenCabinetType.BASE_OVEN_FREESTANDING,    label: 'Piekarnik wol.',      svgTemplate: 'base-oven-free' },
        { type: KitchenCabinetType.BASE_FRIDGE,                label: 'Lodówka (zabudowa)', svgTemplate: 'base-fridge' },
        { type: KitchenCabinetType.BASE_FRIDGE_FREESTANDING,  label: 'Lodówka wol.',        svgTemplate: 'base-fridge-free' },
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
      ]
    },
    {
      title: 'Specjalne',
      types: [
        { type: KitchenCabinetType.TALL_CABINET,   label: 'Słupek',   svgTemplate: 'tall' },
        { type: KitchenCabinetType.CORNER_CABINET, label: 'Narożna',  svgTemplate: 'corner' },
      ]
    }
  ];

  select(type: KitchenCabinetType): void {
    this.dialogRef.close(type);
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
