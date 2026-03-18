// ---------------------------------------------------------------------------
// Prodara Compiler — Doc-Gen Section Renderers
// ---------------------------------------------------------------------------
// Individual section rendering functions. Each returns string[] (lines).
// Follows the governance module's line-accumulation pattern.

import type { ModuleNode, GraphEdge, GraphTypeRef } from '../graph/graph-types.js';
import { section, renderTable, formatTypeRef, humanize, getArrayProp, shortName } from './format-helpers.js';
import { renderEntityErDiagram, renderWorkflowFlowchart } from './mermaid-renderers.js';
import { renderSurfaceAscii } from './surface-ascii.js';
import type {
  ActorNode, CapabilityNode, EntityNode, ValueNode, EnumNode,
  RuleNode, WorkflowNode, ActionNode, EventNode, ScheduleNode,
  SurfaceNode, RenderingNode, TokensNode, StorageNode,
  SecurityNode, PrivacyNode, TestNode,
} from './doc-gen-types.js';

// ---------------------------------------------------------------------------
// Render context — passed to every section renderer
// ---------------------------------------------------------------------------

export interface SectionContext {
  readonly mod: ModuleNode;
  readonly edges: readonly GraphEdge[];
  readonly resolveString: (ref: string | null) => string | null;
  readonly resolveLink: (nodeId: string, fromModule: string) => string;
}

// ---------------------------------------------------------------------------
// Actors & Capabilities
// ---------------------------------------------------------------------------

export function renderActorsSection(ctx: SectionContext): string[] {
  const actors = getArrayProp<ActorNode>(ctx.mod, 'actors');
  const capabilities = getArrayProp<CapabilityNode>(ctx.mod, 'capabilities');
  if (actors.length === 0 && capabilities.length === 0) return [];

  const lines = [...section('Actors & Capabilities')];

  if (actors.length > 0) {
    lines.push(...renderTable(
      ['Actor', 'Description'],
      actors.map(a => [
        `**${humanize(a.name)}**`,
        a.description ?? a.title ?? '—',
      ]),
    ));
    lines.push('');
  }

  if (capabilities.length > 0) {
    lines.push(...section('Capabilities', 3));
    lines.push(...renderTable(
      ['Capability', 'Description', 'Actors'],
      capabilities.map(c => [
        `**${humanize(c.name)}**`,
        /* v8 ignore next -- capability always has description */
        c.description ?? c.title ?? '—',
        c.actors.map(a => shortName(a)).join(', ') || '—',
      ]),
    ));
    lines.push('');
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Domain Model
// ---------------------------------------------------------------------------

export function renderDomainSection(ctx: SectionContext): string[] {
  const entities = getArrayProp<EntityNode>(ctx.mod, 'entities');
  const enums = getArrayProp<EnumNode>(ctx.mod, 'enums');
  const values = getArrayProp<ValueNode>(ctx.mod, 'values');
  if (entities.length === 0 && enums.length === 0 && values.length === 0) return [];

  const lines = [...section('Domain Model')];

  // Mermaid ER diagram
  const er = renderEntityErDiagram(ctx.mod, ctx.edges);
  if (er.length > 0) {
    lines.push(...er);
    lines.push('');
  }

  // Entity tables
  for (const entity of entities) {
    lines.push(...section(`Entity: ${humanize(entity.name)}`, 3));
    lines.push(...renderTable(
      ['Field', 'Type'],
      entity.fields.map(f => [
        `\`${f.name}\``,
        formatTypeDisplay(f.type, ctx),
      ]),
    ));
    lines.push('');
  }

  // Value objects
  for (const value of values) {
    lines.push(...section(`Value: ${humanize(value.name)}`, 3));
    lines.push(...renderTable(
      ['Field', 'Type'],
      value.fields.map(f => [
        `\`${f.name}\``,
        formatTypeDisplay(f.type, ctx),
      ]),
    ));
    lines.push('');
  }

  // Enums
  for (const en of enums) {
    lines.push(...section(`Enum: ${humanize(en.name)}`, 3));
    for (const member of en.members) {
      lines.push(`- \`${member.name}\``);
    }
    lines.push('');
  }

  return lines;
}

function formatTypeDisplay(type: GraphTypeRef, ctx: SectionContext): string {
  if (typeof type === 'string') return `\`${type}\``;
  if ('ref' in type) return ctx.resolveLink(type.ref, ctx.mod.name);
  /* v8 ignore next -- generic type display */
  if ('generic' in type) return `\`${formatTypeRef(type)}\``;
  /* v8 ignore next 2 -- exhaustive check */
  return `\`${String(type)}\``;
}

// ---------------------------------------------------------------------------
// Business Rules
// ---------------------------------------------------------------------------

export function renderRulesSection(ctx: SectionContext): string[] {
  const rules = getArrayProp<RuleNode>(ctx.mod, 'rules');
  if (rules.length === 0) return [];

  const lines = [...section('Business Rules')];
  lines.push(...renderTable(
    ['Rule', 'Entity', 'Message'],
    rules.map(r => [
      `**${humanize(r.name)}**`,
      shortName(r.entity),
      /* v8 ignore next -- resolveString fallback */
      ctx.resolveString(r.message) ?? r.message,
    ]),
  ));
  lines.push('');
  return lines;
}

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

export function renderWorkflowsSection(ctx: SectionContext): string[] {
  const workflows = getArrayProp<WorkflowNode>(ctx.mod, 'workflows');
  if (workflows.length === 0) return [];

  const lines = [...section('Workflows')];

  for (const wf of workflows) {
    lines.push(...section(`Workflow: ${humanize(wf.name)}`, 3));

    // Authorization
    if (wf.authorization && wf.authorization.length > 0) {
      lines.push('**Authorization:**');
      for (const auth of wf.authorization) {
        lines.push(`- **${shortName(auth.actor)}**: ${auth.permissions.join(', ')}`);
      }
      lines.push('');
    }

    // Input
    if (wf.input && wf.input.length > 0) {
      lines.push('**Input:**');
      lines.push(...renderTable(
        ['Field', 'Type'],
        wf.input.map(f => [`\`${f.name}\``, formatTypeDisplay(f.type, ctx)]),
      ));
      lines.push('');
    }

    // Reads / Writes
    if (wf.reads && wf.reads.length > 0) {
      lines.push(`**Reads:** ${wf.reads.map(r => ctx.resolveLink(r, ctx.mod.name)).join(', ')}`);
      lines.push('');
    }
    if (wf.writes && wf.writes.length > 0) {
      lines.push(`**Writes:** ${wf.writes.map(w => ctx.resolveLink(w, ctx.mod.name)).join(', ')}`);
      lines.push('');
    }

    // Flowchart
    const flowchart = renderWorkflowFlowchart(wf);
    if (flowchart.length > 0) {
      lines.push(...flowchart);
      lines.push('');
    }

    // Transitions
    if (wf.transitions && wf.transitions.length > 0) {
      lines.push('**Transitions:**');
      for (const t of wf.transitions) {
        lines.push(`- \`${shortName(t.entity)}.${t.field}\`: ${t.from} → ${t.to}`);
      }
      lines.push('');
    }

    // Effects
    if (wf.effects && wf.effects.length > 0) {
      lines.push('**Effects:**');
      for (const effect of wf.effects) {
        /* v8 ignore next -- effect always has entries */
        const [kind, value] = Object.entries(effect)[0] ?? ['effect', 'unknown'];
        lines.push(`- ${kind}: \`${value}\``);
      }
      lines.push('');
    }

    // Returns
    if (wf.returns && wf.returns.length > 0) {
      lines.push('**Returns:**');
      lines.push(...renderTable(
        ['Outcome', 'Type'],
        wf.returns.map(r => [r.name, formatTypeDisplay(r.type, ctx)]),
      ));
      lines.push('');
    }
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function renderActionsSection(ctx: SectionContext): string[] {
  const actions = getArrayProp<ActionNode>(ctx.mod, 'actions');
  if (actions.length === 0) return [];

  const lines = [...section('Actions')];
  lines.push(...renderTable(
    ['Action', 'Title', 'Workflow'],
    actions.map(a => [
      `**${humanize(a.name)}**`,
      ctx.resolveString(a.title) ?? a.title ?? '—',
      a.workflow ? ctx.resolveLink(a.workflow, ctx.mod.name) : '—',
    ]),
  ));
  lines.push('');
  return lines;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function renderEventsSection(ctx: SectionContext): string[] {
  const events = getArrayProp<EventNode>(ctx.mod, 'events');
  if (events.length === 0) return [];

  const lines = [...section('Events')];
  lines.push(...renderTable(
    ['Event', 'Payload', 'Description'],
    events.map(e => [
      `**${humanize(e.name)}**`,
      e.payload ? formatTypeDisplay(e.payload, ctx) : '—',
      ctx.resolveString(e.description) ?? e.description ?? '—',
    ]),
  ));
  lines.push('');
  return lines;
}

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

export function renderSchedulesSection(ctx: SectionContext): string[] {
  const schedules = getArrayProp<ScheduleNode>(ctx.mod, 'schedules');
  if (schedules.length === 0) return [];

  const lines = [...section('Schedules')];
  lines.push(...renderTable(
    ['Schedule', 'Cron', 'Description'],
    schedules.map(s => [
      `**${humanize(s.name)}**`,
      s.cron ? `\`${s.cron}\`` : '—',
      ctx.resolveString(s.description) ?? s.description ?? '—',
    ]),
  ));
  lines.push('');
  return lines;
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function renderSurfacesSection(ctx: SectionContext): string[] {
  const surfaces = getArrayProp<SurfaceNode>(ctx.mod, 'surfaces');
  const renderings = getArrayProp<RenderingNode>(ctx.mod, 'renderings');
  if (surfaces.length === 0 && renderings.length === 0) return [];

  // Build rendering lookup by target
  const renderingByTarget = new Map<string, RenderingNode>();
  for (const r of renderings) {
    if (r.target) renderingByTarget.set(r.target, r);
  }

  const lines = [...section('Surfaces')];

  for (const surface of surfaces) {
    lines.push(...section(`Surface: ${humanize(surface.name)}`, 3));

    // Find matching rendering
    const rendering = renderingByTarget.get(surface.id) ?? null;

    // Resolve actions exposed by this surface
    const actionEdges = ctx.edges.filter(
      e => e.from === surface.id && e.kind === 'exposes_action',
    );
    const actionNames = actionEdges.map(e => shortName(e.to));

    lines.push(...renderSurfaceAscii(surface, rendering, ctx.resolveString, actionNames));
    lines.push('');
  }

  // Standalone renderings (not targeting a listed surface)
  const surfaceIds = new Set(surfaces.map(s => s.id));
  const standaloneRenderings = renderings.filter(r => !r.target || !surfaceIds.has(r.target));
  for (const rendering of standaloneRenderings) {
    lines.push(...section(`Rendering: ${humanize(rendering.name)}`, 3));
    lines.push(`- **Platform:** ${rendering.platform ?? '—'}`);
    lines.push(`- **Layout:** ${rendering.layout ?? '—'}`);
    if (rendering.target) {
      lines.push(`- **Target:** ${ctx.resolveLink(rendering.target, ctx.mod.name)}`);
    }
    lines.push('');
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Design System
// ---------------------------------------------------------------------------

export function renderDesignSection(ctx: SectionContext): string[] {
  const tokens = getArrayProp<TokensNode>(ctx.mod, 'tokens');
  if (tokens.length === 0) return [];

  const lines = [...section('Design System')];

  for (const tokenSet of tokens) {
    lines.push(...section(`Tokens: ${humanize(tokenSet.name)}`, 3));

    for (const cat of tokenSet.categories) {
      lines.push(...section(humanize(cat.name), 4));
      lines.push(...renderTable(
        ['Token', 'Value'],
        cat.tokens.map(t => [
          `\`${t.name}\``,
          formatTokenValue(t.name, t.value),
        ]),
      ));
      lines.push('');
    }
  }

  return lines;
}

function formatTokenValue(name: string, value: unknown): string {
  if (typeof value === 'string') {
    // Color swatch for hex values
    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
      return `\`${value}\` 🎨`;
    }
    return `\`${value}\``;
  }
  if (typeof value === 'number') return `\`${value}\``;
  return `\`${JSON.stringify(value)}\``;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export function renderStorageSection(ctx: SectionContext): string[] {
  const storages = getArrayProp<StorageNode>(ctx.mod, 'storages');
  if (storages.length === 0) return [];

  const lines = [...section('Storage')];
  lines.push(...renderTable(
    ['Storage', 'Target', 'Model', 'Table'],
    storages.map(s => [
      `**${humanize(s.name)}**`,
      s.target ? ctx.resolveLink(s.target, ctx.mod.name) : '—',
      s.model ?? '—',
      s.table ?? '—',
    ]),
  ));
  lines.push('');
  return lines;
}

// ---------------------------------------------------------------------------
// Governance
// ---------------------------------------------------------------------------

export function renderGovernanceSection(ctx: SectionContext): string[] {
  const security = getArrayProp<SecurityNode>(ctx.mod, 'security');
  const privacy = getArrayProp<PrivacyNode>(ctx.mod, 'privacy');
  if (security.length === 0 && privacy.length === 0) return [];

  const lines = [...section('Governance')];

  if (security.length > 0) {
    lines.push(...section('Security Policies', 3));
    for (const s of security) {
      lines.push(`- **${humanize(s.name)}** — applies to: ${s.applies_to.map(a => shortName(a)).join(', ')}`);
    }
    lines.push('');
  }

  if (privacy.length > 0) {
    lines.push(...section('Privacy Policies', 3));
    lines.push(...renderTable(
      ['Policy', 'Classification', 'Retention', 'Exportable', 'Erasable'],
      privacy.map(p => [
        `**${humanize(p.name)}**`,
        p.classification ?? '—',
        p.retention ?? '—',
        p.exportable ?? '—',
        p.erasable ?? '—',
      ]),
    ));
    lines.push('');
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

export function renderTestsSection(ctx: SectionContext): string[] {
  const tests = getArrayProp<TestNode>(ctx.mod, 'tests');
  if (tests.length === 0) return [];

  const lines = [...section('Tests')];
  lines.push(`${tests.length} spec test(s) defined:`);
  lines.push('');
  for (const t of tests) {
    lines.push(`- \`${t.name}\``);
  }
  lines.push('');
  return lines;
}
