import { Component } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-docs-layout',
  imports: [RouterLink, RouterOutlet, RouterLinkActive],
  template: `
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex gap-8 py-8">
        <!-- Sidebar -->
        <aside class="hidden w-64 shrink-0 lg:block">
          <nav class="sticky top-24 space-y-6">
            @for (section of sidebar; track section.title) {
              <div>
                <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">{{ section.title }}</h4>
                <ul class="space-y-1">
                  @for (item of section.items; track item.path) {
                    <li>
                      <a
                        [routerLink]="item.path"
                        routerLinkActive="bg-primary-50 text-primary-700 font-medium dark:bg-primary-900/20"
                        class="block rounded-md px-3 py-1.5 text-sm text-surface-600 transition hover:bg-surface-100"
                      >
                        {{ item.label }}
                      </a>
                    </li>
                  }
                </ul>
              </div>
            }
          </nav>
        </aside>

        <!-- Main content -->
        <div class="min-w-0 flex-1">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
})
export class DocsLayoutComponent {
  readonly sidebar = [
    {
      title: 'Getting Started',
      items: [
        { path: '/docs', label: 'Overview' },
        { path: '/docs/architecture', label: 'Architecture' },
        { path: '/docs/configuration', label: 'Configuration' },
      ],
    },
    {
      title: 'Language Reference',
      items: [
        { path: '/docs/language/entities', label: 'Entities & Fields' },
        { path: '/docs/language/workflows', label: 'Workflows' },
        { path: '/docs/language/surfaces', label: 'Surfaces & Screens' },
        { path: '/docs/language/governance', label: 'Governance' },
        { path: '/docs/language/testing', label: 'Testing' },
      ],
    },
    {
      title: 'Compiler',
      items: [
        { path: '/docs/product-graph', label: 'Product Graph' },
        { path: '/docs/plan-format', label: 'Plan Format' },
        { path: '/docs/diagnostics', label: 'Diagnostics' },
        { path: '/docs/workflows', label: 'Custom Workflows' },
      ],
    },
    {
      title: 'AI & Agents',
      items: [
        { path: '/docs/agent-integration', label: 'Agent Integration' },
        { path: '/docs/slash-commands', label: 'AI Prompt File' },
        { path: '/docs/interactive-modes', label: 'Interactive Modes' },
      ],
    },
    {
      title: 'Customization',
      items: [
        { path: '/docs/customization', label: 'Reviewers & Constitution' },
        { path: '/docs/extensions', label: 'Extensions & Presets' },
        { path: '/docs/proposals', label: 'Proposals & Changes' },
      ],
    },
    {
      title: 'Reference',
      items: [
        { path: '/docs/cli-usage', label: 'CLI Usage' },
        { path: '/docs/api-reference', label: 'API Reference' },
      ],
    },
  ];
}
