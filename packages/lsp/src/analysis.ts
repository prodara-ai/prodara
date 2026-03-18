// ---------------------------------------------------------------------------
// Prodara LSP — Analysis (pure functions, no connection dependency)
// ---------------------------------------------------------------------------

import {
  SymbolKind,
  DiagnosticSeverity,
  type DocumentSymbol,
  type Diagnostic,
} from 'vscode-languageserver/node.js';
import { BLOCK_DECLARATIONS } from './keywords.js';

// ---------------------------------------------------------------------------
// Bracket / brace validation
// ---------------------------------------------------------------------------

/** Validate PRD text for structural errors (unmatched braces/brackets). */
export function validateText(text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  let braceDepth = 0;
  let bracketDepth = 0;
  let inString = false;
  let inComment = false;
  let lastOpenBraceLine = 0;
  let lastOpenBracketLine = 0;

  const lines = text.split('\n');
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];

      if (inComment) continue;

      // Count consecutive backslashes preceding this character
      let backslashes = 0;
      for (let k = col - 1; k >= 0 && line[k] === '\\'; k--) backslashes++;

      if (ch === '"' && backslashes % 2 === 0) {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === '/' && col + 1 < line.length && line[col + 1] === '/') {
        inComment = true;
        continue;
      }

      if (ch === '{') { braceDepth++; lastOpenBraceLine = lineIdx; }
      if (ch === '}') braceDepth--;
      if (ch === '[') { bracketDepth++; lastOpenBracketLine = lineIdx; }
      if (ch === ']') bracketDepth--;

      if (braceDepth < 0) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: { start: { line: lineIdx, character: col }, end: { line: lineIdx, character: col + 1 } },
          message: 'Unmatched closing brace',
          source: 'prodara',
        });
        braceDepth = 0;
      }
      if (bracketDepth < 0) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: { start: { line: lineIdx, character: col }, end: { line: lineIdx, character: col + 1 } },
          message: 'Unmatched closing bracket',
          source: 'prodara',
        });
        bracketDepth = 0;
      }
    }
    inComment = false;
  }

  if (braceDepth > 0) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: { start: { line: lastOpenBraceLine, character: 0 }, end: { line: lastOpenBraceLine, character: 1 } },
      message: 'Unclosed brace',
      source: 'prodara',
    });
  }
  if (bracketDepth > 0) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: { start: { line: lastOpenBracketLine, character: 0 }, end: { line: lastOpenBracketLine, character: 1 } },
      message: 'Unclosed bracket',
      source: 'prodara',
    });
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Symbol extraction
// ---------------------------------------------------------------------------

/** Extract document symbols (product, module, entity, etc.) from PRD text. */
export function extractSymbols(text: string): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  const lines = text.split('\n');
  const blockKw = new Set<string>(BLOCK_DECLARATIONS);
  const regex = /^\s*(\w+)\s+(\w+)\s*\{/;

  for (let i = 0; i < lines.length; i++) {
    const match = regex.exec(lines[i]);
    if (match && blockKw.has(match[1])) {
      const keyword = match[1];
      const name = match[2];
      const kind = declKindToSymbolKind(keyword);
      symbols.push({
        name,
        detail: keyword,
        kind,
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: lines[i].length },
        },
        selectionRange: {
          start: { line: i, character: lines[i].indexOf(name) },
          end: { line: i, character: lines[i].indexOf(name) + name.length },
        },
      });
    }
  }

  return symbols;
}

/** Map a PRD declaration keyword to a language-server SymbolKind. */
export function declKindToSymbolKind(keyword: string): SymbolKind {
  switch (keyword) {
    case 'product': return SymbolKind.Package;
    case 'module': return SymbolKind.Module;
    case 'entity': return SymbolKind.Class;
    case 'enum': return SymbolKind.Enum;
    case 'value': return SymbolKind.Struct;
    case 'actor': return SymbolKind.Interface;
    case 'workflow': return SymbolKind.Function;
    case 'action': return SymbolKind.Method;
    case 'event': return SymbolKind.Event;
    case 'test': return SymbolKind.Boolean;
    default: return SymbolKind.Variable;
  }
}
