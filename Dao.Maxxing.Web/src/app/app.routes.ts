import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./demo/demo').then(m => m.Demo) },
  { path: 'template', loadComponent: () => import('./template').then(m => m.TemplateComponent) },
  { path: '**', redirectTo: '' },
];
