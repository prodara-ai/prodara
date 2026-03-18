import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'docs',
    loadChildren: () => import('./pages/docs/docs.routes').then(m => m.docsRoutes),
  },
  {
    path: 'tutorials',
    loadChildren: () => import('./pages/tutorials/tutorials.routes').then(m => m.tutorialsRoutes),
  },
  {
    path: 'enterprise',
    loadComponent: () => import('./pages/enterprise/enterprise.component').then(m => m.EnterpriseComponent),
  },
  {
    path: 'glossary',
    loadComponent: () => import('./pages/glossary/glossary.component').then(m => m.GlossaryComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
