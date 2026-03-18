import { Component } from '@angular/core';
import { CodeBlockComponent } from '../../../components/code-block.component';

@Component({
  selector: 'app-lang-entities',
  imports: [CodeBlockComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Entities & Fields</h1>
      <p class="mt-4 text-lg text-surface-600">
        Entities are persistent domain objects that form the backbone of your product's data model.
        They have identity, exist over time, and are referenced by workflows, surfaces, and rules.
        Alongside entities, you can define value objects, enums, actors, rules, and other domain constructs.
      </p>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Defining an Entity</h2>
      <app-code-block [code]="basicEntity" language="prd" filename="billing.prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Field Types</h2>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Category</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Types</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            <tr class="border-b border-surface-100"><td class="py-2 font-semibold">Primitives</td><td class="py-2"><code>string</code>, <code>integer</code>, <code>decimal</code>, <code>boolean</code>, <code>datetime</code>, <code>date</code>, <code>uuid</code></td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-semibold">Rich types</td><td class="py-2"><code>money</code>, <code>email</code>, <code>phone</code>, <code>url</code>, <code>binary</code></td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-semibold">Generics</td><td class="py-2"><code>optional&lt;T&gt;</code>, <code>list&lt;T&gt;</code></td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-semibold">References</td><td class="py-2"><code>crm.customer</code> (cross-module entity ref)</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-semibold">Defaults</td><td class="py-2"><code>status: invoice_status = draft</code></td></tr>
          </tbody>
        </table>
      </div>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Value Objects</h2>
      <p class="mt-2 text-surface-600">
        Value objects are structured types without identity - they are compared by value, not by reference.
        Use them for addresses, money, coordinates, and other composite types.
      </p>
      <app-code-block [code]="valueObject" language="prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Enums</h2>
      <p class="mt-2 text-surface-600">
        Enums define a closed set of named values. Members can carry optional metadata for priority, labeling, or other properties.
      </p>
      <app-code-block [code]="enumExample" language="prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Actors & Capabilities</h2>
      <p class="mt-2 text-surface-600">
        Actors represent user roles or system identities. Capabilities group related permissions that actors can be granted.
      </p>
      <app-code-block [code]="actorExample" language="prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Rules</h2>
      <p class="mt-2 text-surface-600">
        Rules express business constraints that are enforced across workflows and surfaces.
      </p>
      <app-code-block [code]="ruleExample" language="prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Entity Lifecycle</h2>
      <p class="mt-2 text-surface-600">
        Entity lifecycle is modeled through enums and workflow transitions. Define an enum for
        the entity's states, then use workflow <code>transitions</code> blocks to declare valid
        state changes. The compiler validates that all transitions are reachable and valid.
      </p>
      <app-code-block [code]="lifecycle" language="prd" />
    </article>
  `,
})
export class LangEntitiesComponent {
  readonly basicEntity = `entity invoice {
  invoice_id: uuid
  customer: crm.customer
  total: money
  status: invoice_status = draft
  notes: optional<string>
  line_items: list<line_item>
  created_at: datetime
}

enum invoice_status {
  draft
  issued
  paid
  overdue
  cancelled
}`;

  readonly valueObject = `value address {
  street: string
  city: string
  state: string
  zip: string
  country: string
}

value line_item {
  description: string
  quantity: integer
  unit_price: money
}`;

  readonly enumExample = `enum priority {
  low { label: "Low Priority" }
  medium { label: "Medium Priority" }
  high { label: "High Priority" }
  critical { label: "Critical", escalation: true }
}`;

  readonly actorExample = `actor customer {
  title: "Customer"
  description: "External customer who places orders"
}

actor accountant {
  title: "Accountant"
  description: "Internal staff managing invoices"
}

capability invoicing {
  title: "Invoice Management"
  actors: [accountant]
}`;

  readonly ruleExample = `rule customer_must_exist {
  entity: invoice
  condition: customer != null
  message: strings.customer_required
}

rule total_positive {
  entity: invoice
  condition: total > 0
  message: strings.total_must_be_positive
}`;

  readonly lifecycle = `workflow issue_invoice {
  transitions {
    invoice.status: draft -> issued
  }
}

workflow pay_invoice {
  transitions {
    invoice.status: issued -> paid
  }
}

workflow cancel_invoice {
  transitions {
    invoice.status: draft -> cancelled
    invoice.status: issued -> cancelled
  }
}`;
}
