import { Routes } from '@angular/router';

export const apiRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./api-reference.component').then(m => m.ApiReferenceComponent),
  },
];
