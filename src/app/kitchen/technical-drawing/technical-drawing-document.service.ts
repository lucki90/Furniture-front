import { Injectable, inject } from '@angular/core';
import { KitchenWorkspaceStore } from '../service/kitchen-workspace.store';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { buildTechnicalDrawingDocument } from './technical-drawing-document.builder';
import { TechnicalDrawingDocument } from './technical-drawing-document.model';

@Injectable({ providedIn: 'root' })
export class TechnicalDrawingDocumentService {
  private readonly workspaceStore = inject(KitchenWorkspaceStore);

  buildCurrentWorkspaceDocument(): TechnicalDrawingDocument {
    return this.buildDocument(this.workspaceStore.getWallsSnapshot());
  }

  private buildDocument(walls: WallWithCabinets[]): TechnicalDrawingDocument {
    return buildTechnicalDrawingDocument(walls);
  }
}
