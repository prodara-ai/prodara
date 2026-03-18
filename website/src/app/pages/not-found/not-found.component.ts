import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="flex min-h-[60vh] items-center justify-center px-4">
      <div class="text-center">
        <p class="text-6xl font-extrabold text-primary-600">404</p>
        <h1 class="mt-4 text-2xl font-bold text-surface-950">Page not found</h1>
        <p class="mt-2 text-surface-600">The page you're looking for doesn't exist or has been moved.</p>
        <a
          routerLink="/"
          class="mt-6 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Back to Home
        </a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
