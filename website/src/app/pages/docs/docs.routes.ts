import { Routes } from '@angular/router';
import { DocsLayoutComponent } from './docs-layout.component';

export const docsRoutes: Routes = [
  {
    path: '',
    component: DocsLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/overview.component').then(m => m.DocsOverviewComponent),
      },
      {
        path: 'architecture',
        loadComponent: () => import('./pages/architecture.component').then(m => m.ArchitectureComponent),
      },
      {
        path: 'cli-usage',
        loadComponent: () => import('./pages/cli-usage.component').then(m => m.CliUsageComponent),
      },
      {
        path: 'product-graph',
        loadComponent: () => import('./pages/product-graph.component').then(m => m.ProductGraphComponent),
      },
      {
        path: 'plan-format',
        loadComponent: () => import('./pages/plan-format.component').then(m => m.PlanFormatComponent),
      },
      {
        path: 'diagnostics',
        loadComponent: () => import('./pages/diagnostics.component').then(m => m.DiagnosticsComponent),
      },
      {
        path: 'agent-integration',
        loadComponent: () => import('./pages/agent-integration.component').then(m => m.AgentIntegrationComponent),
      },
      {
        path: 'slash-commands',
        loadComponent: () => import('./pages/slash-commands.component').then(m => m.SlashCommandsComponent),
      },
      {
        path: 'interactive-modes',
        loadComponent: () => import('./pages/interactive-modes.component').then(m => m.InteractiveModesComponent),
      },
      {
        path: 'customization',
        loadComponent: () => import('./pages/customization.component').then(m => m.CustomizationComponent),
      },
      {
        path: 'extensions',
        loadComponent: () => import('./pages/extensions.component').then(m => m.ExtensionsComponent),
      },
      {
        path: 'proposals',
        loadComponent: () => import('./pages/proposals.component').then(m => m.ProposalsComponent),
      },
      {
        path: 'workflows',
        loadComponent: () => import('./pages/workflows.component').then(m => m.WorkflowsComponent),
      },
      {
        path: 'configuration',
        loadComponent: () => import('./pages/configuration.component').then(m => m.ConfigurationComponent),
      },
      {
        path: 'language/entities',
        loadComponent: () => import('./pages/lang-entities.component').then(m => m.LangEntitiesComponent),
      },
      {
        path: 'language/workflows',
        loadComponent: () => import('./pages/lang-workflows.component').then(m => m.LangWorkflowsComponent),
      },
      {
        path: 'language/surfaces',
        loadComponent: () => import('./pages/lang-surfaces.component').then(m => m.LangSurfacesComponent),
      },
      {
        path: 'language/governance',
        loadComponent: () => import('./pages/lang-governance.component').then(m => m.LangGovernanceComponent),
      },
      {
        path: 'language/testing',
        loadComponent: () => import('./pages/lang-testing.component').then(m => m.LangTestingComponent),
      },
      {
        path: 'api-reference',
        loadComponent: () => import('../../pages/api/api-reference.component').then(m => m.ApiReferenceComponent),
      },
    ],
  },
];
