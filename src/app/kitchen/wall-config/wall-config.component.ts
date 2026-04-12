import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KitchenStateService } from '../service/kitchen-state.service';
import { CountertopConfig, PlinthConfig, isUpperCabinetType } from '../model/kitchen-state.model';
import {
  CountertopMaterialType,
  COUNTERTOP_MATERIAL_OPTIONS,
  CountertopJointType,
  COUNTERTOP_JOINT_OPTIONS,
  CountertopEdgeType,
  COUNTERTOP_EDGE_OPTIONS,
  COUNTERTOP_THICKNESS_OPTIONS
} from '../model/countertop.model';
import {
  FeetType,
  FEET_TYPE_OPTIONS,
  PlinthMaterialType,
  PLINTH_MATERIAL_OPTIONS
} from '../model/plinth.model';

/** Domyślna konfiguracja blatu — fallback gdy ściana nie ma jeszcze ustawień. */
const DEFAULT_COUNTERTOP_CONFIG: CountertopConfig = {
  enabled: true,
  materialType: 'LAMINATE' as CountertopMaterialType,
  thicknessMm: 38,
  jointType: 'ALUMINUM_STRIP' as CountertopJointType,
  edgeType: 'ABS_EDGE' as CountertopEdgeType
};

/** Domyślna konfiguracja cokołu — fallback gdy ściana nie ma jeszcze ustawień. */
const DEFAULT_PLINTH_CONFIG: PlinthConfig = {
  enabled: true,
  feetType: 'FEET_100' as FeetType,
  materialType: 'PVC' as PlinthMaterialType
};

/**
 * Panel konfiguracji blatu, cokołu i blendy górnej aktualnej ściany.
 * Wydzielony z KitchenPageComponent (R.2.5) — zero zmian zachowania.
 *
 * Po każdej zmianie emituje `configChanged` → parent wywołuje resetProjectResult().
 * Wszystkie operacje na stanie delegowane bezpośrednio do KitchenStateService.
 */
@Component({
  selector: 'app-wall-config',
  templateUrl: './wall-config.component.html',
  styleUrls: ['./wall-config.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class WallConfigComponent {

  @Output() configChanged = new EventEmitter<void>();

  readonly stateService = inject(KitchenStateService);

  // ── Readonly shortcuts ────────────────────────────────────────────────────────

  readonly selectedWall = this.stateService.selectedWall;
  private readonly selectedWallId = this.stateService.selectedWallId;

  // ── Dropdown options ──────────────────────────────────────────────────────────

  readonly countertopMaterialOptions = COUNTERTOP_MATERIAL_OPTIONS;
  readonly countertopThicknessOptions = COUNTERTOP_THICKNESS_OPTIONS;
  readonly countertopJointOptions = COUNTERTOP_JOINT_OPTIONS;
  readonly countertopEdgeOptions = COUNTERTOP_EDGE_OPTIONS;
  readonly feetTypeOptions = FEET_TYPE_OPTIONS;
  readonly plinthMaterialOptions = PLINTH_MATERIAL_OPTIONS;

  // ── Private helpers ───────────────────────────────────────────────────────────

  private getSelectedWallCountertopConfig(): CountertopConfig | undefined {
    const wallId = this.selectedWallId();
    if (!wallId) return undefined;
    return this.stateService.getCountertopConfig(wallId);
  }

  private getSelectedWallPlinthConfig(): PlinthConfig | undefined {
    const wallId = this.selectedWallId();
    if (!wallId) return undefined;
    return this.stateService.getPlinthConfig(wallId);
  }

  private emit(): void {
    this.configChanged.emit();
  }

  // ── Computed signals (memoizowane — nie przeliczają się przy każdym CD cycle) ──

  /** Maksymalna głębokość szafek dolnych aktualnej ściany. */
  readonly maxBottomCabinetDepth = computed(() => {
    const wall = this.selectedWall();
    if (!wall || wall.cabinets.length === 0) return 0;
    const bottomCabinets = wall.cabinets.filter(c => !isUpperCabinetType(c.type));
    if (bottomCabinets.length === 0) return 0;
    return Math.max(...bottomCabinets.map(c => c.depth));
  });

  /** True gdy głębokość blatu jest mniejsza niż głębokość szafek dolnych. */
  readonly countertopDepthWarning = computed(() => {
    const maxCabDepth = this.maxBottomCabinetDepth();
    return maxCabDepth > 0 && this.countertopDepth < maxCabDepth;
  });

  /** Wysokość panelu cokołu (mm) — zależna od wybranego typu nóżek. */
  readonly plinthHeight = computed(() => {
    const feetOption = this.feetTypeOptions.find(o => o.value === this.feetType);
    return feetOption?.plinthHeightMm ?? 97;
  });

  // ── Countertop getters/setters ────────────────────────────────────────────────

  get countertopEnabled(): boolean {
    return this.getSelectedWallCountertopConfig()?.enabled ?? true;
  }

  set countertopEnabled(value: boolean) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? DEFAULT_COUNTERTOP_CONFIG;
    this.stateService.updateCountertopConfig(wallId, { ...current, enabled: value });
    this.emit();
  }

  get countertopMaterial(): CountertopMaterialType {
    return this.getSelectedWallCountertopConfig()?.materialType ?? 'LAMINATE';
  }

  set countertopMaterial(value: CountertopMaterialType) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? DEFAULT_COUNTERTOP_CONFIG;
    this.stateService.updateCountertopConfig(wallId, { ...current, materialType: value });
    this.emit();
  }

  get countertopThickness(): number {
    return this.getSelectedWallCountertopConfig()?.thicknessMm ?? 38;
  }

  set countertopThickness(value: number) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? DEFAULT_COUNTERTOP_CONFIG;
    this.stateService.updateCountertopConfig(wallId, { ...current, thicknessMm: value });
    // Synchronizuj grubość blatu z globalnym sygnałem
    this.stateService.updateProjectSettings({ countertopThicknessMm: value });
    this.emit();
  }

  get countertopJoint(): CountertopJointType {
    return this.getSelectedWallCountertopConfig()?.jointType ?? 'ALUMINUM_STRIP';
  }

  set countertopJoint(value: CountertopJointType) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? DEFAULT_COUNTERTOP_CONFIG;
    this.stateService.updateCountertopConfig(wallId, { ...current, jointType: value });
    this.emit();
  }

  get countertopEdge(): CountertopEdgeType {
    return this.getSelectedWallCountertopConfig()?.edgeType ?? 'ABS_EDGE';
  }

  set countertopEdge(value: CountertopEdgeType) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? DEFAULT_COUNTERTOP_CONFIG;
    this.stateService.updateCountertopConfig(wallId, { ...current, edgeType: value });
    this.emit();
  }

  get countertopDepth(): number {
    return this.getSelectedWallCountertopConfig()?.manualDepthMm ?? 600;
  }

  set countertopDepth(value: number) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true };
    this.stateService.updateCountertopConfig(wallId, { ...current, manualDepthMm: value });
    this.emit();
  }

  get countertopSideOverhang(): number {
    return this.getSelectedWallCountertopConfig()?.sideOverhangExtraMm ?? 5;
  }

  set countertopSideOverhang(value: number) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true };
    this.stateService.updateCountertopConfig(wallId, { ...current, sideOverhangExtraMm: value });
    this.emit();
  }

  get countertopManualLengthEnabled(): boolean {
    return this.getSelectedWallCountertopConfig()?.manualLengthMm != null;
  }

  set countertopManualLengthEnabled(enabled: boolean) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true };
    this.stateService.updateCountertopConfig(wallId, {
      ...current,
      manualLengthMm: enabled ? (current.manualLengthMm ?? 1200) : undefined
    });
    this.emit();
  }

  get countertopManualLength(): number {
    return this.getSelectedWallCountertopConfig()?.manualLengthMm ?? 1200;
  }

  set countertopManualLength(value: number) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallCountertopConfig() ?? { enabled: true };
    this.stateService.updateCountertopConfig(wallId, { ...current, manualLengthMm: value });
    this.emit();
  }

  // ── Plinth getters/setters ────────────────────────────────────────────────────

  get plinthEnabled(): boolean {
    return this.getSelectedWallPlinthConfig()?.enabled ?? true;
  }

  set plinthEnabled(value: boolean) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallPlinthConfig() ?? DEFAULT_PLINTH_CONFIG;
    this.stateService.updatePlinthConfig(wallId, { ...current, enabled: value });
    this.emit();
  }

  get feetType(): FeetType {
    return this.getSelectedWallPlinthConfig()?.feetType ?? 'FEET_100';
  }

  set feetType(value: FeetType) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallPlinthConfig() ?? DEFAULT_PLINTH_CONFIG;
    this.stateService.updatePlinthConfig(wallId, { ...current, feetType: value });
    // Synchronizuj wysokość nóżek z globalnym sygnałem
    const feetOption = this.feetTypeOptions.find(o => o.value === value);
    this.stateService.updateProjectSettings({ plinthHeightMm: feetOption?.feetHeightMm ?? 100 });
    this.emit();
  }

  get plinthMaterial(): PlinthMaterialType {
    return this.getSelectedWallPlinthConfig()?.materialType ?? 'PVC';
  }

  set plinthMaterial(value: PlinthMaterialType) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallPlinthConfig() ?? DEFAULT_PLINTH_CONFIG;
    this.stateService.updatePlinthConfig(wallId, { ...current, materialType: value });
    this.emit();
  }

  get plinthThickness(): number {
    const configured = this.getSelectedWallPlinthConfig()?.thicknessMm;
    if (configured != null) return configured;
    const mat = this.plinthMaterial;
    return (mat === 'MDF_LAMINATED' || mat === 'CHIPBOARD') ? 18 : 16;
  }

  set plinthThickness(value: number) {
    const wallId = this.selectedWallId();
    if (!wallId) return;
    const current = this.getSelectedWallPlinthConfig() ?? { enabled: true };
    this.stateService.updatePlinthConfig(wallId, { ...current, thicknessMm: value });
    this.emit();
  }

  // ── Upper filler getter/setter ────────────────────────────────────────────────

  get upperFillerHeight(): number {
    return this.stateService.upperFillerHeightMm();
  }

  set upperFillerHeight(value: number) {
    this.stateService.updateProjectSettings({ upperFillerHeightMm: value });
    this.emit();
  }

  protected trackByValue = (_: number, item: { value: string | number }) => item.value;
  protected trackByIndex = (index: number) => index;
}
