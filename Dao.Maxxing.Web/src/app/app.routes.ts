import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'diary' },
      { path: 'diary', loadChildren: () => import('./features/diary/diary.routes').then((m) => m.diaryRoutes) },
      { path: 'foods', loadChildren: () => import('./features/foods/foods.routes').then((m) => m.foodsRoutes) },
      {
        path: 'progress',
        loadChildren: () => import('./features/progress/progress.routes').then((m) => m.progressRoutes),
      },
      {
        path: 'settings',
        loadChildren: () => import('./features/settings/settings.routes').then((m) => m.settingsRoutes),
      },
    ],
  },
  // The original clickable UI mock, kept as the visual reference while screens are rebuilt.
  { path: 'demo', loadComponent: () => import('./demo/demo').then((m) => m.Demo), title: 'UI mock · Maxxing' },
  { path: 'template', loadComponent: () => import('./template').then((m) => m.TemplateComponent) },
  { path: '**', redirectTo: '' },
];
