import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../shared/theme.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="sticky top-0 z-50 border-b border-surface-200/80 bg-surface-0/80 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <!-- Logo -->
        <a routerLink="/" class="flex items-center gap-3">
          <img src="logo/icon.png" alt="Prodara" class="h-10 w-10" />
          <span class="text-xl font-bold tracking-tight text-surface-950">Prodara</span>
        </a>

        <!-- Desktop nav links -->
        <div class="hidden items-center gap-1 md:flex">
          @for (link of links; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="text-primary-600 bg-primary-50"
              [routerLinkActiveOptions]="{ exact: !!link.exact }"
              class="rounded-lg px-3 py-2 text-sm font-medium text-surface-600 transition hover:bg-surface-100 hover:text-surface-950"
            >
              {{ link.label }}
            </a>
          }
        </div>

        <!-- Right side actions -->
        <div class="flex items-center gap-2">
          <!-- Search trigger -->
          <button
            (click)="openSearch()"
            class="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm text-surface-400 transition hover:border-primary-300 hover:text-primary-500"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <span class="hidden sm:inline">Search</span>
            <kbd class="hidden rounded border border-surface-200 px-1.5 py-0.5 text-xs font-mono text-surface-500 sm:inline">\u2318K</kbd>
          </button>

          <!-- Theme toggle -->
          <button
            (click)="themeService.toggle()"
            class="rounded-lg p-2 text-surface-500 transition hover:bg-surface-100 hover:text-surface-900"
            [attr.aria-label]="themeService.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            @if (themeService.theme() === 'dark') {
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            } @else {
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            }
          </button>

          <!-- GitHub -->
          <a
            href="https://github.com/prodara-ai/prodara"
            target="_blank"
            rel="noopener"
            class="rounded-lg p-2 text-surface-500 transition hover:bg-surface-100 hover:text-surface-900"
            aria-label="GitHub repository"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>

          <!-- Mobile menu button -->
          <button
            (click)="mobileOpen = !mobileOpen"
            class="rounded-lg p-2 text-surface-600 md:hidden"
            aria-label="Toggle menu"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              @if (mobileOpen) {
                <path d="M6 18 18 6M6 6l12 12"/>
              } @else {
                <path d="M4 6h16M4 12h16M4 18h16"/>
              }
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile nav -->
      @if (mobileOpen) {
        <div class="border-t border-surface-200 bg-surface-0 px-4 py-3 md:hidden">
          @for (link of links; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="text-primary-600 bg-primary-50"
              (click)="mobileOpen = false"
              class="block rounded-lg px-3 py-2 text-sm font-medium text-surface-600 hover:bg-surface-100"
            >
              {{ link.label }}
            </a>
          }
        </div>
      }
    </nav>
  `,
})
export class NavbarComponent {
  protected readonly themeService = inject(ThemeService);
  protected mobileOpen = false;

  readonly links = [
    { path: '/docs', label: 'Docs', exact: false },
    { path: '/tutorials', label: 'Tutorials', exact: false },
    { path: '/enterprise', label: 'Enterprise', exact: true },
  ];

  openSearch(): void {
    document.dispatchEvent(new CustomEvent('open-search'));
  }
}
