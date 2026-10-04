import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { of, Subject } from 'rxjs';
import { ToastService } from '../../../../core/error/toast.service';
import { MaterialAdminService } from '../../service/material-admin.service';
import { MaterialOption } from '../../model/material-variant.model';
import { MaterialListComponent } from './material-list.component';

describe('MaterialListComponent', () => {
  let fixture: ComponentFixture<MaterialListComponent>;
  let component: MaterialListComponent;
  let materialAdminService: jasmine.SpyObj<MaterialAdminService>;
  let toastService: jasmine.SpyObj<ToastService>;

  const materials: MaterialOption[] = [
    { id: 1, code: 'CHIPBOARD', translationKey: 'MATERIAL.CHIPBOARD', active: true },
    { id: 2, code: 'MDF', translationKey: 'MATERIAL.MDF', active: false }
  ];

  beforeEach(async () => {
    materialAdminService = jasmine.createSpyObj<MaterialAdminService>('MaterialAdminService', [
      'getAllMaterials',
      'toggleMaterialActive'
    ]);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);

    materialAdminService.getAllMaterials.and.returnValue(of(materials));
    materialAdminService.toggleMaterialActive.and.returnValue(of({ ...materials[0], active: false }));

    await TestBed.configureTestingModule({
      imports: [MaterialListComponent, NoopAnimationsModule],
      providers: [
        { provide: MaterialAdminService, useValue: materialAdminService },
        { provide: ToastService, useValue: toastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MaterialListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads materials on init and renders summary chips', () => {
    const chips = Array.from<Element>(
      fixture.nativeElement.querySelectorAll('.admin-meta-chip')
    ).map(element => element.textContent?.trim());
    const count = fixture.nativeElement.querySelector('.settings-toolbar-count') as HTMLElement;

    expect(materialAdminService.getAllMaterials).toHaveBeenCalled();
    expect(component.materials().length).toBe(2);
    expect(chips).toContain('1 aktywny');
    expect(chips).toContain('1 nieaktywny');
    expect(count.textContent).toContain('2 materiały');
  });

  it('renders an empty state when the service returns no materials', async () => {
    materialAdminService.getAllMaterials.and.returnValue(of([]));

    fixture = TestBed.createComponent(MaterialListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyState = fixture.nativeElement.querySelector('.empty-state p') as HTMLElement;

    expect(emptyState.textContent).toContain('Brak materiałów w bazie danych');
  });

  it('updates local state after toggling material status', () => {
    component.onToggleActive(materials[0]);
    fixture.detectChanges();

    expect(materialAdminService.toggleMaterialActive).toHaveBeenCalledWith(1);
    expect(component.materials()[0].active).toBeFalse();
    expect(toastService.success).toHaveBeenCalledWith('Materiał "CHIPBOARD" - nieaktywny');
  });

  describe('toggle isolation', () => {
    const rowToggles = (): MatSlideToggle[] =>
      fixture.debugElement
        .queryAll(By.directive(MatSlideToggle))
        .map(debug => debug.componentInstance as MatSlideToggle);

    const switchButton = (index: number): HTMLButtonElement =>
      (fixture.nativeElement.querySelectorAll('button[role=switch]') as NodeListOf<HTMLButtonElement>)[index];

    const chips = (): (string | undefined)[] =>
      Array.from<Element>(fixture.nativeElement.querySelectorAll('.admin-meta-chip'))
        .map(element => element.textContent?.trim());

    let pending: Subject<MaterialOption>[];

    beforeEach(() => {
      pending = [];
      materialAdminService.toggleMaterialActive.calls.reset();
      materialAdminService.toggleMaterialActive.and.callFake(() => {
        const subject = new Subject<MaterialOption>();
        pending.push(subject);
        return subject;
      });
    });

    it('blocks a second PUT for the same material until the response arrives', () => {
      component.onToggleActive(materials[0]);
      component.onToggleActive(materials[0]);

      expect(materialAdminService.toggleMaterialActive).toHaveBeenCalledTimes(1);
    });

    it('starts one operation per click and disables only that row switch while pending', () => {
      switchButton(0).click();
      fixture.detectChanges();

      expect(materialAdminService.toggleMaterialActive).toHaveBeenCalledOnceWith(1);
      expect(switchButton(0).disabled).toBeTrue();
      expect(switchButton(1).disabled).toBeFalse();

      switchButton(0).click();
      expect(materialAdminService.toggleMaterialActive).toHaveBeenCalledTimes(1);
    });

    it('releases the lock after success and allows the next toggle', () => {
      switchButton(0).click();
      pending[0].next({ ...materials[0], active: false });
      pending[0].complete();
      fixture.detectChanges();

      expect(switchButton(0).disabled).toBeFalse();
      expect(rowToggles()[0].checked).toBeFalse();

      switchButton(0).click();
      fixture.detectChanges();

      expect(materialAdminService.toggleMaterialActive).toHaveBeenCalledTimes(2);
      pending[1].next({ ...materials[0], active: true });
      fixture.detectChanges();

      expect(component.materials()[0].active).toBeTrue();
      expect(rowToggles()[0].checked).toBeTrue();
      expect(toastService.success).toHaveBeenCalledWith('Materiał "CHIPBOARD" - aktywny');
    });

    it('restores the real switch to the confirmed state after an error (initially active)', () => {
      switchButton(0).click();
      fixture.detectChanges();
      expect(rowToggles()[0].checked).toBeFalse();

      pending[0].error(new Error('boom'));
      fixture.detectChanges();

      expect(component.materials()[0].active).toBeTrue();
      expect(rowToggles()[0].checked).toBeTrue();
      expect(switchButton(0).getAttribute('aria-checked')).toBe('true');
      expect(switchButton(0).disabled).toBeFalse();
      expect(toastService.error).toHaveBeenCalledOnceWith('Błąd podczas zmiany statusu materiału');
      expect(toastService.success).not.toHaveBeenCalled();
    });

    it('restores the real switch to the confirmed state after an error (initially inactive)', () => {
      switchButton(1).click();
      fixture.detectChanges();
      expect(rowToggles()[1].checked).toBeTrue();

      pending[0].error(new Error('boom'));
      fixture.detectChanges();

      expect(component.materials()[1].active).toBeFalse();
      expect(rowToggles()[1].checked).toBeFalse();
      expect(toastService.error).toHaveBeenCalledTimes(1);
    });

    it('allows a deliberate retry after an error', () => {
      switchButton(0).click();
      pending[0].error(new Error('boom'));
      fixture.detectChanges();

      switchButton(0).click();
      fixture.detectChanges();

      expect(materialAdminService.toggleMaterialActive).toHaveBeenCalledTimes(2);
      pending[1].next({ ...materials[0], active: false });
      fixture.detectChanges();

      expect(rowToggles()[0].checked).toBeFalse();
      expect(component.materials()[0].active).toBeFalse();
    });

    it('does not lock other rows and applies each response to its own material', () => {
      switchButton(0).click();
      switchButton(1).click();
      fixture.detectChanges();

      expect(materialAdminService.toggleMaterialActive.calls.allArgs()).toEqual([[1], [2]]);

      pending[1].next({ ...materials[1], active: true });
      fixture.detectChanges();

      expect(component.materials()[0].active).toBeTrue();
      expect(component.materials()[1].active).toBeTrue();
      expect(switchButton(0).disabled).toBeTrue();
      expect(switchButton(1).disabled).toBeFalse();

      pending[0].next({ ...materials[0], active: false });
      fixture.detectChanges();

      expect(component.materials().map(item => item.active)).toEqual([false, true]);
      expect(rowToggles().map(toggle => toggle.checked)).toEqual([false, true]);
      expect(chips()).toContain('1 aktywny');
      expect(chips()).toContain('1 nieaktywny');
      expect(toastService.success).toHaveBeenCalledTimes(2);
    });

    it('keeps the switch in sync with the server response when it differs from the click', () => {
      switchButton(0).click();
      pending[0].next({ ...materials[0], active: true });
      fixture.detectChanges();

      expect(component.materials()[0].active).toBeTrue();
      expect(rowToggles()[0].checked).toBeTrue();
    });

    it('does not touch state or toasts when destroyed while a request is pending', () => {
      switchButton(0).click();
      fixture.destroy();

      expect(() => pending[0].next({ ...materials[0], active: false })).not.toThrow();
      expect(pending[0].observed).toBeFalse();
      expect(toastService.success).not.toHaveBeenCalled();
      expect(toastService.error).not.toHaveBeenCalled();
    });
  });
});
