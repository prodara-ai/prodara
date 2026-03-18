// ---------------------------------------------------------------------------
// Prodara Compiler — Constitution & Registry Resolution
// ---------------------------------------------------------------------------
// Resolves constitution package references declared via `use` in constitution
// blocks. This module implements the resolution model described in the spec:
//
// Resolution order: local vendored → custom Git taps → official registry
//
// In v0.1 only local resolution is implemented. Remote registry and Git taps
// are defined as interfaces ready for future plug-in.

import type { AstFile, PackageRef as AstPackageRef } from '../parser/ast.js';
import type { BindResult } from '../binder/binder.js';
import { DiagnosticBag } from '../diagnostics/diagnostic.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A resolved constitution package */
export interface ResolvedPackage {
  readonly name: string;
  readonly version: string;
  readonly source: 'local' | 'git' | 'registry';
  /** Resolved policies from this package */
  readonly policies: readonly ResolvedPolicy[];
}

/** A policy resolved from a constitution package */
export interface ResolvedPolicy {
  readonly name: string;
  readonly properties: ReadonlyMap<string, unknown>;
}

/** A package reference found in a constitution declaration */
export interface ConstitutionPackageRef {
  readonly path: string;
  readonly version: string;
  readonly module: string;
  readonly constitutionName: string;
}

export interface ConstitutionResolutionResult {
  readonly bag: DiagnosticBag;
  readonly packages: readonly ResolvedPackage[];
  readonly refs: readonly ConstitutionPackageRef[];
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Extract constitution package references from the AST and attempt
 * resolution. In v0.1, only local vendored packages are supported — remote
 * packages emit an informational diagnostic.
 */
export function resolveConstitutions(
  files: readonly AstFile[],
  _bindResult: BindResult,
): ConstitutionResolutionResult {
  const bag = new DiagnosticBag();
  const refs: ConstitutionPackageRef[] = [];
  const packages: ResolvedPackage[] = [];

  // Collect all constitution package references
  for (const file of files) {
    for (const decl of file.declarations) {
      if (decl.kind !== 'module') continue;
      for (const item of decl.items) {
        if (item.kind !== 'constitution') continue;
        if (item.packages) {
          for (const pkg of item.packages) {
            refs.push({
              path: pkg.path,
              version: pkg.version,
              module: decl.name,
              constitutionName: item.name,
            });
          }
        }
      }
    }
  }

  // Attempt resolution (local only in v0.1)
  for (const ref of refs) {
    // In v0.1, no actual package fetching
    bag.add({
      phase: 'registry',
      category: 'registry_error',
      severity: 'info',
      code: 'PRD0601',
      message: `Constitution package '${ref.path}@${ref.version}' referenced but registry resolution is not yet available`,
      file: '',
      line: 0,
      column: 0,
    });
  }

  return { bag, packages, refs };
}

/**
 * Parse a raw package reference string. Exported for testing.
 */
export function parsePackageRef(raw: string): AstPackageRef | null {
  const match = /^([@\w][\w./-]*)(?:@(.+))?$/.exec(raw);
  if (!match) return null;
  return { path: match[1]!, version: match[2] ?? '*' };
}
