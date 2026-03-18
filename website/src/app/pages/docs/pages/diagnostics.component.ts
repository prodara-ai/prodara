import { Component } from '@angular/core';
import { CodeBlockComponent } from '../../../components/code-block.component';

@Component({
  selector: 'app-diagnostics',
  imports: [CodeBlockComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Diagnostics</h1>
      <p class="mt-4 text-lg text-surface-600">
        Every compiler phase emits structured diagnostics with stable error codes, exact source
        locations, and optional suggested fixes. Diagnostics are collected in a
        <code>DiagnosticBag</code> - never thrown as exceptions. This makes them ideal for
        AI agents that need to parse errors and self-correct.
      </p>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Diagnostic Structure</h2>
      <p class="mt-2 text-surface-600">
        Every diagnostic includes these fields:
      </p>
      <app-code-block [code]="diagnosticExample" language="json" filename="diagnostics.json" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Severity Levels</h2>
      <ul class="mt-4 space-y-2 text-surface-600">
        <li><code>error</code> - Compilation failure. Must be fixed before a valid Product Graph can be produced.</li>
        <li><code>warning</code> - Potential issue that won't block compilation but may indicate problems (e.g., unused imports, naming conventions).</li>
        <li><code>info</code> - Informational message for awareness (e.g., deprecation notices, optimization hints).</li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Error Code Ranges</h2>
      <p class="mt-2 text-surface-600">
        Error codes are stable across compiler versions. Each phase has a reserved range:
      </p>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Range</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Phase</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Examples</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            @for (range of ranges; track range.code) {
              <tr class="border-b border-surface-100">
                <td class="py-2 font-mono">{{ range.code }}</td>
                <td class="py-2">{{ range.phase }}</td>
                <td class="py-2 text-sm">{{ range.examples }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Diagnostic Categories</h2>
      <p class="mt-2 text-surface-600">
        Beyond phase-based ranges, diagnostics are grouped into semantic categories:
      </p>
      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        @for (cat of categories; track cat.name) {
          <div class="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
            <code class="text-sm font-semibold text-primary-700">{{ cat.name }}</code>
            <p class="text-xs text-surface-500">{{ cat.desc }}</p>
          </div>
        }
      </div>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Suggested Fixes</h2>
      <p class="mt-2 text-surface-600">
        Many diagnostics include a <code>fix</code> property with a description and text edit
        suggestions. AI agents can automatically apply these fixes as part of an iterative
        compile/fix loop:
      </p>
      <app-code-block [code]="fixExample" language="json" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">JSON Output</h2>
      <p class="mt-2 text-surface-600">
        Use <code>--format json</code> to get machine-readable diagnostics from the CLI:
      </p>
      <app-code-block [code]="cliExample" language="bash" />
      <p class="mt-2 text-surface-600">
        Or access diagnostics programmatically via the <code>&#64;prodara/compiler</code> API:
      </p>
      <app-code-block [code]="apiExample" language="typescript" />
    </article>
  `,
})
export class DiagnosticsComponent {
  readonly diagnosticExample = `{
  "phase": "binder",
  "category": "resolution_error",
  "severity": "error",
  "code": "PRD0201",
  "message": "Unknown symbol 'crm.customer'. Did you mean to import it?",
  "file": "billing.prd",
  "line": 4,
  "column": 14,
  "fix": {
    "description": "Add import for crm.customer",
    "edits": [
      {
        "line": 2,
        "column": 1,
        "text": "  import customer from crm\\n"
      }
    ]
  }
}`;

  readonly fixExample = `{
  "code": "PRD0301",
  "message": "Type 'string' is not assignable to field 'total' of type 'money'",
  "fix": {
    "description": "Change field type to 'money'",
    "edits": [
      { "line": 5, "column": 10, "delete": 6, "text": "money" }
    ]
  }
}`;

  readonly cliExample = `# Get diagnostics as JSON for AI agent consumption
prodara validate --format json ./project

# Full build also includes diagnostics in its output
prodara build --format json ./project`;

  readonly apiExample = `import { compile, formatDiagnosticsJson } from '@prodara/compiler';

const result = await compile('./project');
const json = formatDiagnosticsJson(result.diagnostics);
console.log(json);`;

  readonly ranges = [
    { code: 'PRD0001–0099', phase: 'Lexer', examples: 'Unterminated strings, invalid characters, malformed numbers' },
    { code: 'PRD0100–0199', phase: 'Parser', examples: 'Missing braces, unexpected tokens, invalid syntax' },
    { code: 'PRD0200–0299', phase: 'Binder', examples: 'Unknown symbols, duplicate declarations, import errors' },
    { code: 'PRD0300–0399', phase: 'Type Checker', examples: 'Type mismatches, invalid generics, missing fields' },
    { code: 'PRD0400–0499', phase: 'Validator', examples: 'Invalid transitions, missing authorization, rule violations' },
    { code: 'PRD0500–0599', phase: 'Graph Validator', examples: 'Invalid edges, orphan nodes, self-references' },
    { code: 'PRD0600–0699', phase: 'Registry', examples: 'Missing packages, version conflicts' },
    { code: 'PRD0700–0799', phase: 'Planner', examples: 'Circular dependencies, unresolvable impacts' },
    { code: 'PRD0800–0899', phase: 'Test Runner', examples: 'Failed assertions, unknown targets, invalid expect keys' },
  ];

  readonly categories = [
    { name: 'lexical_error', desc: 'Tokenization problems in source text' },
    { name: 'syntax_error', desc: 'Invalid grammar or structure' },
    { name: 'resolution_error', desc: 'Unresolved symbols or imports' },
    { name: 'type_error', desc: 'Type checking failures' },
    { name: 'semantic_error', desc: 'Business logic rule violations' },
    { name: 'graph_error', desc: 'Product Graph structural issues' },
    { name: 'registry_error', desc: 'Package registry problems' },
    { name: 'planning_error', desc: 'Plan generation failures' },
    { name: 'test_failure', desc: 'Spec test assertion failures' },
    { name: 'verification_error', desc: 'Post-build verification problems' },
    { name: 'warning', desc: 'Non-blocking issues and style hints' },
    { name: 'lint', desc: 'Code quality and convention suggestions' },
  ];
}
