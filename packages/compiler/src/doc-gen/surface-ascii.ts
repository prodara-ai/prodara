// ---------------------------------------------------------------------------
// Prodara Compiler — Doc-Gen Surface ASCII Art
// ---------------------------------------------------------------------------
// Renders ASCII art representations of surface and rendering nodes.

import { humanize } from './format-helpers.js';
import type { SurfaceNode, RenderingNode } from './doc-gen-types.js';

const KIND_ICONS: Record<string, string> = {
  view: '📋',
  form: '📝',
  dashboard: '📊',
  api: '🔌',
  modal: '💬',
  list: '📃',
};

// ---------------------------------------------------------------------------
// Surface ASCII art
// ---------------------------------------------------------------------------

/**
 * Render an ASCII art box for a surface, optionally enriched with
 * rendering layout info.
 */
export function renderSurfaceAscii(
  surface: SurfaceNode,
  rendering: RenderingNode | null,
  resolveString: (ref: string | null) => string | null,
  actions: string[],
): string[] {
  const title = resolveString(surface.title) ?? humanize(surface.name);
  /* v8 ignore next 4 -- fallbacks for uncommon surface kinds */
  const kind = surface.surface_kind ?? 'view';
  const icon = KIND_ICONS[kind] ?? '📋';
  const bindsName = surface.binds
    ? surface.binds.split('.').pop() ?? surface.binds
    : null;

  const lines: string[] = [];
  lines.push('```');

  if (rendering?.layout === 'grid') {
    lines.push(...renderGridBox(title, rendering, kind, icon, bindsName));
  } else {
    lines.push(...renderSimpleBox(title, kind, icon, bindsName, actions));
  }

  lines.push('```');
  return lines;
}

// ---------------------------------------------------------------------------
// Simple box (no grid)
// ---------------------------------------------------------------------------

function renderSimpleBox(
  title: string,
  kind: string,
  icon: string,
  bindsName: string | null,
  actions: string[],
): string[] {
  const contentLines: string[] = [];
  contentLines.push(`${icon}  ${title}`);
  const kindBinds = bindsName ? `Kind: ${kind} · Binds: ${bindsName}` : `Kind: ${kind}`;
  contentLines.push(kindBinds);

  if (actions.length > 0) {
    contentLines.push(`Actions: [ ${actions.join(' | ')} ]`);
  }

  return drawBox(contentLines);
}

// ---------------------------------------------------------------------------
// Grid box (with rendering layout info)
// ---------------------------------------------------------------------------

function renderGridBox(
  title: string,
  rendering: RenderingNode,
  kind: string,
  icon: string,
  bindsName: string | null,
): string[] {
  const lines: string[] = [];
  const platform = rendering.platform ?? 'web';
  const header = `${icon}  ${title} (${platform} · grid)`;

  // We don't have column details in the simplified rendering node
  // but we can show the layout type
  const contentLines = [header];
  const kindBinds = bindsName ? `Kind: ${kind} · Binds: ${bindsName}` : `Kind: ${kind}`;
  contentLines.push(kindBinds);
  contentLines.push(`Layout: grid`);

  lines.push(...drawBox(contentLines));
  return lines;
}

// ---------------------------------------------------------------------------
// Box drawing
// ---------------------------------------------------------------------------

function drawBox(contentLines: string[]): string[] {
  const maxLen = Math.max(...contentLines.map(l => l.length), 30);
  const width = maxLen + 4;
  const lines: string[] = [];

  lines.push(`┌${'─'.repeat(width)}┐`);
  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i]!;
    lines.push(`│  ${line.padEnd(maxLen + 2)}│`);
    if (i === 0) {
      lines.push(`│  ${'─'.repeat(maxLen + 2)}│`);
    }
  }
  lines.push(`└${'─'.repeat(width)}┘`);

  return lines;
}
