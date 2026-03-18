# Prodara Registry Specification v0.1

This document defines the **format, structure, and resolution protocol** for Prodara registry packages.

Registry packages are reusable constitution components that Prodara specifications reference via `use` declarations in constitutions. Each package contains **AI agent instructions** (AGENTS.md and SKILL.md files) that tell the generation system how to produce code for a specific technology, along with policy defaults and a configuration schema.

---

# Purpose

The registry exists to:

- provide reusable technology stack definitions (e.g., NestJS backend, PostgreSQL storage)
- give AI generation agents precise instructions for each technology
- standardize generation behavior across products and teams
- allow version-pinned reproducible builds
- separate technology choices from product semantics
- support both the official Prodara registry and custom private registries

---

# Package References in Prodara

Constitutions reference registry packages using the `use` property.

Example:

    constitution default_product {
      use: [
        registry/backend/nestjs@1.1,
        registry/database/postgres@2.0,
        registry/web/angular@1.2
      ]
    }

The syntax is defined in the grammar as:

    package_ref = package_path "@" version_literal ;
    package_path = [ scope_prefix ] identifier { "/" identifier } ;
    scope_prefix = "@" identifier "/" ;

---

# Package Path Structure

A package path follows a hierarchical namespace:

    registry / category / name

## Segments

| Segment    | Description                                      | Examples                        |
|------------|--------------------------------------------------|---------------------------------|
| `registry` | Literal prefix indicating a registry package     | Always `registry`               |
| category   | Technology domain                                | `backend`, `web`, `database`, `mobile`, `infra`, `testing` |
| name       | Package name within the category                 | `nestjs`, `postgres`, `angular`, `react`, `docker` |

Additional path depth is allowed for sub-packages:

    registry/backend/nestjs/graphql@1.0
    registry/database/postgres/migrations@2.1

## Naming Rules

- Segments must be lowercase identifiers: `[a-z][a-z0-9_]*`
- Segments are separated by `/`
- The `registry` prefix is always the first segment
- Package names should describe the technology, not the vendor

---

# Version Format

Versions follow a simplified semver scheme:

    major.minor

Examples:

    1.0
    1.1
    2.0

Full semver (`major.minor.patch`) is also accepted:

    1.1.3

## Version Resolution

When a constitution references `registry/backend/nestjs@1.1`, the compiler resolves the **highest patch version** within the `1.1.x` range, following semver compatibility rules.

If exact version pinning is desired:

    registry/backend/nestjs@1.1.3

## Version Constraints

- Major version changes may contain breaking changes to generation output.
- Minor version changes may add new generation capabilities but must not break existing behavior.
- Patch version changes contain only bug fixes to generation logic.

---

# Package Format

A registry package is a directory (or archive) containing a fixed set of files.

## Required Structure

    nestjs/
      package.prd.json        # Package manifest
      policies.prd.json       # Default policy values
      schema.prd.json         # Configuration schema
      AGENTS.md               # Agent mode definitions for this technology
      skills/                 # SKILL.md files for construct-level generation
        entity.SKILL.md
        workflow.SKILL.md
        surface.SKILL.md
        integration.SKILL.md
        governance.SKILL.md
        testing.SKILL.md
        project.SKILL.md
      README.md               # Human-readable overview

## package.prd.json — Package Manifest

The manifest identifies the package and declares its metadata.

    {
      "format": "prodara-registry-package",
      "name": "nestjs",
      "category": "backend",
      "version": "1.1.0",
      "title": "NestJS Backend",
      "description": "Generates NestJS backend services from Prodara specifications.",
      "prodara_version": "0.1",
      "authors": ["Prodara Team"],
      "license": "MIT",
      "repository": "https://github.com/prodara/registry-backend-nestjs",
      "dependencies": [
        { "path": "registry/backend/typescript", "version": "5.0" }
      ],
      "keywords": ["backend", "nestjs", "typescript", "rest", "graphql"]
    }

### Manifest Fields

| Field            | Type     | Required | Description                                             |
|------------------|----------|----------|---------------------------------------------------------|
| `format`         | string   | yes      | Always `"prodara-registry-package"`                     |
| `name`           | string   | yes      | Package name (must match directory name)                |
| `category`       | string   | yes      | Technology category                                     |
| `version`        | string   | yes      | Semver version                                          |
| `title`          | string   | yes      | Human-readable title                                    |
| `description`    | string   | yes      | What this package does                                  |
| `prodara_version`| string   | yes      | Minimum Prodara language version required               |
| `authors`        | string[] | no       | Package authors                                         |
| `license`        | string   | no       | License identifier                                      |
| `repository`     | string   | no       | Source repository URL                                   |
| `dependencies`   | array    | no       | Other registry packages this depends on                 |
| `keywords`       | string[] | no       | Searchable keywords                                     |

### Dependency Format

    {
      "path": "registry/backend/typescript",
      "version": "5.0"
    }

Dependencies follow the same path and version format as constitution `use` references. The compiler resolves the full transitive dependency tree.

---

## policies.prd.json — Default Policies

Packages may provide default policy values that merge into the consuming constitution.

    {
      "format": "prodara-registry-policies",
      "policies": {
        "stack": {
          "backend": "nestjs",
          "language": "typescript",
          "runtime": "node"
        },
        "style": {
          "indentation": 2,
          "naming": "camelCase",
          "max_line_length": 120
        },
        "testing": {
          "framework": "jest",
          "tests_required": true
        }
      }
    }

### Policy Merge Semantics

When a constitution references multiple packages, policies merge in declaration order (left to right in the `use` array). Later packages override earlier packages for the same policy keys.

Explicit policy declarations in the constitution body override all package defaults.

Merge precedence (highest to lowest):

1. Constitution body policies
2. Later packages in `use` array
3. Earlier packages in `use` array

Example:

    constitution default_product {
      use: [
        registry/backend/nestjs@1.1,
        registry/database/postgres@2.0
      ]

      policies {
        style {
          indentation: 4
        }
      }
    }

Here, `nestjs`'s default `indentation: 2` is overridden by the explicit `indentation: 4` in the constitution.

---

## schema.prd.json — Configuration Schema

The schema defines what configuration options the package exposes and their valid values.

    {
      "format": "prodara-registry-schema",
      "options": {
        "api_style": {
          "type": "enum",
          "values": ["rest", "graphql", "both"],
          "default": "rest",
          "description": "API generation style"
        },
        "orm": {
          "type": "enum",
          "values": ["typeorm", "prisma", "mikro-orm"],
          "default": "typeorm",
          "description": "ORM for database access"
        },
        "enable_swagger": {
          "type": "boolean",
          "default": true,
          "description": "Generate Swagger/OpenAPI documentation"
        },
        "port": {
          "type": "integer",
          "default": 3000,
          "description": "Default server port"
        }
      }
    }

### Schema Types

| Type      | Description                          |
|-----------|--------------------------------------|
| `string`  | Free-form string                     |
| `integer` | Whole number                         |
| `boolean` | `true` or `false`                    |
| `enum`    | One of a fixed set of string values  |

### Passing Configuration

Constitution policies can reference package options:

    policies {
      nestjs {
        api_style: graphql
        enable_swagger: false
      }
    }

The policy block name matches the package name. The compiler validates that the keys match the package schema and that values conform to the declared types.

---

## AGENTS.md — Agent Mode Definitions

The `AGENTS.md` file defines **agent modes** for the generation system. It tells the AI what role it should assume when generating code for this technology stack.

An agent mode encapsulates:

- the agent's identity and expertise
- which tools it may use
- which skills it should load
- the workflow it follows

Example `AGENTS.md` for a NestJS backend package:

    ---
    name: nestjs-generator
    description: Generates NestJS backend services from Prodara Product Graph nodes.
    tools:
      - create_file
      - replace_string_in_file
      - run_in_terminal
    skills:
      - entity.SKILL.md
      - workflow.SKILL.md
      - surface.SKILL.md
      - integration.SKILL.md
      - governance.SKILL.md
      - testing.SKILL.md
      - project.SKILL.md
    ---

    You are a NestJS code generation agent. You receive Product Graph nodes and
    generate TypeScript source code following NestJS conventions.

    For each generation task, load the relevant skill file before producing output.
    Follow the patterns defined in each skill precisely.

    Always generate code that passes `npm run lint` and `npm run test`.

Agent modes are composable: when a constitution references multiple packages, the generation system loads all agent definitions and dispatches each Product Graph node to the appropriate agent based on construct kind and technology category.

---

## skills/ — SKILL.md Files

SKILL.md files contain **detailed, construct-level generation instructions** for the AI agent. Each skill file describes how one kind of Product Graph node maps to generated code for this technology.

Skills are the core of the registry package. They are natural language instructions with embedded code examples — not rigid templates.

### Skill File Structure

Each SKILL.md file follows this structure:

    ---
    name: nestjs-workflow
    description: How to generate NestJS services from Prodara workflow nodes.
    ---

    # Workflow Generation — NestJS

    ## Input

    You receive a workflow node from the Product Graph with these fields:
    - name, capability, authorization, reads, writes, rules, steps,
      transitions, effects, returns, trigger

    ## File Mapping

    - File: `src/{module}/services/{workflow_name}.service.ts`
    - Class: `{PascalCase(workflow_name)}Service`
    - Test: `src/{module}/services/{workflow_name}.service.spec.ts`

    ## Authorization

    If the workflow has an authorization block, generate a NestJS guard:

    - File: `src/{module}/guards/{workflow_name}.guard.ts`
    - Check the actor's permissions against the required permission tokens.

    ## Example

    For workflow `create_invoice` with authorization `accountant: [invoice.create]`:

    ```typescript
    @Injectable()
    export class CreateInvoiceService {
      constructor(
        private readonly invoiceRepository: InvoiceRepository,
        private readonly ruleValidator: RuleValidator,
      ) {}

      async execute(
        input: CreateInvoiceInput,
        actor: AuthenticatedActor,
      ): Promise<Result<Invoice, InvoiceError>> {
        await this.ruleValidator.validate('invoice_total_positive', input);
        const invoice = await this.invoiceRepository.create(input);
        return Result.ok(invoice);
      }
    }
    ```

    ## Transitions

    If the workflow has a transitions block, generate state validation
    that checks the current state before applying the transition.

    ## Effects

    Map each effect kind to a NestJS pattern:
    - `audit` → inject and call AuditService
    - `notify` → inject and call the integration client
    - `emit` → inject and call EventEmitter

### Required Skills

A package should provide SKILL.md files for at least these construct kinds:

| Skill File         | Covers                                         |
|--------------------|-------------------------------------------------|
| `entity.SKILL.md`    | Entities, values, enums → ORM models, DTOs     |
| `workflow.SKILL.md`  | Workflows → services, guards, state machines   |
| `surface.SKILL.md`   | Surfaces → controllers, resolvers, CLI handlers|
| `integration.SKILL.md`| Integrations → HTTP clients, SDKs             |
| `governance.SKILL.md` | Security, privacy → guards, interceptors, middleware |
| `testing.SKILL.md`   | Spec tests → framework test files              |
| `project.SKILL.md`   | Project scaffolding (package.json, config, etc.)|

Additional skill files may be added for technology-specific concerns (e.g., `migration.SKILL.md` for database packages, `rendering.SKILL.md` for frontend packages).

### Why SKILL.md and AGENTS.md

Prodara is AI-native. The generation system is an AI agent, not a template engine. Using the same instruction format (AGENTS.md / SKILL.md) that VS Code and other AI tooling already understand means:

- package authors use familiar patterns
- skills are testable and debuggable with existing AI tools
- the generation system can load skills dynamically per construct
- instructions are human-readable and auditable

---

# Resolution Protocol

This section defines how the compiler resolves package references to concrete package contents.

## Architecture

The Prodara registry is a **centralized Git repository** maintained by the Prodara project. Users can also register **custom Git repositories** as additional sources — similar to Homebrew taps or npm custom registries.

## Resolution Sources

A Prodara compiler resolves packages from sources in the following priority order:

### 1. Local vendored path

A workspace-local directory containing vendored packages for offline or locked development.

    .prodara/registry/{category}/{name}/{version}/

The compiler checks local vendored packages first. This allows air-gapped environments and explicit version pinning.

### 2. Custom Git repositories (taps)

Teams can register custom Git repositories as additional package sources. These take priority over the official registry, allowing organizations to override or extend the official set.

Configuration in `.prodara/config.json`:

    {
      "registries": [
        {
          "name": "company",
          "git": "https://github.com/mycompany/prodara-registry.git",
          "branch": "main"
        },
        {
          "name": "team",
          "git": "git@gitlab.internal:team/prodara-packages.git",
          "branch": "main"
        }
      ]
    }

Custom registries follow the same directory layout as the official registry (see below).

When referencing a package from a custom registry explicitly, use a scoped path:

    use: [
      @company/backend/nestjs_custom@1.0,
      registry/database/postgres@2.0
    ]

The `@company` prefix resolves to the custom registry named `company`. Unscoped references (starting with `registry/`) resolve from the official registry (or custom registries if they shadow the same package).

### 3. Official Prodara registry

The default Git repository maintained by the Prodara project.

Default URL (built into the compiler):

    https://github.com/prodara/registry.git

This is the fallback source when no local or custom registry provides the package.

## Git Repository Layout

All registry Git repositories (official and custom) follow this directory structure:

    registry-repo/
      backend/
        nestjs/
          1.1.0/
            package.prd.json
            policies.prd.json
            schema.prd.json
            AGENTS.md
            skills/
              entity.SKILL.md
              workflow.SKILL.md
              ...
            README.md
          1.0.0/
            ...
      database/
        postgres/
          2.0.0/
            ...
      web/
        angular/
          1.2.0/
            ...

Each version of each package is a self-contained directory.

## Resolution Algorithm

1. Parse the package reference: extract scope (if any), path segments, version.
2. If scoped (`@company/...`), look up the named custom registry. Search that repo only.
3. If unscoped (`registry/...`), search in order:
   a. Local vendored path (`.prodara/registry/`)
   b. Custom registries (in declaration order from `.prodara/config.json`)
   c. Official Prodara registry
4. Within a Git repository, check out or fetch the target branch and locate `{category}/{name}/{version}/`.
5. For `major.minor` version references, resolve the highest patch version in the matching directory.
6. If no source resolves the package, emit a diagnostic error.

## Git Caching

Resolved Git repositories are cloned/fetched into:

    .prodara/cache/registries/{registry_name}/

The compiler should use shallow clones and sparse checkout where possible to minimize data transfer. The cache is refreshed when:

- the lock file is absent or stale
- the user explicitly requests a refresh (`prodara registry update`)
- CI configuration requires fresh resolution

## Integrity Verification

Package archives and cached packages must be verified against the `hash` field in the registry metadata (when resolved via HTTP or Git).

Hash algorithm: SHA-256 over the archive bytes.

If the hash does not match, the compiler must reject the package and emit a diagnostic error.

---

# Lock File

To ensure reproducible builds, the compiler should generate a lock file:

    .prodara/registry.lock.json

Format:

    {
      "format": "prodara-registry-lock",
      "version": "0.1.0",
      "packages": [
        {
          "path": "registry/backend/nestjs",
          "version": "1.1.0",
          "hash": "sha256:abc123...",
          "source": "official",
          "commit": "a1b2c3d4e5f6...",
          "resolved": "2026-03-18T10:00:00Z"
        },
        {
          "path": "@company/backend/nestjs_custom",
          "version": "1.0.0",
          "hash": "sha256:789def...",
          "source": "company",
          "commit": "f6e5d4c3b2a1...",
          "resolved": "2026-03-18T10:00:00Z"
        },
        {
          "path": "registry/database/postgres",
          "version": "2.0.0",
          "hash": "sha256:def456...",
          "source": "official",
          "commit": "a1b2c3d4e5f6...",
          "resolved": "2026-03-18T10:00:00Z"
        }
      ]
    }

### Lock Fields per Entry

| Field     | Type   | Description                                              |
|-----------|--------|----------------------------------------------------------|
| `path`    | string | Full package path including scope if applicable          |
| `version` | string | Exact resolved version (always full semver)              |
| `hash`    | string | SHA-256 hash of the package directory contents           |
| `source`  | string | Registry name (`official`, or custom registry name)      |
| `commit`  | string | Git commit hash the package was resolved from            |
| `resolved`| string | ISO 8601 timestamp of resolution                         |

When a lock file exists, the compiler must use the exact versions, hashes, and commits recorded in it. The lock file should be committed to version control.

---

# Compiler Responsibilities

During compilation, the compiler must:

1. Parse all `use` references in constitutions.
2. Resolve each package reference using the resolution protocol.
3. Verify integrity of resolved packages.
4. Load and validate package manifests.
5. Resolve transitive dependencies (depth-first, detect cycles).
6. Merge policy defaults in declaration order.
7. Validate constitution-body configuration against package schemas.
8. Emit diagnostics for unresolvable packages, schema violations, or version conflicts.

## Dependency Conflicts

If two packages require incompatible versions of a transitive dependency, the compiler must emit a diagnostic error. Prodara does not perform automatic version conflict resolution — the spec author must resolve conflicts by pinning compatible versions.

---

# Product Graph Encoding

Constitution nodes in the Product Graph encode resolved package references:

    {
      "id": "platform.constitution.default_product",
      "kind": "constitution",
      "name": "default_product",
      "packages": [
        { "path": "registry/backend/nestjs", "version": "1.1.0", "hash": "sha256:abc123..." },
        { "path": "registry/database/postgres", "version": "2.0.0", "hash": "sha256:def456..." }
      ],
      "policies": { ... }
    }

Note that resolved packages include the full patch version and content hash, not just the version constraint from the source. This ensures the Product Graph is fully deterministic.

---

# Standard Categories

The following categories are defined as conventions. Implementations may add custom categories.

| Category   | Description                                    | Example Packages                     |
|------------|------------------------------------------------|--------------------------------------|
| `backend`  | Server-side frameworks and runtime             | `nestjs`, `express`, `django`, `rails` |
| `web`      | Frontend web frameworks                        | `angular`, `react`, `vue`, `svelte`  |
| `mobile`   | Mobile application frameworks                  | `flutter`, `react-native`, `swift-ui`|
| `database` | Database engines and migration tools           | `postgres`, `mysql`, `mongodb`, `redis` |
| `infra`    | Infrastructure and deployment                  | `docker`, `kubernetes`, `terraform`  |
| `testing`  | Testing frameworks and tools                   | `jest`, `vitest`, `playwright`       |
| `auth`     | Authentication and authorization               | `oauth2`, `keycloak`, `auth0`        |
| `observability` | Logging, metrics, tracing                 | `opentelemetry`, `datadog`, `sentry` |
| `messaging`| Message queues and event systems               | `kafka`, `rabbitmq`, `nats`          |

---

# Best Practices

- Pin major and minor versions in constitutions for reproducibility.
- Commit the lock file to version control. Use it in CI to prevent resolution drift.
- Keep SKILL.md files concise and example-driven — the AI consumes these directly.
- Write AGENTS.md files to be composable across technologies.
- Vendor critical packages locally (`.prodara/registry/`) for air-gapped environments.
- Prefer small, focused packages over monolithic ones.
- Use custom registries for proprietary or organization-specific generation logic.

---

# Custom Registry Setup

## Creating a Custom Registry

A custom registry is a Git repository with the same layout as the official registry:

    my-prodara-packages/
      backend/
        my_framework/
          1.0.0/
            package.prd.json
            policies.prd.json
            schema.prd.json
            AGENTS.md
            skills/
              ...

## Registering a Custom Registry

Add it to `.prodara/config.json`:

    {
      "registries": [
        {
          "name": "mycompany",
          "git": "https://github.com/mycompany/prodara-packages.git",
          "branch": "main"
        }
      ]
    }

## Referencing Custom Packages

Use a scoped reference in the constitution:

    constitution default_product {
      use: [
        @mycompany/backend/my_framework@1.0,
        registry/database/postgres@2.0
      ]
    }

Or, if the custom registry shadows an official package name (not recommended), unscoped references resolve custom-first based on declaration order.

---

# Future Extensions

Future versions may add:

- package publishing CLI tooling (`prodara registry publish`)
- signed packages with public key verification
- package deprecation and yanking
- conditional platform selection (e.g., different packages per deployment target)
- HTTP registry mirror for Git-based registries (performance optimization)
- registry search and discovery API

These features are excluded from v0.1 to keep the registry model simple and functional.

---

## See Also

- `language/v0.1/governance/constitution.md` — constitutions that reference registry packages
- `language/v0.1/grammar.md` — grammar for `package_ref` and `package_path`
- `model/product-graph-format.md` — how resolved packages appear in the Product Graph
- `compiler/compiler-architecture.md` — compiler pipeline that resolves packages
