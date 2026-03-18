import { Component } from '@angular/core';
import { CodeBlockComponent } from '../../../components/code-block.component';

@Component({
  selector: 'app-lang-governance',
  imports: [CodeBlockComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Governance</h1>
      <p class="mt-4 text-lg text-surface-600">
        Constitutions define generation, validation, and quality policies that govern how
        specifications are compiled and implemented. They encode tech stack choices, security
        defaults, testing expectations, and code style - all as code. This means governance
        travels with the spec and is enforced automatically in every build.
      </p>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Constitution Example</h2>
      <app-code-block [code]="constitution" language="prd" filename="platform.prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Policy Sections</h2>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Section</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Purpose</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Common Keys</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            <tr class="border-b border-surface-100"><td class="py-2 font-semibold">stack</td><td class="py-2">Technology choices</td><td class="py-2">frontend, backend, database, runtime</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-semibold">security</td><td class="py-2">Auth and encryption</td><td class="py-2">authentication, authorization, encryption, mfa</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-semibold">privacy</td><td class="py-2">Data handling</td><td class="py-2">pii_encryption, data_retention, consent_required</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-semibold">testing</td><td class="py-2">Quality gates</td><td class="py-2">tests_required, review_fix_loop, coverage_threshold</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-semibold">generation</td><td class="py-2">Code generation rules</td><td class="py-2">patterns, templates, output_format</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-semibold">style</td><td class="py-2">Code conventions</td><td class="py-2">indentation, naming, formatting</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-semibold">architecture</td><td class="py-2">Structural patterns</td><td class="py-2">modules, boundaries, coupling_limits</td></tr>
          </tbody>
        </table>
      </div>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Security & Privacy Constructs</h2>
      <p class="mt-2 text-surface-600">
        Beyond constitutions, Prodara provides dedicated constructs for security and privacy
        that attach to specific entities:
      </p>
      <app-code-block [code]="securityExample" language="prd" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Constitution Layering</h2>
      <p class="mt-2 text-surface-600">
        Constitutions stack in three layers, with more specific layers overriding general ones:
      </p>
      <ol class="mt-4 space-y-3 text-surface-600">
        <li>
          <strong>1. Registry packages</strong> - Community or organization-wide defaults pulled from the registry.
          These provide a shared baseline across teams and projects.
        </li>
        <li>
          <strong>2. Product-wide</strong> - Your product's global policies defined at the top level.
          Set your tech stack, security posture, and quality gates here.
        </li>
        <li>
          <strong>3. Module-specific</strong> - Overrides for individual modules using <code>applies_to</code>.
          Use this when a specific module has different requirements (e.g., stricter PCI compliance for billing).
        </li>
      </ol>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Registry Packages</h2>
      <p class="mt-2 text-surface-600">
        Constitutions can reference shared packages from the registry using <code>use</code> blocks.
        This lets teams share and version governance policies like code:
      </p>
      <app-code-block [code]="registryExample" language="prd" />
    </article>
  `,
})
export class LangGovernanceComponent {
  readonly constitution = `constitution default_product {
  use: [
    registry/web/angular@1.2,
    registry/backend/nestjs@1.1
  ]

  policies {
    stack {
      frontend: angular
      backend: nestjs
      database: postgres
    }

    security {
      authentication: required
      authorization: required
      encryption: aes_256
    }

    privacy {
      pii_encryption: required
      data_retention: "7 years"
      consent_required: true
    }

    testing {
      tests_required: true
      review_fix_loop: true
    }

    style {
      indentation: 2
      naming: camelCase
    }

    architecture {
      modules: required
      coupling_limits: 5
    }
  }
}`;

  readonly securityExample = `security billing_security {
  applies_to: [invoice, payment]
  requires: [encryption, audit_logging, access_control]
  description: "Financial data must be encrypted at rest and in transit"
}

privacy customer_privacy {
  applies_to: [customer]
  classification: personal_data
  retention: "7 years"
  erasable: true
}

validation invoice_validation {
  applies_to: [invoice]
  rules {
    total_positive: "total > 0"
    customer_exists: "customer != null"
  }
}`;

  readonly registryExample = `constitution hipaa_compliant {
  use: [
    registry/compliance/hipaa@2.0,
    registry/security/encryption@1.5
  ]

  policies {
    privacy {
      phi_encryption: required
      audit_trail: required
      access_logging: required
    }
  }
}`;
}
