import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { PlaceholderNoticeComponent } from '../../components/placeholder-notice/placeholder-notice.component';
import { SettingsStore } from './data-access/settings.store';
import { GoalsFormComponent } from './goals-form.component';
import { MealSectionsFormComponent } from './meal-sections-form.component';
import { PreferencesFormComponent } from './preferences-form.component';

@Component({
  selector: 'app-settings-page',
  imports: [
    PageHeaderComponent,
    PlaceholderNoticeComponent,
    GoalsFormComponent,
    MealSectionsFormComponent,
    PreferencesFormComponent,
  ],
  template: `
    <app-page-header heading="Make it yours" subtitle="Your targets, your routine, your data." />
    <app-placeholder-notice feature="Settings" [issue]="21" />
    @if (store.error(); as error) {
      <div class="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
        <span class="me-auto">{{ error }}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" (click)="store.reload()">Try again</button>
      </div>
    }
    <div class="row g-4">
      <div class="col-xl-6"><app-goals-form /></div>
      <div class="col-xl-6"><app-meal-sections-form /></div>
      <div class="col-xl-6"><app-preferences-form /></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent {
  protected readonly store = inject(SettingsStore);
}
