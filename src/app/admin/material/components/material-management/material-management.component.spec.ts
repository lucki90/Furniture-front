import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BoardVariantListComponent } from '../board-variant-list/board-variant-list.component';
import { ComponentVariantListComponent } from '../component-variant-list/component-variant-list.component';
import { JobVariantListComponent } from '../job-variant-list/job-variant-list.component';
import { MaterialListComponent } from '../material-list/material-list.component';
import { MaterialManagementComponent } from './material-management.component';

@Component({
  selector: 'app-material-list',
  standalone: true,
  template: '<div class="stub-material-list">Material list</div>'
})
class StubMaterialListComponent {}

@Component({
  selector: 'app-board-variant-list',
  standalone: true,
  template: '<div class="stub-board-list">Board variants</div>'
})
class StubBoardVariantListComponent {}

@Component({
  selector: 'app-component-variant-list',
  standalone: true,
  template: '<div class="stub-component-list">Component variants</div>'
})
class StubComponentVariantListComponent {}

@Component({
  selector: 'app-job-variant-list',
  standalone: true,
  template: '<div class="stub-job-list">Job variants</div>'
})
class StubJobVariantListComponent {}

describe('MaterialManagementComponent', () => {
  let fixture: ComponentFixture<MaterialManagementComponent>;
  let component: MaterialManagementComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialManagementComponent, NoopAnimationsModule]
    })
      .overrideComponent(MaterialManagementComponent, {
        remove: {
          imports: [
            BoardVariantListComponent,
            ComponentVariantListComponent,
            JobVariantListComponent,
            MaterialListComponent
          ]
        },
        add: {
          imports: [
            StubMaterialListComponent,
            StubBoardVariantListComponent,
            StubComponentVariantListComponent,
            StubJobVariantListComponent
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(MaterialManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the page hero with summary chips', () => {
    const title = fixture.nativeElement.querySelector('.app-page-title') as HTMLElement;
    const chips = fixture.nativeElement.querySelectorAll('.app-page-summary-chip');

    expect(title.textContent).toContain('Zarzadzanie materialami');
    expect(chips.length).toBe(5);
  });

  it('renders all tab labels', () => {
    const tabLabels = Array.from<Element>(
      fixture.nativeElement.querySelectorAll('.mdc-tab__text-label')
    ).map(element => element.textContent?.trim().replace(/\s+/g, ' '));

    expect(tabLabels.some(label => label?.includes('Materialy'))).toBeTrue();
    expect(tabLabels.some(label => label?.includes('Warianty plyt'))).toBeTrue();
    expect(tabLabels.some(label => label?.includes('Warianty komponentow'))).toBeTrue();
    expect(tabLabels.some(label => label?.includes('Warianty prac'))).toBeTrue();
  });

  it('renders the first tab content by default', () => {
    const firstTabContent = fixture.nativeElement.querySelector('.stub-material-list') as HTMLElement | null;

    expect(component).toBeTruthy();
    expect(firstTabContent).not.toBeNull();
  });

  it('hides decorative icons from screen readers', () => {
    const decorativeIcons = fixture.nativeElement.querySelectorAll('mat-icon[aria-hidden="true"]');

    expect(decorativeIcons.length).toBeGreaterThanOrEqual(9);
  });
});
