import { Routes } from '@angular/router';
import { signedInGuard, signedOutGuard } from './auth/auth.guards';

export const routes: Routes = [
  // Public. Signed-in visitors don't match it and fall through to the shell's redirect to the diary.
  {
    path: '',
    pathMatch: 'full',
    canMatch: [signedOutGuard],
    loadComponent: () => import('./features/landing/landing-page.component').then((m) => m.LandingPageComponent),
    title: 'Maxxing | Personal nutrition tracker',
  },
  {
    path: '',
    canMatch: [signedInGuard],
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
