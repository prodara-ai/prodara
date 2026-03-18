// ---------------------------------------------------------------------------
// Prodara LSP — Semantic Analysis
// ---------------------------------------------------------------------------
// Deep analysis using the compiler's parser and binder for hover, go-to-def,
// find-references, and full compiler diagnostics.

import {
  DiagnosticSeverity as LspSeverity,
  type Diagnostic as LspDiagnostic,
  type Hover,
  type Location,
  type Position,
} from 'vscode-languageserver/node.js';
import {
  Parser,
  SourceFile,
  bind,
  resolveSymbolRef,
  checkTypes,
  validate,
  DiagnosticBag,
} from '@prodara/compiler';
import type {
  AstFile,
  BindResult,
  Symbol as PrdSymbol,
  TypeExpr,
} from '@prodara/compiler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SemanticModel {
  readonly files: readonly AstFile[];
  readonly bindResult: BindResult;
  readonly diagnostics: readonly LspDiagnostic[];
  readonly texts: ReadonlyMap<string, string>;
}

// ---------------------------------------------------------------------------
// Build a semantic model from a set of document texts
// ---------------------------------------------------------------------------

export function buildSemanticModel(
  documents: ReadonlyMap<string, string>,
): SemanticModel {
  const files: AstFile[] = [];
  const bag = new DiagnosticBag();
  const texts = new Map<string, string>();

  for (const [uri, text] of documents) {
    const filePath = uriToPath(uri);
    texts.set(filePath, text);
    const source = new SourceFile(filePath, text);
    const parser = new Parser(source, bag);
    files.push(parser.parse());
  }

  const bindResult = bind(files);
  bag.merge(bindResult.bag);

  const checkResult = checkTypes(files, bindResult);
  bag.merge(checkResult.bag);

  const validateResult = validate(files, bindResult);
  bag.merge(validateResult.bag);

  const diagnostics = convertDiagnostics(bag);

  return { files, bindResult, diagnostics, texts };
}

// ---------------------------------------------------------------------------
// Hover — show declaration info on hover
// ---------------------------------------------------------------------------

export function getHoverInfo(
  model: SemanticModel,
  uri: string,
  position: Position,
): Hover | null {
  const filePath = uriToPath(uri);
  const resolved = resolveAtPosition(model, filePath, position);
  if (!resolved) return null;

  const sym = resolved;
  const decl = sym.declaration;

  const lines: string[] = [];
  lines.push(`**${sym.nodeKind}** \`${sym.qualifiedName}\``);
  lines.push('');

  if ('title' in decl && decl.title) {
    lines.push(`*${String(decl.title)}*`);
  }
  if ('description' in decl && decl.description) {
    lines.push(String(decl.description));
  }
  if ('fields' in decl && Array.isArray(decl.fields) && decl.fields.length > 0) {
    lines.push('');
    lines.push('**Fields:**');
    for (const field of decl.fields) {
      lines.push(`- \`${field.name}\`: ${formatTypeExpr(field.type)}`);
    }
  }
  if ('members' in decl && Array.isArray(decl.members) && decl.members.length > 0) {
    lines.push('');
    lines.push('**Members:**');
    for (const member of decl.members) {
      lines.push(`- \`${member.name}\``);
    }
  }
  if (decl.kind === 'workflow') {
    if (decl.reads && decl.reads.length > 0) {
      lines.push(`**Reads:** ${decl.reads.map((r: readonly string[]) => r.join('.')).join(', ')}`);
    }
    if (decl.writes && decl.writes.length > 0) {
      lines.push(`**Writes:** ${decl.writes.map((w: readonly string[]) => w.join('.')).join(', ')}`);
    }
    if (decl.authorization && decl.authorization.length > 0) {
      lines.push(`**Authorization:** ${decl.authorization.map((a: { actor: string; permissions: readonly string[] }) => `${a.actor}: [${a.permissions.join(', ')}]`).join('; ')}`);
    }
    if (decl.transitions && decl.transitions.length > 0) {
      lines.push(`**Transitions:** ${decl.transitions.map((t: { entity: readonly string[]; field: string; from: string; to: string }) => `${t.entity.join('.')}.${t.field}: ${t.from} → ${t.to}`).join(', ')}`);
    }
  }

  lines.push('');
  lines.push(`*Defined in ${sym.file}:${sym.line}*`);

  return {
    contents: { kind: 'markdown', value: lines.join('\n') },
  };
}

// ---------------------------------------------------------------------------
// Go to Definition
// ---------------------------------------------------------------------------

export function getDefinitionLocation(
  model: SemanticModel,
  uri: string,
  position: Position,
): Location | null {
  const filePath = uriToPath(uri);
  const sym = resolveAtPosition(model, filePath, position);
  if (!sym) return null;

  return {
    uri: pathToUri(sym.file),
    range: {
      start: { line: sym.line - 1, character: sym.column - 1 },
      end: { line: sym.line - 1, character: sym.column - 1 + sym.name.length },
    },
  };
}

// ---------------------------------------------------------------------------
// Find References
// ---------------------------------------------------------------------------

export function findReferences(
  model: SemanticModel,
  uri: string,
  position: Position,
): Location[] {
  const filePath = uriToPath(uri);
  const target = resolveAtPosition(model, filePath, position);
  if (!target) return [];

  const locations: Location[] = [];

  for (const file of model.files) {
    const text = model.texts.get(file.path);
    /* v8 ignore next -- all files in model.texts are present */
    if (!text) continue;

    const lines = text.split('\n');
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      let col = 0;
      while (col < line.length) {
        const idx = line.indexOf(target.name, col);
        if (idx === -1) break;

        const before = idx > 0 ? line[idx - 1] : ' ';
        const after = idx + target.name.length < line.length ? line[idx + target.name.length] : ' ';
        if (isWordChar(before) || isWordChar(after)) {
          col = idx + 1;
          continue;
        }

        locations.push({
          uri: pathToUri(file.path),
          range: {
            start: { line: lineIdx, character: idx },
            end: { line: lineIdx, character: idx + target.name.length },
          },
        });
        col = idx + target.name.length;
      }
    }
  }

  return locations;
}

// ---------------------------------------------------------------------------
// Document semantic diagnostics
// ---------------------------------------------------------------------------

export function getSemanticDiagnosticsForFile(model: SemanticModel, uri: string): LspDiagnostic[] {
  const filePath = uriToPath(uri);
  return model.diagnostics.filter(d => {
    const data = d.data as { file?: string } | undefined;
    return data?.file === filePath;
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function convertDiagnostics(bag: DiagnosticBag): LspDiagnostic[] {
  const result: LspDiagnostic[] = [];
  for (const d of bag.all) {
    /* v8 ignore next 4 -- compiler only emits error-severity diagnostics */
    const severity =
      d.severity === 'error' ? LspSeverity.Error :
      d.severity === 'warning' ? LspSeverity.Warning :
      LspSeverity.Information;

    result.push({
      severity,
      range: {
        /* v8 ignore next 2 -- compiler diagnostics always have line/column */
        start: { line: Math.max(0, (d.line ?? 1) - 1), character: Math.max(0, (d.column ?? 1) - 1) },
        end: { line: Math.max(0, (d.endLine ?? d.line ?? 1) - 1), character: Math.max(0, (d.endColumn ?? d.column ?? 1) - 1) },
      },
      message: `${d.code}: ${d.message}`,
      source: 'prodara',
      data: { file: d.file, code: d.code },
    });
  }
  return result;
}

function resolveAtPosition(
  model: SemanticModel,
  filePath: string,
  position: Position,
): PrdSymbol | null {
  const text = model.texts.get(filePath);
  if (!text) return null;

  const lines = text.split('\n');
  if (position.line >= lines.length) return null;

  const line = lines[position.line];
  if (position.character >= line.length) return null;

  const segments = extractQualifiedName(line, position.character);
  if (segments.length === 0) return null;

  const moduleName = findModuleForPosition(model, filePath, position);
  if (!moduleName) return null;

  return resolveSymbolRef(
    segments,
    moduleName,
    model.bindResult.modules,
    model.bindResult.allSymbols,
  );
}

function findModuleForPosition(model: SemanticModel, filePath: string, position: Position): string | null {
  for (const file of model.files) {
    if (file.path !== filePath) continue;
    for (const decl of file.declarations) {
      if (decl.kind === 'module') {
        if (position.line + 1 >= decl.location.line && position.line + 1 <= decl.location.endLine) {
          return decl.name;
        }
      }
    }
    // Fallback: first module in the file
    for (const decl of file.declarations) {
      if (decl.kind === 'module') return decl.name;
    }
  }
  return null;
}

function extractQualifiedName(line: string, col: number): string[] {
  let start = col;
  while (start > 0 && (isWordChar(line[start - 1]) || line[start - 1] === '.')) start--;
  let end = col;
  while (end < line.length && (isWordChar(line[end]) || line[end] === '.')) end++;

  const fullName = line.slice(start, end);
  return fullName.split('.').filter(s => s.length > 0);
}

function isWordChar(ch: string): boolean {
  return /[a-zA-Z0-9_]/.test(ch);
}

function formatTypeExpr(type: TypeExpr): string {
  switch (type.kind) {
    case 'primitive': return type.name;
    case 'ref': return type.segments.join('.');
    case 'generic': return `${type.wrapper}<${formatTypeExpr(type.inner)}>`;
    /* v8 ignore next -- exhaustive: TypeExpr is always primitive | ref | generic */
    default: return 'unknown';
  }
}

export function uriToPath(uri: string): string {
  if (uri.startsWith('file://')) {
    return decodeURIComponent(uri.replace('file://', ''));
  }
  return uri;
}

export function pathToUri(filePath: string): string {
  if (filePath.startsWith('file://')) return filePath;
  return `file://${encodeURI(filePath)}`;
}
