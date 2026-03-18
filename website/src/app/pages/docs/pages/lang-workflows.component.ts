import { Component } from '@angular/core';
import { CodeBlockComponent } from '../../../components/code-block.component';

@Component({
  selector: 'app-lang-workflows',
  imports: [CodeBlockComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Workflows</h1>
      <p class="mt-4 text-lg text-surface-600">
        Workflows define product behavior and business logic. Each workflow specifies its
        capability, authorization, inputs/outputs, execution steps, state transitions, and effects.
      </p>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Full Workflow Example</h2>
      <app-code-block [code]="fullWorkflow" language="prd" filename="billing.prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Workflow Sections</h2>
      <ul class="mt-4 space-y-3 text-surface-600">
        <li><strong>capability</strong> - Domain capability classification</li>
        <li><strong>authorization</strong> - Actor-to-permission mapping (e.g., <code>accountant: [invoice.create]</code>)</li>
        <li><strong>input / returns</strong> - Typed contracts for data flow</li>
        <li><strong>reads / writes</strong> - Data access declarations</li>
        <li><strong>rules</strong> - Business rule references</li>
        <li><strong>steps</strong> - Execution steps: <code>call</code>, <code>decide</code>, <code>fail</code></li>
        <li><strong>transitions</strong> - Entity state changes</li>
        <li><strong>effects</strong> - Side effects: <code>audit</code>, <code>notify</code>, <code>emit</code></li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Step Types</h2>
      <ul class="mt-4 space-y-2 text-surface-600">
        <li><code>call</code> - Invoke a function or service</li>
        <li><code>decide</code> - Conditional branching with <code>yes</code> / <code>no</code> branches</li>
        <li><code>fail</code> - Abort workflow with an error</li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Event-Triggered Workflows</h2>
      <p class="mt-2 text-surface-600">
        Workflows can be triggered by events or schedules using the <code>on:</code> prefix:
      </p>
      <app-code-block [code]="eventWorkflow" language="prd" />
    </article>
  `,
})
export class LangWorkflowsComponent {
  readonly fullWorkflow = `workflow create_invoice {
  capability: invoicing

  authorization {
    accountant: [invoice.create]
  }

  input {
    customer: crm.customer
  }

  reads { crm.customer }
  writes { invoice }
  rules { customer_must_exist }

  steps {
    call validate_customer
    decide customer_valid {
      yes: call create_invoice_record
      no: fail invalid_customer
    }
  }

  transitions {
    invoice.status: draft -> issued
  }

  effects {
    audit "Invoice created"
    emit invoice_created
  }

  returns {
    ok: invoice
    error: invoice_error
  }
}`;

  readonly eventWorkflow = `workflow on:invoice_overdue {
  capability: billing
  steps {
    call send_overdue_reminder
    call escalate_to_manager
  }
  effects {
    notify customer "Invoice overdue"
  }
}`;
}
