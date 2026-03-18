import { Component } from '@angular/core';
import { CodeBlockComponent } from '../../../components/code-block.component';

@Component({
  selector: 'app-lang-testing',
  imports: [CodeBlockComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Specification Testing</h1>
      <p class="mt-4 text-lg text-surface-600">
        Tests validate the Product Graph itself - not generated code. Write assertions about
        state transitions, return values, authorization rules, and validation conditions directly
        in your <code>.prd</code> files. Tests run as part of the compiler pipeline, so
        spec-level issues are caught before any code is generated.
      </p>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Transition Tests</h2>
      <p class="mt-2 text-surface-600">
        Verify that workflows correctly transition entity state:
      </p>
      <app-code-block [code]="transitionTest" language="prd" filename="billing.prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Authorization Tests</h2>
      <p class="mt-2 text-surface-600">
        Verify which actors are allowed or denied access to specific workflows:
      </p>
      <app-code-block [code]="authTest" language="prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Validation Tests</h2>
      <p class="mt-2 text-surface-600">
        Test business rules with <code>valid_when</code> and <code>invalid_when</code> assertions:
      </p>
      <app-code-block [code]="validationTest" language="prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Existence Tests</h2>
      <p class="mt-2 text-surface-600">
        Verify that specific constructs exist in the Product Graph with the expected kind:
      </p>
      <app-code-block [code]="existenceTest" language="prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Test Structure</h2>
      <ul class="mt-4 space-y-3 text-surface-600">
        <li><strong>target</strong> - Symbol reference to the construct being tested (entity, workflow, rule, etc.)</li>
        <li><strong>given</strong> - Precondition state setup (e.g., entity field values before the workflow runs)</li>
        <li><strong>expect</strong> - Assertions against a closed set of keys</li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Expect Keys (v0.1)</h2>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Key</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Purpose</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Example</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">transition</td><td class="py-2">Verify state transitions</td><td class="py-2"><code>"entity.field: from -> to"</code></td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">returns</td><td class="py-2">Check return branches</td><td class="py-2"><code>ok</code> or <code>error</code></td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">authorization</td><td class="py-2">Test allowed/denied actors</td><td class="py-2"><code>actor: allowed</code> or <code>denied</code></td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">valid_when</td><td class="py-2">Rule evaluates as valid</td><td class="py-2"><code>total > 0</code></td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">invalid_when</td><td class="py-2">Rule evaluates as invalid</td><td class="py-2"><code>total == 0</code></td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">kind</td><td class="py-2">Verify construct type</td><td class="py-2"><code>"entity"</code>, <code>"workflow"</code></td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">has_property</td><td class="py-2">Field existence check</td><td class="py-2"><code>"title"</code></td></tr>
          </tbody>
        </table>
      </div>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Running Tests</h2>
      <app-code-block [code]="runCommands" language="bash" />
      <p class="mt-2 text-surface-600">
        Unrecognized expect keys produce compilation errors, ensuring test assertions stay
        in sync with the language specification. Tests are also run automatically during
        <code>prodara build</code>.
      </p>
    </article>
  `,
})
export class LangTestingComponent {
  readonly transitionTest = `test issue_invoice_transition {
  target: issue_invoice
  given {
    invoice.status: draft
  }
  expect {
    transition: "invoice.status: draft -> issued"
    returns: ok
  }
}`;

  readonly authTest = `test invoice_authorization {
  target: create_invoice
  expect {
    authorization {
      accountant: allowed
      viewer: denied
      customer: denied
    }
  }
}`;

  readonly validationTest = `test total_must_be_positive {
  target: total_positive
  expect {
    valid_when { total: 100 }
    invalid_when { total: 0 }
    invalid_when { total: -50 }
  }
}`;

  readonly existenceTest = `test task_entity_exists {
  target: task
  expect { kind: "entity" }
}

test task_has_title {
  target: task
  expect { has_property: "title" }
}`;

  readonly runCommands = `# Run spec tests only
prodara test --format json ./project

# Run tests as part of full build
prodara build ./project

# Tests produce structured JSON output
prodara test --format json ./project | jq '.results'`;
}
