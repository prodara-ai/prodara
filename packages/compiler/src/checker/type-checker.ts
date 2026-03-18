// ---------------------------------------------------------------------------
// Prodara Compiler — Type Checker
// ---------------------------------------------------------------------------
// Validates type references, field types, input/return types, and payload
// types across the entire AST.

import type { TypeExpr, NodeKind } from '../types.js';
import { PRIMITIVE_TYPES } from '../types.js';
import type { BindResult, Symbol } from '../binder/binder.js';
import { resolveSymbolRef } from '../binder/binder.js';
import type { AstFile, ModuleItem, EntityDecl, ValueDecl, FieldDecl, WorkflowDecl, EventDecl, ExtensionDecl, RuleDecl, TestDecl } from '../parser/ast.js';
import { DiagnosticBag } from '../diagnostics/diagnostic.js';

// ---------------------------------------------------------------------------
// Check Result
// ---------------------------------------------------------------------------
export interface CheckResult {
  readonly bag: DiagnosticBag;
}

// ---------------------------------------------------------------------------
// Type Checker
// ---------------------------------------------------------------------------
export function checkTypes(files: readonly AstFile[], bindResult: BindResult): CheckResult {
  const bag = new DiagnosticBag();
  const checker = new TypeChecker(bindResult, bag);

  for (const file of files) {
    for (const decl of file.declarations) {
      if (decl.kind === 'module') {
        for (const item of decl.items) {
          checker.checkItem(item, decl.name);
        }
      }
    }
  }

  return { bag };
}

class TypeChecker {
  constructor(
    private readonly bind: BindResult,
    private readonly bag: DiagnosticBag,
  ) {}

  checkItem(item: ModuleItem, moduleName: string): void {
    switch (item.kind) {
      case 'entity':
      case 'value':
        this.checkFields(item.fields, item.name, moduleName, item.location.file);
        break;
      case 'workflow':
        this.checkWorkflow(item, moduleName);
        break;
      case 'event':
        if (item.payload) this.checkTypeExpr(item.payload, moduleName, item.location.file);
        break;
      case 'extension':
        this.checkExtension(item, moduleName);
        break;
      case 'rule':
        this.checkRule(item, moduleName);
        break;
      case 'test':
        this.checkTest(item, moduleName);
        break;
      default:
        break;
    }
  }

  private checkFields(fields: readonly FieldDecl[], declName: string, moduleName: string, file: string): void {
    const seen = new Set<string>();
    for (const f of fields) {
      if (seen.has(f.name)) {
        this.bag.add({
          phase: 'checker', category: 'type_error', severity: 'error',
          code: 'PRD0300',
          message: `Duplicate field '${f.name}' in '${declName}'`,
          file, line: f.location.line, column: f.location.column,
        });
      }
      seen.add(f.name);
      this.checkTypeExpr(f.type, moduleName, file);
    }
  }

  private checkWorkflow(wf: WorkflowDecl, moduleName: string): void {
    if (wf.input) this.checkFields(wf.input, wf.name, moduleName, wf.location.file);
    if (wf.returns) {
      for (const r of wf.returns) {
        this.checkTypeExpr(r.type, moduleName, wf.location.file);
      }
    }
  }

  private checkExtension(ext: ExtensionDecl, moduleName: string): void {
    if (ext.contract?.input) this.checkTypeExpr(ext.contract.input, moduleName, ext.location.file);
    if (ext.contract?.output) this.checkTypeExpr(ext.contract.output, moduleName, ext.location.file);
  }

  private checkRule(rule: RuleDecl, moduleName: string): void {
    if (rule.entity.length > 0) {
      this.resolveRef(rule.entity, moduleName, rule.location.file, rule.location.line, rule.location.column, 'entity');
    }
  }

  private checkTest(test: TestDecl, moduleName: string): void {
    if (test.target.length > 0) {
      this.resolveRef(test.target, moduleName, test.location.file, test.location.line, test.location.column);
    }
  }

  private checkTypeExpr(type: TypeExpr, moduleName: string, file: string): void {
    switch (type.kind) {
      case 'primitive':
        // Valid by construction — PRIMITIVE_TYPES is exhaustive
        break;
      case 'ref':
        this.resolveRef(type.segments, moduleName, file, type.location.line, type.location.column);
        break;
      case 'generic':
        this.checkTypeExpr(type.inner, moduleName, file);
        break;
    }
  }

  private resolveRef(
    segments: readonly string[],
    moduleName: string,
    file: string,
    line: number,
    column: number,
    expectedKind?: NodeKind,
  ): Symbol | null {
    /* v8 ignore next */
    if (segments.length === 0) return null;

    const sym = resolveSymbolRef(segments, moduleName, this.bind.modules, this.bind.allSymbols);

    if (!sym) {
      this.bag.add({
        phase: 'checker', category: 'resolution_error', severity: 'error',
        code: 'PRD0301',
        message: `Unresolved symbol '${segments.join('.')}'`,
        file, line, column,
      });
      return null;
    }

    if (expectedKind && sym.nodeKind !== expectedKind) {
      this.bag.add({
        phase: 'checker', category: 'type_error', severity: 'warning',
        code: 'PRD0302',
        message: `Expected '${expectedKind}' but '${segments.join('.')}' is a '${sym.nodeKind}'`,
        file, line, column,
      });
    }

    return sym;
  }
}
