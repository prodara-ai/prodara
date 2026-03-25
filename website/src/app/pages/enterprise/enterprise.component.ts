import { Component } from '@angular/core';
@Component({
  selector: 'app-enterprise',
  template: `
    <div class="bg-surface-0">
      <!-- Hero -->
      <section class="border-b border-surface-200 bg-gradient-to-b from-surface-50 to-surface-0 py-20 sm:py-28">
        <div class="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 class="text-4xl font-extrabold tracking-tight text-surface-950 sm:text-5xl">
            Enterprise Support
          </h1>
          <p class="mt-6 text-lg text-surface-600 sm:text-xl">
            Dedicated support, custom integrations, and priority features for teams
            building production systems with the Prodara ecosystem — language, compiler, VS Code extension, and AI agent workflows.
          </p>
          <p class="mt-4 text-surface-500">
            Whether you're onboarding 5 engineers or 500, Prodara scales from a single spec file
            to multi-module product portfolios with deterministic, auditable builds.
          </p>
          <div class="mt-8">
            <a
              href="mailto:support&#64;prodara.net"
              class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:bg-primary-700"
            >
              Contact Sales
              <svg class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </section>

      <!-- Why Enterprise -->
      <section class="py-16 sm:py-20">
        <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 class="text-center text-2xl font-bold text-surface-950">Why Teams Choose Enterprise</h2>
          <div class="mt-10 grid gap-6 sm:grid-cols-3">
            @for (stat of stats; track stat.label) {
              <div class="text-center">
                <div class="text-3xl font-extrabold text-primary-600">{{ stat.value }}</div>
                <div class="mt-1 text-sm text-surface-600">{{ stat.label }}</div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="border-t border-surface-200 py-20 sm:py-28">
        <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 class="mb-10 text-center text-2xl font-bold text-surface-950">What's Included</h2>
          <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            @for (feature of features; track feature.title) {
              <div class="rounded-xl border border-surface-200 bg-surface-50 p-6">
                <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30">
                  <span [innerHTML]="feature.icon"></span>
                </div>
                <h3 class="text-lg font-semibold text-surface-950">{{ feature.title }}</h3>
                <p class="mt-2 text-sm leading-relaxed text-surface-600">{{ feature.desc }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Use Cases -->
      <section class="border-t border-surface-200 bg-surface-50 py-16 sm:py-20">
        <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 class="text-center text-2xl font-bold text-surface-950">Common Enterprise Use Cases</h2>
          <div class="mt-10 space-y-6">
            @for (useCase of useCases; track useCase.title) {
              <div class="rounded-lg border border-surface-200 bg-surface-0 p-6">
                <h3 class="font-semibold text-surface-950">{{ useCase.title }}</h3>
                <p class="mt-1 text-sm text-surface-600">{{ useCase.desc }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="border-t border-surface-200 py-16">
        <div class="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 class="text-2xl font-bold text-surface-950">Ready to scale with Prodara?</h2>
          <p class="mt-4 text-surface-600">
            Reach out to discuss your requirements. We'll set up a dedicated onboarding session
            and help you integrate Prodara into your existing workflows.
          </p>
          <a
            href="mailto:support&#64;prodara.net"
            class="mt-6 inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Contact support&#64;prodara.net
          </a>
        </div>
      </section>
    </div>
  `,
})
export class EnterpriseComponent {
  readonly stats = [
    { value: '15-phase', label: 'Deterministic compilation pipeline' },
    { value: '900+', label: 'Error codes with suggested fixes' },
    { value: '26+', label: 'Supported AI agents' },
  ];

  readonly features = [
    {
      icon: '&#x1F4DE;',
      title: 'Priority Support',
      desc: 'Direct access to the Prodara team with guaranteed response times, dedicated Slack channel, and escalation paths for critical issues.',
    },
    {
      icon: '&#x1F527;',
      title: 'Custom Integrations',
      desc: 'We\'ll help you wire Prodara into your CI/CD pipelines, AI agent workflows, and internal toolchains — with JSON output for every command.',
    },
    {
      icon: '&#x1F3D7;&#xFE0F;',
      title: 'Custom Presets & Constitutions',
      desc: 'Organization-wide constitutions and presets that encode your team\'s standards: naming conventions, security policies, privacy rules, and architectural constraints.',
    },
    {
      icon: '&#x1F4CA;',
      title: 'Advanced Analytics',
      desc: 'Insights into spec complexity, change velocity, impact propagation, and cross-module coupling across your entire product portfolio.',
    },
    {
      icon: '&#x1F512;',
      title: 'Private Registry',
      desc: 'Host your own extension and preset registry with access controls, versioning, and audit logging.',
    },
    {
      icon: '&#x1F393;',
      title: 'Team Onboarding',
      desc: 'Hands-on training sessions covering the .prd language, Product Graph reasoning, AI agent workflows, and the review/fix pipeline.',
    },
    {
      icon: '&#x1F6E1;&#xFE0F;',
      title: 'SLA-backed Reliability',
      desc: 'Uptime guarantees for hosted services, including the extension registry and upcoming collaboration features.',
    },
    {
      icon: '&#x2699;&#xFE0F;',
      title: 'Custom Extensions',
      desc: 'We\'ll build custom reviewers, generators, or validators tailored to your domain — healthcare, finance, e-commerce, and more.',
    },
    {
      icon: '&#x1F4C4;',
      title: 'Compliance Packages',
      desc: 'Pre-built registry packages for HIPAA, SOC 2, GDPR, and PCI-DSS that enforce compliance constraints at the specification level.',
    },
  ];

  readonly useCases = [
    {
      title: 'Multi-team product development',
      desc: 'Multiple teams own separate .prd modules that compile into a unified Product Graph, with cross-module impact propagation and consistent constitution enforcement.',
    },
    {
      title: 'AI-powered code generation at scale',
      desc: 'Feed deterministic Product Graph JSON and incremental plans to your AI agents. Every agent — from Copilot to Claude to custom LLMs — gets the same reproducible context via a single AI prompt file.',
    },
    {
      title: 'Regulated industry products',
      desc: 'Use constitutions and registry compliance packages to enforce privacy, security, and audit requirements from the specification layer — before any code is written.',
    },
    {
      title: 'CI/CD spec validation gates',
      desc: 'Run prodara build and prodara drift in your pipeline to block deployments when specs are out of sync, and produce machine-readable build reports for auditing.',
    },
  ];
}
