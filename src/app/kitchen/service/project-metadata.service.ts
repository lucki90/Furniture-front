import { Injectable, signal } from '@angular/core';
import { ProjectStatus } from '../model/kitchen-project.model';

/**
 * Serwis odpowiedzialny za metadane aktywnego projektu:
 * - ID, nazwa, opis projektu
 * - Dane klienta (imię, telefon, email)
 * - Wersja i status projektu
 * - Dozwolone przejścia statusu
 *
 * Wydzielony z KitchenStateService (R.2.2) — zero zmian zachowania.
 * KitchenStateService deleguje przez fasadę.
 */
@Injectable({
  providedIn: 'root'
})
export class ProjectMetadataService {

  // ============ PRIVATE SIGNALS ============

  private _currentProjectId = signal<number | null>(null);
  private _currentProjectName = signal<string | null>(null);
  private _currentProjectDescription = signal<string | null>(null);
  private _currentProjectClientName = signal<string | null>(null);
  private _currentProjectClientPhone = signal<string | null>(null);
  private _currentProjectClientEmail = signal<string | null>(null);
  private _currentProjectVersion = signal<number>(0);
  private _currentProjectStatus = signal<ProjectStatus>('DRAFT');
  private _currentProjectAllowedTransitions = signal<ProjectStatus[]>([]);
  private _currentProjectRoomWidthMm = signal<number | null>(null);
  private _currentProjectRoomDepthMm = signal<number | null>(null);

  // ============ PUBLIC READONLY SIGNALS ============

  readonly currentProjectId = this._currentProjectId.asReadonly();
  readonly currentProjectName = this._currentProjectName.asReadonly();
  readonly currentProjectDescription = this._currentProjectDescription.asReadonly();
  readonly currentProjectClientName = this._currentProjectClientName.asReadonly();
  readonly currentProjectClientPhone = this._currentProjectClientPhone.asReadonly();
  readonly currentProjectClientEmail = this._currentProjectClientEmail.asReadonly();
  readonly currentProjectVersion = this._currentProjectVersion.asReadonly();
  readonly currentProjectStatus = this._currentProjectStatus.asReadonly();
  readonly currentProjectAllowedTransitions = this._currentProjectAllowedTransitions.asReadonly();
  readonly currentProjectRoomWidthMm = this._currentProjectRoomWidthMm.asReadonly();
  readonly currentProjectRoomDepthMm = this._currentProjectRoomDepthMm.asReadonly();

  // ============ METHODS ============

  /**
   * Ustawia metadane projektu po zapisie lub ładowaniu z API.
   */
  setProjectInfo(
    projectId: number,
    projectName: string,
    version: number,
    description?: string,
    status?: ProjectStatus,
    allowedTransitions?: ProjectStatus[],
    clientName?: string,
    clientPhone?: string,
    clientEmail?: string,
    roomWidthMm?: number,
    roomDepthMm?: number
  ): void {
    this._currentProjectId.set(projectId);
    this._currentProjectName.set(projectName);
    this._currentProjectDescription.set(description ?? null);
    this._currentProjectClientName.set(clientName ?? null);
    this._currentProjectClientPhone.set(clientPhone ?? null);
    this._currentProjectClientEmail.set(clientEmail ?? null);
    this._currentProjectVersion.set(version);
    if (status) this._currentProjectStatus.set(status);
    if (allowedTransitions) this._currentProjectAllowedTransitions.set(allowedTransitions);
    if (roomWidthMm !== undefined) {
      this._currentProjectRoomWidthMm.set(roomWidthMm ?? null);
    }
    if (roomDepthMm !== undefined) {
      this._currentProjectRoomDepthMm.set(roomDepthMm ?? null);
    }
  }

  /**
   * Ustawia pełne metadane przy wczytaniu projektu z backendu.
   */
  applyLoadedProject(project: {
    id: number;
    name: string;
    description?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    version: number;
    status: ProjectStatus;
    allowedTransitions?: ProjectStatus[];
    roomWidthMm?: number;
    roomDepthMm?: number;
  }): void {
    this._currentProjectId.set(project.id);
    this._currentProjectName.set(project.name);
    this._currentProjectDescription.set(project.description ?? null);
    this._currentProjectClientName.set(project.clientName ?? null);
    this._currentProjectClientPhone.set(project.clientPhone ?? null);
    this._currentProjectClientEmail.set(project.clientEmail ?? null);
    this._currentProjectVersion.set(project.version);
    this._currentProjectStatus.set(project.status);
    this._currentProjectAllowedTransitions.set(project.allowedTransitions ?? []);
    this._currentProjectRoomWidthMm.set(project.roomWidthMm ?? null);
    this._currentProjectRoomDepthMm.set(project.roomDepthMm ?? null);
  }

  updateRoomDimensions(roomWidthMm?: number | null, roomDepthMm?: number | null): void {
    this._currentProjectRoomWidthMm.set(roomWidthMm ?? null);
    this._currentProjectRoomDepthMm.set(roomDepthMm ?? null);
  }

  /**
   * Resetuje metadane do stanu nowego (niezapisanego) projektu.
   * Wywoływany przez KitchenStateService.clearAll().
   */
  clearMetadata(): void {
    this._currentProjectId.set(null);
    this._currentProjectName.set(null);
    this._currentProjectDescription.set(null);
    this._currentProjectClientName.set(null);
    this._currentProjectClientPhone.set(null);
    this._currentProjectClientEmail.set(null);
    this._currentProjectVersion.set(0);
    this._currentProjectStatus.set('DRAFT');
    this._currentProjectAllowedTransitions.set([]);
    this._currentProjectRoomWidthMm.set(null);
    this._currentProjectRoomDepthMm.set(null);
  }
}
