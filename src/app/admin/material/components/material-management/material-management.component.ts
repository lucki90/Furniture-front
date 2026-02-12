import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BoardVariantListComponent } from '../board-variant-list/board-variant-list.component';
import { ComponentVariantListComponent } from '../component-variant-list/component-variant-list.component';
import { JobVariantListComponent } from '../job-variant-list/job-variant-list.component';
import { BulkPriceDialogComponent } from '../bulk-price-dialog/bulk-price-dialog.component';

@Component({
  selector: 'app-material-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    BoardVariantListComponent,
    ComponentVariantListComponent,
    JobVariantListComponent
  ],
  templateUrl: './material-management.component.html',
  styleUrl: './material-management.component.css'
})
export class MaterialManagementComponent {
  constructor(private dialog: MatDialog) {}

  openBulkPriceDialog(): void {
    this.dialog.open(BulkPriceDialogComponent, {
      width: '500px'
    });
  }
}
