// ---------------------------------------------------------------------------
// Prodara Compiler — Semantic Validator
// ---------------------------------------------------------------------------
// Enforces semantic rules that go beyond type-checking:
// - Workflow transitions must reference valid enum members
// - Capabilities must reference valid actors
// - Surfaces must reference valid capabilities
// - Tests must reference valid targets
// - Various referential integrity checks

import type { AstFile, ModuleItem, WorkflowDecl, SurfaceDecl, CapabilityDecl, SecurityDecl, PrivacyDecl, ValidationDecl as AstValidationDecl, ConstitutionDecl, DeploymentDecl } from '../parser/ast.js';
import type { BindResult } from '../binder/binder.js';
import { resolveSymbolRef } from '../binder/binder.js';
import { DiagnosticBag } from '../diagnostics/diagnostic.js';

export interface ValidateResult {
  readonly bag: DiagnosticBag;
}

export function validate(files: readonly AstFile[], bindResult: BindResult): ValidateResult {
  const bag = new DiagnosticBag();
  const v = new SemanticValidator(bindResult, bag);

  for (const file of files) {
    for (const decl of file.declarations) {
      if (decl.kind === 'module') {
        for (const item of decl.items) {
          v.validateItem(item, decl.name);
        }
      }
    }
  }

  return { bag };
}

class SemanticValidator {
  constructor(
    private readonly bind: BindResult,
    private readonly bag: DiagnosticBag,
  ) {}

  validateItem(item: ModuleItem, moduleName: string): void {
    switch (item.kind) {
      case 'workflow':
        this.validateWorkflow(item, moduleName);
        break;
      case 'capability':
        this.validateCapability(item, moduleName);
        break;
      case 'surface':
        this.validateSurface(item, moduleName);
        break;
      case 'action':
        if (item.workflow) {
          this.resolveRefOrWarn(item.workflow, moduleName, item.location.file, item.location.line, item.location.column, 'workflow');
        }
        break;
      case 'transport':
        if (item.target) this.resolveRefOrWarn(item.target, moduleName, item.location.file, item.location.line, item.location.column);
        break;
      case 'storage':
        if (item.target) this.resolveRefOrWarn(item.target, moduleName, item.location.file, item.location.line, item.location.column);
        break;
      case 'execution':
        if (item.target) this.resolveRefOrWarn(item.target, moduleName, item.location.file, item.location.line, item.location.column);
        break;
      case 'extension':
        if (item.target) this.resolveRefOrWarn(item.target, moduleName, item.location.file, item.location.line, item.location.column);
        break;
      case 'rendering':
        if (item.target) this.resolveRefOrWarn(item.target, moduleName, item.location.file, item.location.line, item.location.column, 'surface');
        break;
      case 'test':
        if (item.target.length > 0) {
          this.resolveRefOrWarn(item.target, moduleName, item.location.file, item.location.line, item.location.column);
        }
        break;
      case 'security':
        this.validateGovernanceAppliesTo(item, moduleName);
        break;
      case 'privacy':
        this.validatePrivacy(item, moduleName);
        break;
      case 'validation':
        this.validateGovernanceAppliesTo(item, moduleName);
        break;
      case 'constitution':
        this.validateGovernanceAppliesTo(item, moduleName);
        break;
      case 'deployment':
        this.validateDeployment(item, moduleName);
        break;
      default:
        break;
    }
  }

  private validateWorkflow(wf: WorkflowDecl, moduleName: string): void {
    // Validate capability ref
    if (wf.capability) {
      this.resolveRefOrWarn(wf.capability, moduleName, wf.location.file, wf.location.line, wf.location.column, 'capability');
    }

    // Validate reads/writes refs
    if (wf.reads) {
      for (const ref of wf.reads) {
        this.resolveRefOrWarn(ref, moduleName, wf.location.file, wf.location.line, wf.location.column);
      }
    }
    if (wf.writes) {
      for (const ref of wf.writes) {
        this.resolveRefOrWarn(ref, moduleName, wf.location.file, wf.location.line, wf.location.column);
      }
    }

    // Validate rules refs
    if (wf.rules) {
      for (const ref of wf.rules) {
        this.resolveRefOrWarn(ref, moduleName, wf.location.file, wf.location.line, wf.location.column, 'rule');
      }
    }

    // Validate transitions: entity reference must be resolvable
    if (wf.transitions) {
      for (const t of wf.transitions) {
        const sym = this.resolveRefOrWarn(t.entity, moduleName, wf.location.file, wf.location.line, wf.location.column, 'entity');
        if (sym && sym.nodeKind === 'entity') {
          // Check that the field has an enum type (transition field must be enum)
          const entityDecl = sym.declaration;
          if (entityDecl.kind === 'entity') {
            const field = entityDecl.fields.find((f) => f.name === t.field);
            if (!field) {
              this.bag.add({
                phase: 'validator', category: 'semantic_error', severity: 'error',
                code: 'PRD0401',
                message: `Transition field '${t.field}' not found on entity '${sym.qualifiedName}'`,
                file: wf.location.file, line: wf.location.line, column: wf.location.column,
              });
            } else if (field.type.kind === 'ref') {
              // Resolve the enum type and validate from/to are valid members
              const enumSym = resolveSymbolRef(field.type.segments, moduleName, this.bind.modules, this.bind.allSymbols);
              if (enumSym && enumSym.nodeKind === 'enum' && enumSym.declaration.kind === 'enum') {
                const members = enumSym.declaration.members.map((m) => m.name);
                if (!members.includes(t.from)) {
                  this.bag.add({
                    phase: 'validator', category: 'semantic_error', severity: 'error',
                    code: 'PRD0402',
                    message: `Transition 'from' state '${t.from}' is not a member of enum '${enumSym.qualifiedName}'`,
                    file: wf.location.file, line: wf.location.line, column: wf.location.column,
                  });
                }
                if (!members.includes(t.to)) {
                  this.bag.add({
                    phase: 'validator', category: 'semantic_error', severity: 'error',
                    code: 'PRD0402',
                    message: `Transition 'to' state '${t.to}' is not a member of enum '${enumSym.qualifiedName}'`,
                    file: wf.location.file, line: wf.location.line, column: wf.location.column,
                  });
                }
              }
            }
          }
        }
      }
    }

    // Validate trigger
    if (wf.trigger) {
      this.resolveRefOrWarn(wf.trigger, moduleName, wf.location.file, wf.location.line, wf.location.column, 'event');
    }
  }

  private validateCapability(cap: CapabilityDecl, moduleName: string): void {
    if (cap.actors) {
      for (const ref of cap.actors) {
        this.resolveRefOrWarn(ref, moduleName, cap.location.file, cap.location.line, cap.location.column, 'actor');
      }
    }
  }

  private validateSurface(surf: SurfaceDecl, moduleName: string): void {
    if (surf.capability) {
      this.resolveRefOrWarn(surf.capability, moduleName, surf.location.file, surf.location.line, surf.location.column, 'capability');
    }
    if (surf.binds) {
      this.resolveRefOrWarn(surf.binds, moduleName, surf.location.file, surf.location.line, surf.location.column, 'entity');
    }
    if (surf.actions) {
      for (const ref of surf.actions) {
        this.resolveRefOrWarn(ref, moduleName, surf.location.file, surf.location.line, surf.location.column, 'action');
      }
    }
    if (surf.surfaces) {
      for (const ref of surf.surfaces) {
        this.resolveRefOrWarn(ref, moduleName, surf.location.file, surf.location.line, surf.location.column, 'surface');
      }
    }
    if (surf.rules) {
      for (const ref of surf.rules) {
        this.resolveRefOrWarn(ref, moduleName, surf.location.file, surf.location.line, surf.location.column, 'rule');
      }
    }
    if (surf.hooks) {
      for (const hook of surf.hooks) {
        if (hook.target) {
          this.resolveRefOrWarn(hook.target, moduleName, surf.location.file, surf.location.line, surf.location.column);
        }
      }
    }
  }

  private validateGovernanceAppliesTo(item: SecurityDecl | PrivacyDecl | AstValidationDecl | ConstitutionDecl, moduleName: string): void {
    if (item.appliesTo) {
      for (const ref of item.appliesTo) {
        // Governance applies_to may target modules (single segment = module name) or items
        if (ref.length === 1 && this.bind.modules.has(ref[0]!)) continue;
        this.resolveRefOrWarn(ref, moduleName, item.location.file, item.location.line, item.location.column);
      }
    }
  }

  private validatePrivacy(item: PrivacyDecl, moduleName: string): void {
    this.validateGovernanceAppliesTo(item, moduleName);
    if (item.redactOn) {
      for (const ref of item.redactOn) {
        this.resolveRefOrWarn(ref, moduleName, item.location.file, item.location.line, item.location.column);
      }
    }
  }

  private validateDeployment(item: DeploymentDecl, moduleName: string): void {
    if (item.environments) {
      for (const ref of item.environments) {
        this.resolveRefOrWarn(ref, moduleName, item.location.file, item.location.line, item.location.column, 'environment');
      }
    }
  }

  private resolveRefOrWarn(
    segments: readonly string[],
    moduleName: string,
    file: string,
    line: number,
    column: number,
    expectedKind?: string,
  ) {
    /* v8 ignore next */
    if (segments.length === 0) return null;
    const sym = resolveSymbolRef(segments, moduleName, this.bind.modules, this.bind.allSymbols);
    if (!sym) {
      this.bag.add({
        phase: 'validator', category: 'resolution_error', severity: 'error',
        code: 'PRD0400',
        message: `Unresolved reference '${segments.join('.')}'`,
        file, line, column,
      });
      return null;
    }
    if (expectedKind && sym.nodeKind !== expectedKind) {
      this.bag.add({
        phase: 'validator', category: 'semantic_error', severity: 'warning',
        code: 'PRD0402',
        message: `Expected '${expectedKind}' but '${segments.join('.')}' resolves to '${sym.nodeKind}'`,
        file, line, column,
      });
    }
    return sym;
  }
}
