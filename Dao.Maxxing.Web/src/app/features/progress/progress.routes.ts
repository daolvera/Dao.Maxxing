import { Routes } from '@angular/router';
import { ProgressStore } from './data-access/progress.store';
import { ProgressPageComponent } from './progress-page.component';

export const progressRoutes: Routes = [
  {
    path: '',
    component: ProgressPageComponent,
    providers: [ProgressStore],
    title: 'Progress · Maxxing',
  },
];
