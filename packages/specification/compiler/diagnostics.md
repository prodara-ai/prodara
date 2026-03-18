# Prodara Diagnostics

This document defines the structure, format, and behavior of diagnostics emitted by Prodara tooling.

Diagnostics are the primary feedback mechanism from the compiler to developers, AI agents, and CI systems.

---

# Emitting Phases

Diagnostics are emitted by:

- lexer
- parser
- binder
- validator
- Product Graph builder
- planner
- spec test runner

Each phase should tag its diagnostics so consumers can filter by compile stage.

---

# Diagnostic Categories

Prodara implementations must classify diagnostics into one of these categories:

| Category              | Phase               | Description                                      |
|-------------------|---------------------|--------------------------------------------------|
| `lexical_error`   | lexer               | Invalid tokens, unterminated strings, bad escapes |
| `syntax_error`    | parser              | Malformed declarations, unexpected tokens         |
| `resolution_error`| binder              | Unresolved symbols, ambiguous imports             |
| `type_error`      | validator           | Type mismatches, invalid field types              |
| `semantic_error`  | validator           | Invalid transitions, missing authorization, circular deps |
| `graph_error`     | graph builder       | Duplicate node IDs, invalid edge references       |
| `registry_error`  | registry resolver   | Unresolvable packages, hash mismatch, schema violations |
| `planning_error`  | planner             | Unclassifiable changes, invalid plan state        |
| `test_failure`    | test runner         | Spec test assertion failures                      |
| `verification_error`| verifier          | Artifact completeness, consistency, policy failures |
| `generation_error`| generator           | Generation failed, artifact not produced          |
| `generation_warning`| generator         | Generation succeeded with issues                  |
| `seam_warning`    | generator           | Extension seam could not be cleanly preserved     |
| `review_fix_error`| review/fix loop     | Review/fix loop exhausted without resolution      |
| `warning`         | any                 | Non-blocking issues (unused imports, unreachable code) |
| `lint`            | any                 | Style and convention violations                   |

---

# Severity

Every diagnostic has one of three severities:

| Severity  | Meaning                                                |
|-----------|--------------------------------------------------------|
| `error`   | Compilation cannot proceed; the spec is invalid        |
| `warning` | Compilation proceeds but the issue should be addressed |
| `info`    | Informational; no action required                      |

Conformance-critical failures must be emitted as `error`.

---

# Diagnostic Format

Diagnostics are serialized as a single JSON document.

File extension: `.prd.diagnostics.json`

Character encoding: UTF-8

## Top-Level Structure

    {
      "format": "prodara-diagnostics",
      "version": "0.1.0",
      "source": "prodara-compiler",
      "timestamp": "2026-03-18T10:00:00Z",
      "summary": {
        "errors": 2,
        "warnings": 1,
        "info": 0
      },
      "diagnostics": [ ... ]
    }

### Top-Level Fields

| Field        | Type   | Required | Description                                  |
|-------------|--------|----------|----------------------------------------------|
| `format`    | string | yes      | Always `"prodara-diagnostics"`               |
| `version`   | string | yes      | Diagnostics format version (semver)          |
| `source`    | string | yes      | Compiler or tool name that emitted these     |
| `timestamp` | string | no       | ISO 8601 timestamp                           |
| `summary`   | object | yes      | Count of diagnostics by severity             |
| `diagnostics`| array | yes      | Array of diagnostic objects                  |

---

# Diagnostic Object

Each diagnostic is an object with the following schema:

    {
      "phase": "validator",
      "category": "semantic_error",
      "severity": "error",
      "code": "PRD0042",
      "message": "Transition target 'cancelled' is not a member of enum 'invoice_status'.",
      "file": "billing.prd",
      "line": 34,
      "column": 5,
      "end_line": 34,
      "end_column": 52,
      "construct_kind": "workflow",
      "construct_id": "billing.workflow.void_invoice",
      "related": [
        {
          "message": "'invoice_status' is defined here with members: draft, issued, paid, void",
          "file": "billing.prd",
          "line": 8,
          "column": 3
        }
      ],
      "fix": {
        "description": "Add 'cancelled' to enum 'invoice_status', or use an existing member.",
        "suggestions": ["draft", "issued", "paid", "void"]
      }
    }

## Required Fields

| Field       | Type   | Required | Description                                              |
|------------|--------|----------|----------------------------------------------------------|
| `phase`    | string | yes      | Compiler phase that emitted the diagnostic               |
| `category` | string | yes      | Diagnostic category (see table above)                    |
| `severity` | string | yes      | `error`, `warning`, or `info`                            |
| `message`  | string | yes      | Human-readable diagnostic message                        |
| `file`     | string | yes      | Repository-relative path to the source file              |

## Optional Fields

| Field            | Type    | Required | Description                                          |
|-----------------|---------|----------|------------------------------------------------------|
| `code`          | string  | no       | Stable diagnostic code (e.g., `PRD0042`)             |
| `line`          | integer | no       | 1-based line number of the diagnostic start          |
| `column`        | integer | no       | 1-based column number of the diagnostic start        |
| `end_line`      | integer | no       | 1-based line number of the diagnostic end            |
| `end_column`    | integer | no       | 1-based column number of the diagnostic end          |
| `construct_kind`| string  | no       | Kind of the construct (entity, workflow, rule, etc.) |
| `construct_id`  | string  | no       | Product Graph node ID of the construct               |
| `related`       | array   | no       | Related locations and messages                       |
| `fix`           | object  | no       | Suggested fix information                            |

## Related Locations

Related locations provide additional context, such as where a referenced symbol is defined or where a conflicting declaration appears.

    {
      "message": "Previously declared here",
      "file": "crm.prd",
      "line": 12,
      "column": 3
    }

## Fix Object

The fix object provides machine-actionable repair information.

    {
      "description": "Import 'customer' from module 'crm'.",
      "suggestions": ["import customer from crm"],
      "text_edits": [
        {
          "file": "billing.prd",
          "line": 3,
          "column": 1,
          "insert": "import customer from crm\n"
        }
      ]
    }

### Fix Fields

| Field         | Type    | Required | Description                                       |
|---------------|---------|----------|---------------------------------------------------|
| `description` | string  | yes      | Human-readable description of the fix             |
| `suggestions` | array   | no       | Alternative symbol names or syntax                |
| `text_edits`  | array   | no       | Concrete text insertions or replacements          |

---

# Diagnostic Codes

Diagnostic codes are stable identifiers for specific error conditions. They allow tooling and CI systems to filter, suppress, or track specific diagnostics across time.

Format: `PRD` followed by a 4-digit number.

## Reserved Ranges

| Range         | Phase/Category                |
|---------------|-------------------------------|
| PRD0001–0099  | Lexical errors                |
| PRD0100–0199  | Syntax errors                 |
| PRD0200–0299  | Resolution errors             |
| PRD0300–0399  | Type errors                   |
| PRD0400–0499  | Semantic errors               |
| PRD0500–0599  | Graph errors                  |
| PRD0600–0699  | Registry errors               |
| PRD0700–0799  | Planning errors               |
| PRD0800–0899  | Test failures                 |
| PRD0900–0949  | Verification errors           |
| PRD0950–0999  | Warnings and lint             |
| PRD1000–1099  | Generation errors             |

Implementations should publish a diagnostic code reference mapping each code to its description and common causes.

---

# Determinism

Given the same input specification, diagnostics must be stable in:

- category
- code (if assigned)
- source span (file, line, column)
- primary message text

Diagnostic ordering must be deterministic: ordered by file path (lexicographic), then by line number, then by column number.

---

# Aggregation and Recovery

Implementations should emit multiple diagnostics per file and should avoid stopping after the first recoverable issue unless recovery would become misleading.

Best practices:

- After a syntax error, recover at the next top-level declaration and continue parsing.
- After a resolution error, continue binding other symbols.
- Emit at most one cascaded diagnostic per root cause to avoid diagnostic floods.

---

# Streaming Diagnostics

For IDE integrations and long compilations, diagnostics may be emitted incrementally as a JSON Lines stream (one JSON object per line):

    {"phase":"parser","category":"syntax_error","severity":"error","message":"...","file":"billing.prd","line":10,"column":3}
    {"phase":"validator","category":"semantic_error","severity":"warning","message":"...","file":"crm.prd","line":5,"column":1}

The `.prd.diagnostics.json` file is the batch format; JSON Lines is the streaming format. Both use the same diagnostic object schema.

---

# Example: Complete Diagnostics File

    {
      "format": "prodara-diagnostics",
      "version": "0.1.0",
      "source": "prodara-compiler",
      "timestamp": "2026-03-18T10:15:00Z",
      "summary": {
        "errors": 2,
        "warnings": 1,
        "info": 0
      },
      "diagnostics": [
        {
          "phase": "binder",
          "category": "resolution_error",
          "severity": "error",
          "code": "PRD0201",
          "message": "Unresolved symbol 'customer'. Did you mean to import it from 'crm'?",
          "file": "billing.prd",
          "line": 12,
          "column": 15,
          "construct_kind": "entity",
          "construct_id": "billing.entity.invoice",
          "fix": {
            "description": "Add an import for 'customer' from the 'crm' module.",
            "suggestions": ["import customer from crm"],
            "text_edits": [
              {
                "file": "billing.prd",
                "line": 3,
                "column": 1,
                "insert": "  import customer from crm\n"
              }
            ]
          }
        },
        {
          "phase": "validator",
          "category": "semantic_error",
          "severity": "error",
          "code": "PRD0401",
          "message": "Transition 'issued -> cancelled': 'cancelled' is not a member of enum 'invoice_status'.",
          "file": "billing.prd",
          "line": 34,
          "column": 5,
          "end_line": 34,
          "end_column": 45,
          "construct_kind": "workflow",
          "construct_id": "billing.workflow.void_invoice",
          "related": [
            {
              "message": "Enum 'invoice_status' defined here with members: draft, issued, paid, void",
              "file": "billing.prd",
              "line": 8,
              "column": 3
            }
          ],
          "fix": {
            "description": "Use an existing member of 'invoice_status': draft, issued, paid, void.",
            "suggestions": ["void"]
          }
        },
        {
          "phase": "validator",
          "category": "warning",
          "severity": "warning",
          "code": "PRD0901",
          "message": "Import 'account' from 'crm' is declared but never used.",
          "file": "billing.prd",
          "line": 4,
          "column": 3,
          "construct_kind": "import",
          "construct_id": null
        }
      ]
    }

---

## See Also

- `compiler/compiler-architecture.md` — compiler pipeline that emits diagnostics
- `model/product-graph-format.md` — Product Graph node IDs referenced in `construct_id`
- `compiler/spec-testing.md` — test runner diagnostics
- `registry/registry.md` — registry error diagnostics
