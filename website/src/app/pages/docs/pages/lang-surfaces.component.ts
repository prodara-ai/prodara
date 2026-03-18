import { Component } from '@angular/core';
import { CodeBlockComponent } from '../../../components/code-block.component';

@Component({
  selector: 'app-lang-surfaces',
  imports: [CodeBlockComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Surfaces & Screens</h1>
      <p class="mt-4 text-lg text-surface-600">
        Surfaces define interaction boundaries between users, systems, and the product.
        They are platform-agnostic - describing structure and behavior, not visual layout.
        Surfaces connect to entities through bindings and to workflows through actions and hooks.
      </p>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Surface Kinds</h2>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Kind</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Purpose</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Use Case</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">view</td><td class="py-2">Read-only data display</td><td class="py-2">Lists, detail pages, reports</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">form</td><td class="py-2">Data input with validation</td><td class="py-2">Create/edit forms, settings</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">dashboard</td><td class="py-2">Aggregated metrics and widgets</td><td class="py-2">Admin panels, analytics</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">page</td><td class="py-2">Full page layout</td><td class="py-2">Landing pages, multi-section views</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">modal</td><td class="py-2">Overlay dialog</td><td class="py-2">Confirmations, quick edits</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">component</td><td class="py-2">Reusable UI fragment</td><td class="py-2">Shared widgets, cards</td></tr>
          </tbody>
        </table>
      </div>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">View Surface</h2>
      <app-code-block [code]="viewExample" language="prd" filename="billing.prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Form Surface</h2>
      <app-code-block [code]="formExample" language="prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Dashboard Surface</h2>
      <app-code-block [code]="dashboardExample" language="prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Key Properties</h2>
      <ul class="mt-4 space-y-3 text-surface-600">
        <li><strong>binds</strong> - Data binding to an entity. The surface displays or collects data for this entity.</li>
        <li><strong>actions</strong> - Workflow entry points available from this surface (e.g., buttons, links).</li>
        <li><strong>hooks</strong> - Lifecycle behavior: <code>load</code> (on open), <code>submit</code> (on form submit), <code>change</code> (on field change).</li>
        <li><strong>surfaces</strong> - Nested sub-surfaces for composition. Build complex UIs from smaller pieces.</li>
        <li><strong>fields</strong> - For form surfaces: the list of input fields.</li>
        <li><strong>rules</strong> - Validation rules applied to this surface's data.</li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Rendering & Design Tokens</h2>
      <p class="mt-2 text-surface-600">
        Surfaces describe <em>what</em> is shown. Renderings and design tokens describe <em>how</em>
        it looks. Use <code>rendering</code> blocks to define layout, grid, and styles. Use
        <code>tokens</code> to define colors, spacing, typography, and breakpoints.
      </p>
      <app-code-block [code]="renderingExample" language="prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Localization</h2>
      <p class="mt-2 text-surface-600">
        Surface titles and labels can reference <code>strings</code> blocks for full localization support:
      </p>
      <app-code-block [code]="stringsExample" language="prd" />
    </article>
  `,
})
export class LangSurfacesComponent {
  readonly viewExample = `surface invoice_list {
  kind: view
  title: billing.invoice_strings.invoice_list_title
  binds: invoice

  actions: [create_invoice, open_invoice]

  hooks {
    load: load_invoices
  }

  surfaces: [filter_bar, invoice_table]
}`;

  readonly formExample = `surface invoice_form {
  kind: form
  binds: invoice

  fields {
    customer { required: true }
    total { required: true }
    notes { required: false }
  }

  rules: [customer_required, total_positive]

  hooks {
    submit: create_invoice
    change: validate_invoice
  }

  actions: [submit_invoice, cancel]
}`;

  readonly dashboardExample = `surface billing_dashboard {
  kind: dashboard
  title: "Billing Overview"
  capability: billing_management

  surfaces: [
    revenue_chart,
    outstanding_invoices,
    recent_payments,
    overdue_alerts
  ]

  hooks {
    load: load_dashboard_data
  }
}`;

  readonly renderingExample = `tokens billing_tokens {
  color {
    brand_primary: "#6366F1"
    surface_background: "#F3F4F6"
    danger: "#EF4444"
  }

  spacing {
    sm: 8
    md: 16
    lg: 24
  }

  breakpoint {
    sm: 480
    md: 768
    lg: 1024
  }
}

rendering invoice_list_rendering {
  target: invoice_list

  layout { direction: vertical; gap: md }
  style { padding: lg }
}`;

  readonly stringsExample = `strings invoice_strings {
  invoice_list_title: "Invoices"
  create_button: "New Invoice"
  total_label: "Total Amount"
  customer_required: "Customer is required"
}`;
}
