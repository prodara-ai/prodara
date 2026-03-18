// ---------------------------------------------------------------------------
// Prodara Compiler — Spec Test Runner
// ---------------------------------------------------------------------------
// Evaluates test declarations against the compiled Product Graph.

import type { AstFile, TestDecl, GivenEntry, ExpectEntry } from '../parser/ast.js';
import type { BindResult } from '../binder/binder.js';
import type { ProductGraph } from '../graph/graph-types.js';
import { resolveSymbolRef } from '../binder/binder.js';
import { DiagnosticBag } from '../diagnostics/diagnostic.js';

export interface SpecTestResult {
  readonly name: string;
  readonly target: string;
  readonly passed: boolean;
  readonly failures: readonly string[];
}

export interface SpecTestSuiteResult {
  readonly results: readonly SpecTestResult[];
  readonly totalPassed: number;
  readonly totalFailed: number;
  readonly bag: DiagnosticBag;
}

export function runSpecTests(
  files: readonly AstFile[],
  bindResult: BindResult,
  graph: ProductGraph,
): SpecTestSuiteResult {
  const bag = new DiagnosticBag();
  const results: SpecTestResult[] = [];

  for (const file of files) {
    for (const decl of file.declarations) {
      if (decl.kind !== 'module') continue;
      for (const item of decl.items) {
        if (item.kind !== 'test') continue;
        const result = evaluateTest(item, decl.name, bindResult, graph, bag);
        results.push(result);
      }
    }
  }

  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;

  return { results, totalPassed, totalFailed, bag };
}

function evaluateTest(
  test: TestDecl,
  moduleName: string,
  bind: BindResult,
  graph: ProductGraph,
  bag: DiagnosticBag,
): SpecTestResult {
  const failures: string[] = [];
  const targetId = resolveTestTarget(test, moduleName, bind);

  // Find the target node in the graph
  const targetNode = findNodeInGraph(targetId, graph);
  if (!targetNode) {
    failures.push(`Target '${test.target.join('.')}' not found in graph`);
    bag.add({
      phase: 'test_runner', category: 'test_failure', severity: 'error',
      code: 'PRD0800', message: `Test '${test.name}': target not found in compiled graph`,
      file: test.location.file, line: test.location.line, column: test.location.column,
    });
    return { name: test.name, target: targetId, passed: false, failures };
  }

  // Evaluate expect entries
  for (const entry of test.expect) {
    if (entry.key === 'authorization' && Array.isArray(entry.value)) {
      // Authorization expectations
      for (const auth of entry.value) {
        if (typeof auth === 'object' && 'actor' in auth && 'expected' in auth) {
          // Check authorization in the target node
          const authResult = checkAuthorization(targetNode, auth.actor, auth.expected);
          if (!authResult) {
            failures.push(`Authorization: expected '${auth.actor}' to be '${auth.expected}'`);
          }
        }
      }
    } else {
      // Generic property check
      const nodeValue = getProperty(targetNode, entry.key);
      const expectedValue = normalizeExpectValue(entry.value);
      if (nodeValue === undefined) {
        failures.push(`Property '${entry.key}' not found on target node`);
      } else if (JSON.stringify(nodeValue) !== JSON.stringify(expectedValue)) {
        failures.push(`Property '${entry.key}': expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(nodeValue)}`);
      }
    }
  }

  if (failures.length > 0) {
    bag.add({
      phase: 'test_runner', category: 'test_failure', severity: 'error',
      code: 'PRD0801', message: `Test '${test.name}' failed: ${failures.join('; ')}`,
      file: test.location.file, line: test.location.line, column: test.location.column,
    });
  }

  return { name: test.name, target: targetId, passed: failures.length === 0, failures };
}

function resolveTestTarget(test: TestDecl, moduleName: string, bind: BindResult): string {
  if (test.target.length === 0) return '';
  const sym = resolveSymbolRef(test.target, moduleName, bind.modules, bind.allSymbols);
  if (sym) return `${sym.module}.${sym.nodeKind}.${sym.name}`;
  return test.target.join('.');
}

/* v8 ignore start */
function findNodeInGraph(id: string, graph: ProductGraph): Record<string, unknown> | null {
  if (id === 'product') return graph.product as unknown as Record<string, unknown>;
  for (const mod of graph.modules) {
    if (mod.id === id) return mod as unknown as Record<string, unknown>;
    for (const [, value] of Object.entries(mod)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null && 'id' in item && (item as { id: string }).id === id) {
            return item as Record<string, unknown>;
          }
        }
      }
    }
  }
  return null;
}
/* v8 ignore stop */

function checkAuthorization(node: Record<string, unknown>, actor: string, expected: string): boolean {
  const auths = node['authorization'] as Array<{ actor: string; permissions: string[] }> | undefined;
  if (!auths) return expected === 'denied';
  const entry = auths.find((a) => a.actor.endsWith(`.actor.${actor}`) || a.actor === actor);
  if (!entry) return expected === 'denied';
  return expected === 'allowed';
}

function getProperty(node: Record<string, unknown>, key: string): unknown {
  return node[key];
}

/* v8 ignore start */
function normalizeExpectValue(value: unknown): unknown {
  if (typeof value === 'object' && value !== null && 'kind' in value) {
    const v = value as { kind: string; [key: string]: unknown };
    switch (v['kind']) {
      case 'string': return v['value'];
      case 'integer': return v['value'];
      case 'decimal': return v['value'];
      case 'boolean': return v['value'];
      case 'identifier': return v['value'];
      default: return value;
    }
  }
  return value;
}
/* v8 ignore stop */
