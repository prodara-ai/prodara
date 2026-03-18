import { Routes } from '@angular/router';

export const tutorialsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tutorials-index.component').then(m => m.TutorialsIndexComponent),
  },
  {
    path: 'quick-start',
    loadComponent: () => import('./quick-start.component').then(m => m.QuickStartComponent),
  },
  {
    path: 'deep-dive',
    loadComponent: () => import('./deep-dive.component').then(m => m.DeepDiveComponent),
  },
  {
    path: 'custom-reviewers',
    loadComponent: () => import('./custom-reviewers.component').then(m => m.CustomReviewersTutorialComponent),
  },
  {
    path: 'create-extension',
    loadComponent: () => import('./create-extension.component').then(m => m.CreateExtensionTutorialComponent),
  },
  {
    path: 'interactive-workflows',
    loadComponent: () => import('./interactive-workflows.component').then(m => m.InteractiveWorkflowsTutorialComponent),
  },
  {
    path: 'proposal-management',
    loadComponent: () => import('./proposal-management.component').then(m => m.ProposalManagementTutorialComponent),
  },
];
