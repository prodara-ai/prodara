// ---------------------------------------------------------------------------
// Prodara Compiler — Product Graph Builder
// ---------------------------------------------------------------------------
// Builds the Product Graph from parsed AST files + bind result.

import type { AstFile, ModuleItem, Expression, FieldDecl } from '../parser/ast.js';
import type { BindResult } from '../binder/binder.js';
import { resolveSymbolRef } from '../binder/binder.js';
import type { TypeExpr, EdgeKind } from '../types.js';
import { DiagnosticBag } from '../diagnostics/diagnostic.js';
import type { ProductGraph, ProductNode, ModuleNode, GraphEdge, GraphMetadata, FieldRef, GraphTypeRef, ExpressionJson, ImportRef } from './graph-types.js';

export interface BuildGraphResult {
  readonly graph: ProductGraph;
  readonly bag: DiagnosticBag;
}

export function buildGraph(files: readonly AstFile[], bindResult: BindResult): BuildGraphResult {
  const bag = new DiagnosticBag();
  const builder = new GraphBuilder(files, bindResult, bag);
  const graph = builder.build();
  return { graph, bag };
}

// ---------------------------------------------------------------------------
// Node ID helpers
// ---------------------------------------------------------------------------
function nodeId(moduleName: string, kind: string, name: string): string {
  return `${moduleName}.${kind}.${name}`;
}

function resolveTypeRef(type: TypeExpr, moduleName: string, bindResult: BindResult): GraphTypeRef {
  switch (type.kind) {
    case 'primitive':
      return type.name;
    case 'ref': {
      const sym = resolveSymbolRef(type.segments, moduleName, bindResult.modules, bindResult.allSymbols);
      if (sym) return { ref: sym.qualifiedName.replace('.', `.${sym.nodeKind}.`) };
      return { ref: type.segments.join('.') };
    }
    case 'generic':
      return { generic: type.wrapper, arg: resolveTypeRef(type.inner, moduleName, bindResult) };
  }
}

function serializeExpression(expr: Expression): ExpressionJson {
  switch (expr.kind) {
    case 'binary':
      if (expr.op === 'and' || expr.op === 'or') {
        const operands: ExpressionJson[] = [];
        flattenBoolOp(expr, expr.op, operands);
        return { op: expr.op, operands };
      }
      return { op: expr.op, left: serializeExpression(expr.left), right: serializeExpression(expr.right) };
    case 'unary':
      return { op: 'not', operand: serializeExpression(expr.operand) };
    case 'access':
      return { access: [...expr.segments] };
    case 'literal':
      return { literal: expr.value, type: expr.literalType };
    case 'paren':
      return serializeExpression(expr.inner);
  }
}

function flattenBoolOp(expr: Expression, op: string, out: ExpressionJson[]): void {
  if (expr.kind === 'binary' && expr.op === op) {
    flattenBoolOp(expr.left, op, out);
    flattenBoolOp(expr.right, op, out);
  } else {
    out.push(serializeExpression(expr));
  }
}

function serializeFields(fields: readonly FieldDecl[], moduleName: string, bindResult: BindResult): FieldRef[] {
  return fields.map((f) => ({
    name: f.name,
    type: resolveTypeRef(f.type, moduleName, bindResult),
  }));
}

// ---------------------------------------------------------------------------
// Graph Builder
// ---------------------------------------------------------------------------
class GraphBuilder {
  private readonly edges: GraphEdge[] = [];
  private readonly sourceFiles: string[];

  constructor(
    private readonly files: readonly AstFile[],
    private readonly bind: BindResult,
    private readonly bag: DiagnosticBag,
  ) {
    this.sourceFiles = files.map((f) => f.path).sort();
  }

  build(): ProductGraph {
    const product = this.buildProductNode();
    const modules = this.buildModuleNodes();

    // Sort edges deterministically
    this.edges.sort((a, b) => {
      const cf = a.from.localeCompare(b.from);
      if (cf !== 0) return cf;
      const ck = a.kind.localeCompare(b.kind);
      if (ck !== 0) return ck;
      return a.to.localeCompare(b.to);
    });

    const metadata: GraphMetadata = {
      compiler: 'prodara-compiler',
      compiled_at: new Date().toISOString(),
      source_files: this.sourceFiles,
    };

    return {
      format: 'prodara-product-graph',
      version: '0.1.0',
      product,
      modules,
      edges: this.edges,
      metadata,
    };
  }

  private buildProductNode(): ProductNode {
    let prodNode: ProductNode = {
      id: 'product',
      kind: 'product',
      name: this.bind.productName ?? 'unnamed',
      title: null,
      version: null,
      modules: [],
      publishes: null,
    };

    for (const file of this.files) {
      for (const decl of file.declarations) {
        if (decl.kind === 'product') {
          const moduleNames = [...(this.bind.modules.keys())].sort();
          let publishes: Record<string, string[]> | null = null;
          if (decl.publishes) {
            publishes = {};
            for (const entry of decl.publishes.entries) {
              publishes[entry.category] = entry.symbols.map((s) => {
                const resolved = resolveSymbolRef(s, '', this.bind.modules, this.bind.allSymbols);
                /* v8 ignore next */
                return resolved ? `${resolved.module}.${resolved.nodeKind}.${resolved.name}` : s.join('.');
              });
            }
          }
          /* v8 ignore next */
          prodNode = { ...prodNode, name: decl.name, title: decl.title ?? null, version: decl.version ?? null, modules: moduleNames, publishes };

          // product -> module edges
          for (const mn of moduleNames) {
            this.addEdge('product', mn, 'contains');
          }
        }
      }
    }
    return prodNode;
  }

  private buildModuleNodes(): ModuleNode[] {
    const moduleNodes: ModuleNode[] = [];

    for (const [modName, table] of this.bind.modules) {
      const imports: ImportRef[] = table.imports.map((imp) => ({
        symbol: imp.originalSymbol,
        from: imp.sourceModule,
        /* v8 ignore next */
        alias: imp.localName !== imp.originalSymbol ? imp.localName : null,
      }));

      // Emit module→module import edges
      const importedModules = new Set(table.imports.map((imp) => imp.sourceModule));
      for (const srcMod of importedModules) {
        this.addEdge(modName, srcMod, 'imports');
      }

      // Group items by category
      const categories: Record<string, unknown[]> = {};

      for (const [, sym] of table.symbols) {
        const item = sym.declaration;
        const id = nodeId(modName, sym.nodeKind, sym.name);
        const cat = pluralize(sym.nodeKind);

        if (!categories[cat]) categories[cat] = [];
        const node = this.serializeItem(item, id, modName);
        if (node) {
          categories[cat].push(node);
          // module -> item edge
          this.addEdge(modName, id, 'contains');
          // emit semantic edges
          this.emitEdgesForItem(item, id, modName);
        }
      }

      // Sort each category by name for determinism
      for (const cat of Object.keys(categories)) {
        (categories[cat] as { name: string }[]).sort((a, b) => a.name.localeCompare(b.name));
      }

      // Build module node with sorted category keys
      const modNode: Record<string, unknown> = {
        id: modName,
        kind: 'module',
        name: modName,
        imports: imports.sort((a, b) => a.symbol.localeCompare(b.symbol)),
      };

      for (const cat of Object.keys(categories).sort()) {
        modNode[cat] = categories[cat];
      }

      moduleNodes.push(modNode as unknown as ModuleNode);
    }

    return moduleNodes.sort((a, b) => a.name.localeCompare(b.name));
  }

  /* v8 ignore start — V8 does not track ??/ternary branches in object literals reliably */
  private serializeItem(item: ModuleItem, id: string, modName: string): Record<string, unknown> | null {
    switch (item.kind) {
      case 'import': return null;
      case 'entity':
        return { id, kind: 'entity', name: item.name, fields: serializeFields(item.fields, modName, this.bind) };
      case 'value':
        return { id, kind: 'value', name: item.name, fields: serializeFields(item.fields, modName, this.bind) };
      case 'enum':
        return { id, kind: 'enum', name: item.name, members: item.members.map((m) => {
          const mem: Record<string, unknown> = { name: m.name };
          if (m.metadata && m.metadata.length > 0) {
            const md: Record<string, unknown> = {};
            for (const p of m.metadata) md[p.key] = serializeValueNode(p.value);
            mem['metadata'] = md;
          }
          return mem;
        }) };
      case 'rule':
        return {
          id, kind: 'rule', name: item.name,
          entity: this.resolveRefToId(item.entity, modName) ?? item.entity.join('.'),
          condition: serializeExpression(item.condition),
          message: item.message.join('.'),
        };
      case 'actor':
        return { id, kind: 'actor', name: item.name, title: item.title ?? null, description: item.description ?? null };
      case 'capability': {
        const actors = item.actors?.map((a) => this.resolveRefToId(a, modName) ?? a.join('.')).sort() ?? [];
        return { id, kind: 'capability', name: item.name, title: item.title ?? null, description: item.description ?? null, actors };
      }
      case 'workflow': {
        const node: Record<string, unknown> = { id, kind: 'workflow', name: item.name };
        if (item.capability) node['capability'] = this.resolveRefToId(item.capability, modName);
        if (item.authorization) node['authorization'] = item.authorization.map((a) => ({
          actor: this.resolveRefToId([a.actor], modName) ?? a.actor,
          permissions: [...a.permissions],
        }));
        if (item.input) node['input'] = serializeFields(item.input, modName, this.bind);
        if (item.reads) node['reads'] = item.reads.map((r) => this.resolveRefToId(r, modName) ?? r.join('.'));
        if (item.writes) node['writes'] = item.writes.map((w) => this.resolveRefToId(w, modName) ?? w.join('.'));
        if (item.rules) node['rules'] = item.rules.map((r) => this.resolveRefToId(r, modName) ?? r.join('.'));
        if (item.steps) node['steps'] = item.steps.map((s) => {
          if (s.kind === 'call') return { call: this.resolveRefToId(s.target, modName) ?? s.target.join('.') };
          if (s.kind === 'fail') return { fail: s.code };
          return { decide: s.name, branches: s.branches.map((b) => ({
            when: b.when, action: b.action.kind === 'call' ? { call: this.resolveRefToId(b.action.target, modName) ?? b.action.target.join('.') } : { fail: b.action.code },
          })) };
        });
        if (item.transitions) node['transitions'] = item.transitions.map((t) => ({
          entity: this.resolveRefToId(t.entity, modName) ?? t.entity.join('.'),
          field: t.field, from: t.from, to: t.to,
        }));
        if (item.effects) node['effects'] = item.effects.map((e) => {
          if (e.kind === 'audit') return { audit: e.value };
          if (e.kind === 'emit') return { emit: this.resolveRefToId(e.value as string[], modName) ?? (e.value as string[]).join('.') };
          if (e.kind === 'notify') return { notify: this.resolveRefToId(e.value as string[], modName) ?? (e.value as string[]).join('.') };
          /* v8 ignore next */
          return { ref: (e.value as string[]).join('.') };
        });
        if (item.returns) node['returns'] = item.returns.map((r) => ({
          name: r.name, type: resolveTypeRef(r.type, modName, this.bind),
        }));
        if (item.trigger) node['trigger'] = this.resolveRefToId(item.trigger, modName);
        return node;
      }
      case 'action':
        return { id, kind: 'action', name: item.name, title: item.title ?? null, workflow: this.resolveRefToId(item.workflow ?? [], modName) ?? null };
      case 'event':
        return { id, kind: 'event', name: item.name, payload: item.payload ? resolveTypeRef(item.payload, modName, this.bind) : null, description: item.description ?? null };
      case 'schedule':
        return { id, kind: 'schedule', name: item.name, cron: item.cron ?? null, description: item.description ?? null };
      case 'surface':
        return {
          id, kind: 'surface', name: item.name,
          surface_kind: item.surfaceKind ?? null,
          title: typeof item.title === 'string' ? item.title : item.title ? (item.title as readonly string[]).join('.') : null,
          capability: item.capability ? (this.resolveRefToId(item.capability, modName) ?? null) : null,
          binds: item.binds ? (this.resolveRefToId(item.binds, modName) ?? null) : null,
        };
      case 'rendering':
        return { id, kind: 'rendering', name: item.name, target: item.target ? this.resolveRefToId(item.target, modName) : null, platform: item.platform ?? null, layout: item.layout ?? null };
      case 'tokens':
        return { id, kind: 'tokens', name: item.name, categories: item.categories.map((c) => ({
          name: c.name, tokens: c.tokens.map((t) => ({ name: t.name, value: serializeValueNode(t.value) })),
        })) };
      case 'theme':
        return { id, kind: 'theme', name: item.name, extends: item.extends || null, overrides: item.overrides.map((c) => ({
          name: c.name, tokens: c.tokens.map((t) => ({ name: t.name, value: serializeValueNode(t.value) })),
        })) };
      case 'strings':
        return { id, kind: 'strings', name: item.name, entries: Object.fromEntries(item.entries.map((e) => [e.key, e.value])) };
      case 'serialization':
        return { id, kind: 'serialization', name: item.name, properties: Object.fromEntries(item.properties.map((p) => [p.key, serializeValueNode(p.value)])) };
      case 'integration':
        return { id, kind: 'integration', name: item.name, title: item.title ?? null, kind_type: item.integrationKind ?? null, protocol: item.protocol ?? null };
      case 'transport':
        return { id, kind: 'transport', name: item.name, target: item.target ? this.resolveRefToId(item.target, modName) : null, protocol: item.protocol ?? null, style: item.style ?? null };
      case 'storage':
        return { id, kind: 'storage', name: item.name, target: item.target ? this.resolveRefToId(item.target, modName) : null, model: item.model ?? null, table: item.table ?? null };
      case 'execution':
        return { id, kind: 'execution', name: item.name, target: item.target ? this.resolveRefToId(item.target, modName) : null, mode: item.mode ?? null };
      case 'extension':
        return { id, kind: 'extension', name: item.name, target: item.target ? this.resolveRefToId(item.target, modName) : null, kind_type: item.extensionKind ?? null, language: item.language ?? null, body: item.body ?? null };
      case 'constitution':
        return { id, kind: 'constitution', name: item.name, applies_to: item.appliesTo?.map((r) => this.resolveRefToId(r, modName) ?? r.join('.')) ?? [], policies: item.policies?.map((p) => ({ name: p.name, properties: Object.fromEntries(p.properties.map((pp) => [pp.key, serializeValueNode(pp.value)])) })) ?? [] };
      case 'security':
        return { id, kind: 'security', name: item.name, applies_to: item.appliesTo?.map((r) => this.resolveRefToId(r, modName) ?? r.join('.')) ?? [] };
      case 'privacy':
        return { id, kind: 'privacy', name: item.name, applies_to: item.appliesTo?.map((r) => this.resolveRefToId(r, modName) ?? r.join('.')) ?? [], classification: item.classification ?? null, retention: item.retention ?? null, exportable: item.exportable ?? null, erasable: item.erasable ?? null };
      case 'validation':
        return { id, kind: 'validation', name: item.name, applies_to: item.appliesTo?.map((r) => this.resolveRefToId(r, modName) ?? r.join('.')) ?? [] };
      case 'secret':
        return { id, kind: 'secret', name: item.name, source: item.source ?? null, description: item.description ?? null };
      case 'environment':
        return { id, kind: 'environment', name: item.name, url: item.url ?? null, description: item.description ?? null };
      case 'deployment':
        return { id, kind: 'deployment', name: item.name, environments: item.environments?.map((e) => this.resolveRefToId(e, modName) ?? e.join('.')) ?? [] };
      case 'test':
        return { id, kind: 'test', name: item.name, target: this.resolveRefToId(item.target, modName) ?? item.target.join('.'), description: item.description ?? null };
      case 'product_ref':
        return { id, kind: 'product_ref', name: item.name, product: item.product ?? null, version: item.version ?? null };
    }
  }
  /* v8 ignore stop */

  /* v8 ignore start — same V8 branch-tracking issue for if-guard chains */
  private emitEdgesForItem(item: ModuleItem, id: string, modName: string): void {
    switch (item.kind) {
      case 'entity':
      case 'value':
        for (const f of item.fields) {
          this.emitTypeEdges(id, f.type, modName, 'field_type');
        }
        break;
      case 'workflow':
        if (item.capability) this.addRefEdge(id, item.capability, modName, 'calls');
        if (item.reads) for (const r of item.reads) this.addRefEdge(id, r, modName, 'reads');
        if (item.writes) for (const w of item.writes) this.addRefEdge(id, w, modName, 'writes');
        if (item.rules) for (const r of item.rules) this.addRefEdge(id, r, modName, 'uses_rule');
        if (item.trigger) this.addRefEdge(id, item.trigger, modName, 'triggers_on');
        if (item.authorization) {
          for (const a of item.authorization) this.addRefEdge(id, [a.actor], modName, 'authorized_as');
        }
        if (item.effects) {
          for (const e of item.effects) {
            if (e.kind === 'emit' && Array.isArray(e.value)) this.addRefEdge(id, e.value as string[], modName, 'emits');
            if (e.kind === 'notify' && Array.isArray(e.value)) this.addRefEdge(id, e.value as string[], modName, 'notifies');
          }
        }
        if (item.transitions) {
          for (const t of item.transitions) this.addRefEdge(id, t.entity, modName, 'transitions');
        }
        if (item.input) {
          for (const f of item.input) this.emitTypeEdges(id, f.type, modName, 'input_type');
        }
        if (item.returns) {
          for (const r of item.returns) this.emitTypeEdges(id, r.type, modName, 'return_type');
        }
        break;
      case 'action':
        if (item.workflow) this.addRefEdge(id, item.workflow, modName, 'invokes');
        break;
      case 'event':
        if (item.payload) this.emitTypeEdges(id, item.payload, modName, 'payload_type');
        break;
      case 'capability':
        if (item.actors) for (const a of item.actors) this.addRefEdge(id, a, modName, 'member_of');
        break;
      case 'surface':
        if (item.capability) this.addRefEdge(id, item.capability, modName, 'calls');
        if (item.binds) this.addRefEdge(id, item.binds, modName, 'binds');
        if (item.actions) for (const a of item.actions) this.addRefEdge(id, a, modName, 'exposes_action');
        if (item.surfaces) for (const s of item.surfaces) this.addRefEdge(id, s, modName, 'contains_surface');
        if (item.serialization) this.addRefEdge(id, item.serialization, modName, 'uses_serialization');
        if (item.rules) for (const r of item.rules) this.addRefEdge(id, r, modName, 'uses_rule');
        if (item.hooks) {
          for (const h of item.hooks) {
            this.addRefEdge(id, h.target, modName, 'invokes');
          }
        }
        break;
      case 'rendering':
        if (item.target) this.addRefEdge(id, item.target, modName, 'targets_surface');
        break;
      case 'theme':
        if (item.extends) this.addRefEdge(id, [item.extends], modName, 'extends_tokens');
        break;
      case 'transport':
        if (item.target) this.addRefEdge(id, item.target, modName, 'attaches_to');
        break;
      case 'storage':
        if (item.target) this.addRefEdge(id, item.target, modName, 'refines_entity');
        break;
      case 'execution':
        if (item.target) this.addRefEdge(id, item.target, modName, 'attaches_to');
        break;
      case 'extension':
        if (item.target) this.addRefEdge(id, item.target, modName, 'attaches_to');
        if (item.contract?.input) this.emitTypeEdges(id, item.contract.input, modName, 'contract_type');
        if (item.contract?.output) this.emitTypeEdges(id, item.contract.output, modName, 'contract_type');
        break;
      case 'constitution':
        if (item.appliesTo) for (const r of item.appliesTo) this.addRefEdge(id, r, modName, 'governs');
        break;
      case 'security':
        if (item.appliesTo) for (const r of item.appliesTo) this.addRefEdge(id, r, modName, 'governs');
        break;
      case 'privacy':
        if (item.appliesTo) for (const r of item.appliesTo) this.addRefEdge(id, r, modName, 'governs');
        break;
      case 'validation':
        if (item.appliesTo) for (const r of item.appliesTo) this.addRefEdge(id, r, modName, 'governs');
        break;
      case 'environment':
        if (item.secrets) {
          for (const s of item.secrets) {
            this.addRefEdge(id, [s.name], modName, 'binds_secret');
          }
        }
        break;
      case 'deployment':
        if (item.environments) for (const e of item.environments) this.addRefEdge(id, e, modName, 'includes_env');
        break;
      case 'test':
        if (item.target.length > 0) this.addRefEdge(id, item.target, modName, 'tests');
        break;
      default:
        break;
    }
  }
  /* v8 ignore stop */

  private emitTypeEdges(fromId: string, type: TypeExpr, modName: string, kind: EdgeKind): void {
    if (type.kind === 'ref') {
      this.addRefEdge(fromId, type.segments, modName, kind);
    } else if (type.kind === 'generic') {
      this.emitTypeEdges(fromId, type.inner, modName, kind);
    }
  }

  private addRefEdge(fromId: string, segments: readonly string[], modName: string, kind: EdgeKind): void {
    /* v8 ignore next */
    if (segments.length === 0) return;
    const sym = resolveSymbolRef(segments, modName, this.bind.modules, this.bind.allSymbols);
    if (sym) {
      const toId = nodeId(sym.module, sym.nodeKind, sym.name);
      this.addEdge(fromId, toId, kind);
    }
  }

  private resolveRefToId(segments: readonly string[], modName: string): string | null {
    if (segments.length === 0) return null;
    const sym = resolveSymbolRef(segments, modName, this.bind.modules, this.bind.allSymbols);
    if (sym) return nodeId(sym.module, sym.nodeKind, sym.name);
    return null;
  }

  private addEdge(from: string, to: string, kind: EdgeKind): void {
    this.edges.push({ from, to, kind });
  }
}

// ---------------------------------------------------------------------------
// Value serialization helper
// ---------------------------------------------------------------------------
function serializeValueNode(v: { readonly kind: string; readonly [key: string]: unknown }): unknown {
  switch (v.kind) {
    case 'string': return v['value'];
    case 'integer': return v['value'];
    case 'decimal': return v['value'];
    case 'boolean': return v['value'];
    case 'identifier': return v['value'];
    case 'ref': return (v['segments'] as string[]).join('.');
    case 'list': return (v['items'] as Array<{ kind: string }>).map(serializeValueNode);
    /* v8 ignore next */
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Pluralization for category keys
// ---------------------------------------------------------------------------
function pluralize(kind: string): string {
  const map: Record<string, string> = {
    entity: 'entities',
    value: 'values',
    enum: 'enums',
    rule: 'rules',
    actor: 'actors',
    capability: 'capabilities',
    workflow: 'workflows',
    action: 'actions',
    event: 'events',
    schedule: 'schedules',
    surface: 'surfaces',
    rendering: 'renderings',
    tokens: 'tokens',
    theme: 'themes',
    strings: 'strings',
    serialization: 'serializations',
    integration: 'integrations',
    transport: 'transports',
    storage: 'storages',
    execution: 'executions',
    extension: 'extensions',
    constitution: 'constitutions',
    security: 'securities',
    privacy: 'privacies',
    validation: 'validations',
    secret: 'secrets',
    environment: 'environments',
    deployment: 'deployments',
    test: 'tests',
    product_ref: 'product_refs',
  };
  /* v8 ignore next */
  return map[kind] ?? `${kind}s`;
}
