# Diagnostics Model

The Prodara compiler uses a structured diagnostic model that supports both human-readable and machine-readable output.

## Diagnostic Structure

```typescript
interface Diagnostic {
  phase: DiagnosticPhase;       // Which compiler phase produced this
  category: DiagnosticCategory; // Classification of the issue
  severity: DiagnosticSeverity; // error | warning | info
  code: string;                 // Stable code (e.g., "PRD0010")
  message: string;              // Human-readable description
  file: string;                 // Source file (relative path)
  line?: number;                // 1-based line number
  column?: number;              // 1-based column number
  endLine?: number;             // End line for ranges
  endColumn?: number;           // End column for ranges
  constructKind?: string;       // Related construct type (e.g., "entity")
  constructId?: string;         // Related construct ID
  related?: RelatedLocation[];  // Additional locations
  fix?: DiagnosticFix;          // Suggested fix
}
```

## Phases

Each diagnostic is tagged with its origin phase:

| Phase | Description |
|-------|-------------|
| `lexer` | Tokenization errors (unknown characters, unterminated strings) |
| `parser` | Syntax errors (unexpected tokens, missing constructs) |
| `binder` | Resolution errors (duplicate declarations, unresolved imports) |
| `checker` | Type errors (invalid type references, arity mismatches) |
| `validator` | Semantic errors (invalid transitions, dangling references, governance) |
| `graph` | Graph construction errors |
| `graph_validator` | Graph invariant errors (missing endpoints, self-references) |
| `planner` | Planning errors |
| `test_runner` | Test execution failures |
| `registry` | Constitution package resolution |
| `verifier` | Verification errors |

## Diagnostic Code Ranges

| Range | Phase | Description |
|-------|-------|-------------|
| PRD0001–PRD0099 | Lexer | Lexical errors |
| PRD0100–PRD0199 | Parser | Syntax errors |
| PRD0200–PRD0299 | Binder | Symbol resolution errors |
| PRD0300–PRD0399 | Type Checker | Type errors |
| PRD0400–PRD0499 | Validator | Semantic validation errors |
| PRD0500–PRD0599 | Graph Validator | Graph invariant errors |
| PRD0600–PRD0699 | Registry | Constitution resolution |
| PRD0700–PRD0799 | Planner | Planning errors |
| PRD0800–PRD0899 | Test Runner | Test execution failures |

## Categories

| Category | Description |
|----------|-------------|
| `lexical_error` | Character-level issues |
| `syntax_error` | Grammar violations |
| `resolution_error` | Symbol resolution failures |
| `type_error` | Type system violations |
| `semantic_error` | Construct-level semantic issues |
| `graph_error` | Graph construction issues |
| `registry_error` | Package resolution issues |
| `planning_error` | Plan generation issues |
| `test_failure` | Spec test failures |
| `verification_error` | Verification issues |
| `warning` | General warnings |

## Severities

| Severity | Meaning |
|----------|---------|
| `error` | Compilation cannot produce a valid graph |
| `warning` | Potential issue, compilation proceeds |
| `info` | Informational note |

## DiagnosticBag

All diagnostics are accumulated in a `DiagnosticBag`:

```typescript
class DiagnosticBag {
  add(d: Diagnostic): void;
  get all(): Diagnostic[];
  get errors(): Diagnostic[];
  get warnings(): Diagnostic[];
  get hasErrors(): boolean;
  merge(other: DiagnosticBag): void;
  sorted(): Diagnostic[];  // Sorted by file → line → column
}
```

Bags can be merged across phases. Diagnostics are sorted deterministically for output.

## Output Formats

### JSON Format

```json
{
  "format": "prodara-diagnostics",
  "version": "0.1.0",
  "diagnostics": [
    {
      "phase": "binder",
      "category": "resolution_error",
      "severity": "error",
      "code": "PRD0020",
      "message": "Module 'identity' not found",
      "file": "billing.prd",
      "line": 2,
      "column": 3
    }
  ],
  "summary": {
    "errors": 1,
    "warnings": 0
  }
}
```

### Human Format

```
billing.prd:2:3 — error PRD0020: Module 'identity' not found

1 error, 0 warnings
```

## Suggested Fixes

When available, diagnostics include machine-applicable fixes:

```json
{
  "fix": {
    "description": "Did you mean 'user_id'?",
    "suggestions": ["user_id"]
  }
}
```

Agents can use fix suggestions to automatically correct `.prd` files and re-validate.
