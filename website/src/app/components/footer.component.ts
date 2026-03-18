import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="border-t border-surface-200 bg-surface-50">
      <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 gap-8 md:grid-cols-4">
          <!-- Product -->
          <div>
            <h3 class="text-sm font-semibold text-surface-950">Product</h3>
            <ul class="mt-4 space-y-2">
              <li><a routerLink="/docs" class="text-sm text-surface-500 hover:text-primary-600 transition">Documentation</a></li>
              <li><a routerLink="/tutorials" class="text-sm text-surface-500 hover:text-primary-600 transition">Tutorials</a></li>
              <li><a routerLink="/docs/api-reference" class="text-sm text-surface-500 hover:text-primary-600 transition">API Reference</a></li>
              <li><a routerLink="/glossary" class="text-sm text-surface-500 hover:text-primary-600 transition">Glossary</a></li>
            </ul>
          </div>

          <!-- Resources -->
          <div>
            <h3 class="text-sm font-semibold text-surface-950">Resources</h3>
            <ul class="mt-4 space-y-2">
              <li><a routerLink="/tutorials/quick-start" class="text-sm text-surface-500 hover:text-primary-600 transition">Quick Start</a></li>
              <li><a routerLink="/docs/architecture" class="text-sm text-surface-500 hover:text-primary-600 transition">Architecture</a></li>
              <li><a href="https://github.com/prodara-ai/prodara/blob/main/CHANGELOG.md" target="_blank" rel="noopener" class="text-sm text-surface-500 hover:text-primary-600 transition">Changelog</a></li>
            </ul>
          </div>

          <!-- Community -->
          <div>
            <h3 class="text-sm font-semibold text-surface-950">Community</h3>
            <ul class="mt-4 space-y-2">
              <li><a href="https://github.com/prodara-ai/prodara" target="_blank" rel="noopener" class="text-sm text-surface-500 hover:text-primary-600 transition">GitHub</a></li>
              <li><a href="https://github.com/prodara-ai/prodara/issues" target="_blank" rel="noopener" class="text-sm text-surface-500 hover:text-primary-600 transition">Issues</a></li>
              <li><a href="https://github.com/prodara-ai/prodara/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener" class="text-sm text-surface-500 hover:text-primary-600 transition">Contributing</a></li>
            </ul>
          </div>

          <!-- Enterprise -->
          <div>
            <h3 class="text-sm font-semibold text-surface-950">Enterprise</h3>
            <ul class="mt-4 space-y-2">
              <li><a routerLink="/enterprise" class="text-sm text-surface-500 hover:text-primary-600 transition">Enterprise Support</a></li>
              <li><a href="mailto:support&#64;prodara.net" class="text-sm text-surface-500 hover:text-primary-600 transition">Contact Sales</a></li>
            </ul>
          </div>
        </div>

        <div class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-surface-200 pt-8 sm:flex-row">
          <div class="flex items-center gap-3">
            <img src="logo/icon.png" alt="Prodara" class="h-9 w-9" />
            <span class="text-sm font-semibold text-surface-950">Prodara</span>
          </div>
          <p class="text-sm text-surface-400">
            &copy; {{ year }} Prodara. Released under the MIT License.
          </p>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
