// ---------------------------------------------------------------------------
// Prodara Compiler — Runtime Resolution
// ---------------------------------------------------------------------------
// Resolves secrets, environments, and deployments from the Product Graph.

import type { ProductGraph } from '../graph/graph-types.js';
import type { AstFile, SecretDecl, EnvironmentDecl, DeploymentDecl } from '../parser/ast.js';
import { DiagnosticBag } from '../diagnostics/diagnostic.js';

// ---------------------------------------------------------------------------
// Resolved Runtime Types
// ---------------------------------------------------------------------------
export interface ResolvedSecret {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly description: string | null;
}

export interface ResolvedEnvironment {
  readonly id: string;
  readonly name: string;
  readonly url: string | null;
  readonly secrets: readonly { name: string; resolvedSource: string }[];
}

export interface ResolvedDeployment {
  readonly id: string;
  readonly name: string;
  readonly environments: readonly string[];
}

export interface RuntimeResolutionResult {
  readonly secrets: readonly ResolvedSecret[];
  readonly environments: readonly ResolvedEnvironment[];
  readonly deployments: readonly ResolvedDeployment[];
  readonly bag: DiagnosticBag;
}

// ---------------------------------------------------------------------------
// Resolve
// ---------------------------------------------------------------------------
export function resolveRuntime(files: readonly AstFile[]): RuntimeResolutionResult {
  const bag = new DiagnosticBag();
  const secrets: ResolvedSecret[] = [];
  const environments: ResolvedEnvironment[] = [];
  const deployments: ResolvedDeployment[] = [];

  for (const file of files) {
    for (const decl of file.declarations) {
      if (decl.kind !== 'module') continue;
      for (const item of decl.items) {
        if (item.kind === 'secret') {
          secrets.push({
            id: `${decl.name}.secret.${item.name}`,
            name: item.name,
            source: item.source ?? 'environment',
            description: item.description ?? null,
          });
        }
        if (item.kind === 'environment') {
          const envSecrets = (item.secrets ?? []).map((s) => ({
            name: s.name,
            resolvedSource: extractValue(s.value),
          }));
          environments.push({
            id: `${decl.name}.environment.${item.name}`,
            name: item.name,
            url: item.url ?? null,
            secrets: envSecrets,
          });
        }
        if (item.kind === 'deployment') {
          deployments.push({
            id: `${decl.name}.deployment.${item.name}`,
            name: item.name,
            environments: (item.environments ?? []).map((e) => e.join('.')),
          });
        }
      }
    }
  }

  return { secrets, environments, deployments, bag };
}

function extractValue(v: { kind: string; [key: string]: unknown }): string {
  if (v.kind === 'string') return v['value'] as string;
  /* v8 ignore next */
  if (v.kind === 'identifier') return v['value'] as string;
  return String(v['value'] /* v8 ignore next */ ?? '');
}
