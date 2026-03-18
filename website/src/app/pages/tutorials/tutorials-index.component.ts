import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-tutorials-index',
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Tutorials</h1>
      <p class="mt-4 text-lg text-surface-600">
        Learn Prodara step by step - from installing the VS Code extension and setting up your AI agent,
        to building complex multi-module products.
      </p>

      <div class="mt-12 grid gap-6 sm:grid-cols-2">
        <a
          routerLink="/tutorials/quick-start"
          class="group block rounded-xl border border-surface-200 bg-surface-50 p-6 transition hover:border-primary-300 hover:shadow-lg"
        >
          <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
            Beginner &middot; ~5 min
          </div>
          <h2 class="text-xl font-semibold text-surface-950 group-hover:text-primary-600">Quick Start</h2>
          <p class="mt-2 text-sm text-surface-600">
            Install the VS Code extension, set up the CLI, create a project, and let your AI agent
            write your first spec. No Prodara syntax knowledge required.
          </p>
          <div class="mt-4 flex items-center gap-2 text-sm font-medium text-primary-600">
            Start tutorial
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </div>
        </a>

        <a
          routerLink="/tutorials/deep-dive"
          class="group block rounded-xl border border-surface-200 bg-surface-50 p-6 transition hover:border-primary-300 hover:shadow-lg"
        >
          <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Intermediate &middot; ~30 min
          </div>
          <h2 class="text-xl font-semibold text-surface-950 group-hover:text-primary-600">Deep Dive: Task Board</h2>
          <p class="mt-2 text-sm text-surface-600">
            Build a complete Task Board with entities, workflows, screens, tests, and governance.
            Understand multi-module products and semantic diffing.
          </p>
          <div class="mt-4 flex items-center gap-2 text-sm font-medium text-primary-600">
            Start tutorial
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </div>
        </a>

        <a
          routerLink="/tutorials/custom-reviewers"
          class="group block rounded-xl border border-surface-200 bg-surface-50 p-6 transition hover:border-primary-300 hover:shadow-lg"
        >
          <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Intermediate &middot; ~15 min
          </div>
          <h2 class="text-xl font-semibold text-surface-950 group-hover:text-primary-600">Custom Reviewers &amp; Constitution</h2>
          <p class="mt-2 text-sm text-surface-600">
            Configure built-in reviewers, create a HIPAA compliance reviewer, and add
            constitution policies to govern AI-generated code.
          </p>
          <div class="mt-4 flex items-center gap-2 text-sm font-medium text-primary-600">
            Start tutorial
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </div>
        </a>

        <a
          routerLink="/tutorials/create-extension"
          class="group block rounded-xl border border-surface-200 bg-surface-50 p-6 transition hover:border-primary-300 hover:shadow-lg"
        >
          <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Advanced &middot; ~20 min
          </div>
          <h2 class="text-xl font-semibold text-surface-950 group-hover:text-primary-600">Create an Extension</h2>
          <p class="mt-2 text-sm text-surface-600">
            Build a Prodara extension with a custom reviewer and generator.
            Package it as npm for your team or the community.
          </p>
          <div class="mt-4 flex items-center gap-2 text-sm font-medium text-primary-600">
            Start tutorial
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </div>
        </a>

        <a
          routerLink="/tutorials/interactive-workflows"
          class="group block rounded-xl border border-surface-200 bg-surface-50 p-6 transition hover:border-primary-300 hover:shadow-lg"
        >
          <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Intermediate &middot; ~15 min
          </div>
          <h2 class="text-xl font-semibold text-surface-950 group-hover:text-primary-600">Interactive Workflows</h2>
          <p class="mt-2 text-sm text-surface-600">
            Define custom workflows combining build phases, review gates, and interactive modes.
            Build a design review workflow from scratch.
          </p>
          <div class="mt-4 flex items-center gap-2 text-sm font-medium text-primary-600">
            Start tutorial
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </div>
        </a>

        <a
          routerLink="/tutorials/proposal-management"
          class="group block rounded-xl border border-surface-200 bg-surface-50 p-6 transition hover:border-primary-300 hover:shadow-lg"
        >
          <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Intermediate &middot; ~10 min
          </div>
          <h2 class="text-xl font-semibold text-surface-950 group-hover:text-primary-600">Proposal Management</h2>
          <p class="mt-2 text-sm text-surface-600">
            Use the propose/apply/archive workflow to manage spec changes safely.
            Ideal for team collaboration and change review processes.
          </p>
          <div class="mt-4 flex items-center gap-2 text-sm font-medium text-primary-600">
            Start tutorial
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </div>
        </a>
      </div>
    </div>
  `,
})
export class TutorialsIndexComponent {}
