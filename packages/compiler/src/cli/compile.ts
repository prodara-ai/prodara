// ---------------------------------------------------------------------------
// Prodara Compiler — Compilation Orchestrator
// ---------------------------------------------------------------------------
// Drives the full compilation pipeline: discover → lex → parse → bind →
// check → validate → graph → graph-validate → plan → test → build

import { readFileSync } from 'node:fs';
import { SourceFile } from '../lexer/source.js';
import { Parser } from '../parser/parser.js';
import { bind } from '../binder/binder.js';
import { checkTypes } from '../checker/type-checker.js';
import { validate } from '../checker/validator.js';
import { buildGraph } from '../graph/builder.js';
import { validateGraph } from '../graph/validator.js';
import { serializeGraph } from '../graph/serializer.js';
import { createPlan, createInitialPlan } from '../planner/planner.js';
import { readPreviousGraph, writeBuildState } from '../build-state/build-state.js';
import { runSpecTests } from '../testing/test-runner.js';
import { discoverFiles } from '../discovery/discovery.js';
import { resolveConstitutions } from '../registry/resolution.js';
import { DiagnosticBag } from '../diagnostics/diagnostic.js';
import type { AstFile } from '../parser/ast.js';
import type { BindResult } from '../binder/binder.js';
import type { ProductGraph } from '../graph/graph-types.js';
import type { Plan } from '../planner/plan-types.js';
import type { SpecTestSuiteResult } from '../testing/test-runner.js';
import type { ConstitutionResolutionResult } from '../registry/resolution.js';

export type StopAfter = 'validate' | 'graph' | 'plan' | 'test' | 'build';

export interface CompileOptions {
  readonly stopAfter?: StopAfter;
  readonly writeBuild?: boolean;
  readonly files?: readonly string[]; // explicit file list overrides discovery
}

export interface CompileResult {
  readonly diagnostics: DiagnosticBag;
  readonly files: readonly AstFile[];
  readonly bindResult?: BindResult;
  readonly graph?: ProductGraph;
  readonly graphJson?: string;
  readonly plan?: Plan;
  readonly planJson?: string;
  readonly testResults?: SpecTestSuiteResult;
  readonly constitutions?: ConstitutionResolutionResult;
}

export function compile(root: string, options: CompileOptions = {}): CompileResult {
  const bag = new DiagnosticBag();
  const stopAfter = options.stopAfter ?? 'test';

  // 1. Discovery
  const filePaths = options.files ?? discoverFiles(root);
  if (filePaths.length === 0) {
    bag.add({
      phase: 'lexer', category: 'lexical_error', severity: 'error',
      code: 'PRD0010', message: 'No .prd files found',
      file: root, line: 0, column: 0,
    });
    return { diagnostics: bag, files: [] };
  }

  // 2. Parse all files
  const astFiles: AstFile[] = [];
  for (const fp of filePaths) {
    let content: string;
    try {
      content = readFileSync(fp, 'utf-8');
    } catch (err) {
      bag.add({
        phase: 'lexer', category: 'lexical_error', severity: 'error',
        code: 'PRD0011', message: `Cannot read file: ${fp}`,
        file: fp, line: 0, column: 0,
      });
      continue;
    }
    const source = new SourceFile(fp, content);
    const parser = new Parser(source, bag);
    astFiles.push(parser.parse());
  }

  if (bag.hasErrors) {
    return { diagnostics: bag, files: astFiles };
  }

  // 3. Bind
  const bindResult = bind(astFiles);
  bag.merge(bindResult.bag);
  if (bag.hasErrors || stopAfter === 'validate') {
    // Also run type + semantic checks even if stopping at validate
    const checkResult = checkTypes(astFiles, bindResult);
    bag.merge(checkResult.bag);
    const validateResult = validate(astFiles, bindResult);
    bag.merge(validateResult.bag);
    return { diagnostics: bag, files: astFiles, bindResult };
  }

  // 4. Type check
  const checkResult = checkTypes(astFiles, bindResult);
  bag.merge(checkResult.bag);

  // 5. Semantic validation
  const validateResult = validate(astFiles, bindResult);
  bag.merge(validateResult.bag);

  if (bag.hasErrors) {
    return { diagnostics: bag, files: astFiles, bindResult };
  }

  // 6. Build graph
  const graphResult = buildGraph(astFiles, bindResult);
  bag.merge(graphResult.bag);
  const graph = graphResult.graph;

  // 6b. Validate graph invariants
  const graphValidation = validateGraph(graph);
  bag.merge(graphValidation.bag);

  // 6c. Resolve constitutions (non-fatal if packages unavailable)
  const constitutions = resolveConstitutions(astFiles, bindResult);
  bag.merge(constitutions.bag);

  const graphJson = serializeGraph(graph);

  if (bag.hasErrors || stopAfter === 'graph') {
    return { diagnostics: bag, files: astFiles, bindResult, graph, graphJson, constitutions };
  }

  // 7. Plan
  const prevGraph = readPreviousGraph(root);
  /* v8 ignore next */
  const plan = prevGraph ? createPlan(prevGraph, graph) : createInitialPlan(graph);
  const planJson = JSON.stringify(plan, null, 2);

  // Write build state
  if (options.writeBuild !== false) {
    try {
      writeBuildState(root, graph, plan, filePaths as string[]);
    } catch {
      // Non-fatal: build state write failure shouldn't block compilation
    }
  }

  if (stopAfter === 'plan') {
    return { diagnostics: bag, files: astFiles, bindResult, graph, graphJson, plan, planJson, constitutions };
  }

  // 8. Run spec tests
  const testResults = runSpecTests(astFiles, bindResult, graph);
  bag.merge(testResults.bag);

  return { diagnostics: bag, files: astFiles, bindResult, graph, graphJson, plan, planJson, testResults, constitutions };
}
