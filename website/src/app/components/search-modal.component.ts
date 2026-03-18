import { Component, HostListener, signal } from '@angular/core';
import { Router } from '@angular/router';

interface SearchEntry {
  title: string;
  path: string;
  section: string;
  keywords: string;
}

@Component({
  selector: 'app-search-modal',
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" (click)="close()">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div
          class="relative z-10 w-full max-w-xl rounded-xl border border-surface-200 bg-surface-0 shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <!-- Search input -->
          <div class="flex items-center gap-3 border-b border-surface-200 px-4 py-3">
            <svg class="h-5 w-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              #searchInput
              type="text"
              placeholder="Search documentation..."
              class="flex-1 bg-transparent text-sm text-surface-900 placeholder-surface-400 outline-none"
              [value]="query()"
              (input)="search($any($event.target).value)"
            />
            <kbd class="rounded border border-surface-200 px-1.5 py-0.5 text-xs font-mono text-surface-400">ESC</kbd>
          </div>

          <!-- Results -->
          <div class="max-h-80 overflow-y-auto p-2">
            @if (results().length === 0 && query().length > 0) {
              <p class="px-4 py-8 text-center text-sm text-surface-500">No results found.</p>
            }
            @for (result of results(); track result.path) {
              <button
                class="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-surface-100"
                (click)="navigate(result.path)"
              >
                <div>
                  <div class="text-sm font-medium text-surface-950">{{ result.title }}</div>
                  <div class="text-xs text-surface-500">{{ result.section }}</div>
                </div>
              </button>
            }
            @if (query().length === 0) {
              <div class="px-4 py-6">
                <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-surface-500">Quick Links</p>
                @for (link of quickLinks; track link.path) {
                  <button
                    class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-surface-800 transition hover:bg-surface-100"
                    (click)="navigate(link.path)"
                  >
                    {{ link.title }}
                  </button>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class SearchModalComponent {
  readonly isOpen = signal(false);
  readonly query = signal('');
  readonly results = signal<SearchEntry[]>([]);

  readonly quickLinks = [
    { title: 'Quick Start Tutorial', path: '/tutorials/quick-start' },
    { title: 'CLI Usage', path: '/docs/cli-usage' },
    { title: 'Product Graph', path: '/docs/product-graph' },
    { title: 'API Reference', path: '/docs/api-reference' },
    { title: 'Glossary', path: '/glossary' },
  ];

  private readonly entries: SearchEntry[] = [
    { title: 'Overview', path: '/docs', section: 'Docs', keywords: 'documentation getting started introduction' },
    { title: 'Architecture', path: '/docs/architecture', section: 'Docs', keywords: 'compiler phases pipeline 15 phases lexer parser binder' },
    { title: 'CLI Usage', path: '/docs/cli-usage', section: 'Docs', keywords: 'commands build init validate graph plan test terminal' },
    { title: 'Product Graph', path: '/docs/product-graph', section: 'Docs', keywords: 'graph json output nodes edges deterministic semantic' },
    { title: 'Plan Format', path: '/docs/plan-format', section: 'Docs', keywords: 'plan diff incremental changes impact propagation' },
    { title: 'Diagnostics', path: '/docs/diagnostics', section: 'Docs', keywords: 'errors warnings codes PRD diagnostic bag fixes' },
    { title: 'Agent Integration', path: '/docs/agent-integration', section: 'Docs', keywords: 'AI agent workflow json non-interactive' },
    { title: 'Entities & Fields', path: '/docs/language/entities', section: 'Language', keywords: 'entity field type string integer uuid optional list' },
    { title: 'Workflows', path: '/docs/language/workflows', section: 'Language', keywords: 'workflow steps call decide authorization capability' },
    { title: 'Surfaces & Screens', path: '/docs/language/surfaces', section: 'Language', keywords: 'surface screen view form dashboard api actions hooks' },
    { title: 'Governance', path: '/docs/language/governance', section: 'Language', keywords: 'constitution policies security privacy testing style' },
    { title: 'Testing', path: '/docs/language/testing', section: 'Language', keywords: 'test expect given target transition returns authorization' },
    { title: 'Quick Start', path: '/tutorials/quick-start', section: 'Tutorials', keywords: 'install scaffold compile 5 minutes beginner' },
    { title: 'Deep Dive: Task Board', path: '/tutorials/deep-dive', section: 'Tutorials', keywords: 'task board multi-module workflows intermediate' },
    { title: 'API Reference', path: '/docs/api-reference', section: 'Docs', keywords: 'compile buildGraph diffGraphs createPlan extensions api' },
    { title: 'Enterprise', path: '/enterprise', section: 'Enterprise', keywords: 'support sales custom integrations priority' },
    { title: 'Glossary', path: '/glossary', section: 'Reference', keywords: 'terms definitions actor entity module product graph' },
  ];

  constructor(private router: Router) {}

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.isOpen.set(true);
    }
    if (event.key === 'Escape') {
      this.close();
    }
  }

  @HostListener('document:open-search')
  onOpenSearch(): void {
    this.isOpen.set(true);
  }

  search(term: string): void {
    this.query.set(term);
    if (!term.trim()) {
      this.results.set([]);
      return;
    }
    const lower = term.toLowerCase();
    this.results.set(
      this.entries.filter(
        e =>
          e.title.toLowerCase().includes(lower) ||
          e.keywords.toLowerCase().includes(lower) ||
          e.section.toLowerCase().includes(lower),
      ),
    );
  }

  navigate(path: string): void {
    this.close();
    this.router.navigateByUrl(path);
  }

  close(): void {
    this.isOpen.set(false);
    this.query.set('');
    this.results.set([]);
  }
}
