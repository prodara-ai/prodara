// ---------------------------------------------------------------------------
// Prodara LSP — Tests
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { SymbolKind } from 'vscode-languageserver/node.js';
import { ModuleCache } from '../src/cache.js';
import { extractSymbols, validateText, declKindToSymbolKind } from '../src/analysis.js';
import { PRD_KEYWORDS, PRD_TYPES, BLOCK_DECLARATIONS } from '../src/keywords.js';
import { DEFAULT_LSP_CONFIG } from '../src/types.js';

// ---------------------------------------------------------------------------
// ModuleCache
// ---------------------------------------------------------------------------

describe('ModuleCache', () => {
  it('stores and retrieves entries', () => {
    const cache = new ModuleCache(10);
    cache.set('file:///a.prd', 1, 'content');
    const entry = cache.get('file:///a.prd');
    expect(entry).toBeDefined();
    expect(entry!.uri).toBe('file:///a.prd');
    expect(entry!.version).toBe(1);
    expect(entry!.text).toBe('content');
  });

  it('returns undefined for missing entries', () => {
    const cache = new ModuleCache(10);
    expect(cache.get('file:///missing.prd')).toBeUndefined();
  });

  it('updates lastAccessed on get', () => {
    const cache = new ModuleCache(10);
    const entry = cache.set('file:///a.prd', 1, 'text');
    entry.lastAccessed = 1; // force a known old time
    cache.get('file:///a.prd');
    expect(entry.lastAccessed).toBeGreaterThan(1);
  });

  it('deletes entries', () => {
    const cache = new ModuleCache(10);
    cache.set('file:///a.prd', 1, 'text');
    expect(cache.delete('file:///a.prd')).toBe(true);
    expect(cache.has('file:///a.prd')).toBe(false);
  });

  it('delete returns false for missing', () => {
    const cache = new ModuleCache(10);
    expect(cache.delete('file:///missing.prd')).toBe(false);
  });

  it('reports size correctly', () => {
    const cache = new ModuleCache(10);
    expect(cache.size).toBe(0);
    cache.set('file:///a.prd', 1, 'a');
    cache.set('file:///b.prd', 1, 'b');
    expect(cache.size).toBe(2);
  });

  it('has checks existence', () => {
    const cache = new ModuleCache(10);
    expect(cache.has('file:///a.prd')).toBe(false);
    cache.set('file:///a.prd', 1, 'text');
    expect(cache.has('file:///a.prd')).toBe(true);
  });

  it('clears all entries', () => {
    const cache = new ModuleCache(10);
    cache.set('file:///a.prd', 1, 'a');
    cache.set('file:///b.prd', 1, 'b');
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('lists keys', () => {
    const cache = new ModuleCache(10);
    cache.set('file:///a.prd', 1, 'a');
    cache.set('file:///b.prd', 1, 'b');
    expect(cache.keys()).toEqual(['file:///a.prd', 'file:///b.prd']);
  });

  it('evicts LRU when exceeding max size', () => {
    const cache = new ModuleCache(2);
    cache.set('file:///a.prd', 1, 'a');
    const entryA = cache.get('file:///a.prd')!;
    entryA.lastAccessed = 1;

    cache.set('file:///b.prd', 1, 'b');
    const entryB = cache.get('file:///b.prd')!;
    entryB.lastAccessed = 2;

    // Adding a third entry should evict 'a' (oldest)
    cache.set('file:///c.prd', 1, 'c');
    expect(cache.size).toBe(2);
    expect(cache.has('file:///a.prd')).toBe(false);
    expect(cache.has('file:///b.prd')).toBe(true);
    expect(cache.has('file:///c.prd')).toBe(true);
  });

  it('throws RangeError for maxSize < 1', () => {
    expect(() => new ModuleCache(0)).toThrow(RangeError);
    expect(() => new ModuleCache(-1)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// validateText
// ---------------------------------------------------------------------------

describe('validateText', () => {
  it('returns no diagnostics for balanced braces', () => {
    const diag = validateText('entity invoice {\n  name: string\n}');
    expect(diag).toEqual([]);
  });

  it('returns no diagnostics for empty text', () => {
    expect(validateText('')).toEqual([]);
  });

  it('reports unmatched closing brace', () => {
    const diag = validateText('}');
    expect(diag).toHaveLength(1);
    expect(diag[0].message).toBe('Unmatched closing brace');
  });

  it('reports unclosed brace', () => {
    const diag = validateText('entity x {');
    expect(diag).toHaveLength(1);
    expect(diag[0].message).toBe('Unclosed brace');
  });

  it('reports unmatched closing bracket', () => {
    const diag = validateText(']');
    expect(diag).toHaveLength(1);
    expect(diag[0].message).toBe('Unmatched closing bracket');
  });

  it('reports unclosed bracket', () => {
    const diag = validateText('values [a, b');
    expect(diag).toHaveLength(1);
    expect(diag[0].message).toBe('Unclosed bracket');
  });

  it('ignores braces inside strings', () => {
    const diag = validateText('name: "has { weird } chars"');
    expect(diag).toEqual([]);
  });

  it('ignores braces inside comments', () => {
    const diag = validateText('// entity x {');
    expect(diag).toEqual([]);
  });

  it('tracks correct line for unmatched brace', () => {
    const text = 'line zero\n}';
    const diag = validateText(text);
    expect(diag[0].range.start.line).toBe(1);
  });

  it('handles escaped quotes in strings', () => {
    const diag = validateText('name: "say \\"hi\\""');
    expect(diag).toEqual([]);
  });

  it('handles escaped backslash before closing quote', () => {
    // Text: path: "c:\\" }   — The \\ is an escaped backslash, quote closes the string
    // Should see only the unmatched closing brace
    const diag = validateText('entity x {\n  path: "c:\\\\" \n}');
    expect(diag).toEqual([]);
  });

  it('ignores comment markers inside strings', () => {
    // "use // not" should not start a comment
    const diag = validateText('desc: "use // not" }');
    expect(diag).toHaveLength(1);
    expect(diag[0].message).toBe('Unmatched closing brace');
  });

  it('reports multiple errors', () => {
    const text = '}\n]';
    const diag = validateText(text);
    expect(diag).toHaveLength(2);
    expect(diag[0].message).toBe('Unmatched closing brace');
    expect(diag[1].message).toBe('Unmatched closing bracket');
  });

  it('handles mixed brackets and braces', () => {
    const diag = validateText('entity x {\n  values [a, b]\n}');
    expect(diag).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// extractSymbols
// ---------------------------------------------------------------------------

describe('extractSymbols', () => {
  it('extracts product declaration', () => {
    const symbols = extractSymbols('product my_app {\n}');
    expect(symbols).toHaveLength(1);
    expect(symbols[0].name).toBe('my_app');
    expect(symbols[0].detail).toBe('product');
  });

  it('extracts module declaration', () => {
    const symbols = extractSymbols('module billing {\n}');
    expect(symbols).toHaveLength(1);
    expect(symbols[0].name).toBe('billing');
    expect(symbols[0].detail).toBe('module');
  });

  it('extracts entity and enum', () => {
    const text = [
      'module billing {',
      '  entity invoice {',
      '  }',
      '  enum status {',
      '  }',
      '}',
    ].join('\n');
    const symbols = extractSymbols(text);
    expect(symbols).toHaveLength(3);
    expect(symbols.map((s) => s.detail)).toContain('entity');
    expect(symbols.map((s) => s.detail)).toContain('enum');
  });

  it('extracts workflow and actor', () => {
    const text = 'actor admin {\n}\nworkflow pay {\n}';
    const symbols = extractSymbols(text);
    expect(symbols).toHaveLength(2);
    expect(symbols[0].name).toBe('admin');
    expect(symbols[0].detail).toBe('actor');
    expect(symbols[1].name).toBe('pay');
    expect(symbols[1].detail).toBe('workflow');
  });

  it('extracts event and test', () => {
    const text = 'event order_placed {\n}\ntest check_order {\n}';
    const symbols = extractSymbols(text);
    expect(symbols).toHaveLength(2);
    expect(symbols.map((s) => s.detail)).toEqual(['event', 'test']);
  });

  it('extracts various block declarations', () => {
    const keywords = ['value', 'capability', 'action', 'surface', 'storage', 'rule', 'schedule', 'integration', 'constitution', 'secret'];
    for (const kw of keywords) {
      const symbols = extractSymbols(`${kw} my_thing {\n}`);
      expect(symbols).toHaveLength(1);
      expect(symbols[0].detail).toBe(kw);
    }
  });

  it('ignores non-block keywords', () => {
    expect(extractSymbols('import billing from identity')).toHaveLength(0);
  });

  it('ignores lines starting with //', () => {
    expect(extractSymbols('// entity fake {')).toHaveLength(0);
  });

  it('returns empty for empty text', () => {
    expect(extractSymbols('')).toEqual([]);
  });

  it('provides correct range information', () => {
    const text = '  entity invoice {';
    const symbols = extractSymbols(text);
    expect(symbols[0].range.start.line).toBe(0);
    expect(symbols[0].selectionRange.start.character).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// declKindToSymbolKind
// ---------------------------------------------------------------------------

describe('declKindToSymbolKind', () => {
  it('maps known keywords', () => {
    expect(declKindToSymbolKind('product')).toBe(SymbolKind.Package);
    expect(declKindToSymbolKind('module')).toBe(SymbolKind.Module);
    expect(declKindToSymbolKind('entity')).toBe(SymbolKind.Class);
    expect(declKindToSymbolKind('enum')).toBe(SymbolKind.Enum);
    expect(declKindToSymbolKind('value')).toBe(SymbolKind.Struct);
    expect(declKindToSymbolKind('actor')).toBe(SymbolKind.Interface);
    expect(declKindToSymbolKind('workflow')).toBe(SymbolKind.Function);
    expect(declKindToSymbolKind('action')).toBe(SymbolKind.Method);
    expect(declKindToSymbolKind('event')).toBe(SymbolKind.Event);
    expect(declKindToSymbolKind('test')).toBe(SymbolKind.Boolean);
  });

  it('returns Variable for unknown keywords', () => {
    expect(declKindToSymbolKind('unknown')).toBe(SymbolKind.Variable);
  });
});

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

describe('keywords', () => {
  it('exports PRD_KEYWORDS as non-empty array', () => {
    expect(PRD_KEYWORDS.length).toBeGreaterThan(50);
  });

  it('exports PRD_TYPES with primitive types', () => {
    expect(PRD_TYPES).toContain('string');
    expect(PRD_TYPES).toContain('uuid');
    expect(PRD_TYPES).toContain('optional');
  });

  it('exports BLOCK_DECLARATIONS with key constructs', () => {
    expect(BLOCK_DECLARATIONS).toContain('product');
    expect(BLOCK_DECLARATIONS).toContain('module');
    expect(BLOCK_DECLARATIONS).toContain('entity');
    expect(BLOCK_DECLARATIONS).toContain('workflow');
  });
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

describe('DEFAULT_LSP_CONFIG', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_LSP_CONFIG.maxCacheSize).toBe(200);
    expect(DEFAULT_LSP_CONFIG.diagnosticDelay).toBe(300);
  });
});
