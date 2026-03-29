import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BoardVariantListComponent } from '../board-variant-list/board-variant-list.component';
import { ComponentVariantListComponent } from '../component-variant-list/component-variant-list.component';
import { JobVariantListComponent } from '../job-variant-list/job-variant-list.component';
import { MaterialListComponent } from '../material-list/material-list.component';

@Component({
  selector: 'app-material-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    BoardVariantListComponent,
    ComponentVariantListComponent,
    JobVariantListComponent,
    MaterialListComponent
  ],
  templateUrl: './material-management.component.html',
  styleUrl: './material-management.component.css'
})
export class MaterialManagementComponent {}
