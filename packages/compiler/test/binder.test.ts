import { describe, it, expect } from 'vitest';
import { parse, parseFile, FIXTURES_DIR } from './helpers.js';
import { bind, resolveSymbolRef } from '../src/binder/binder.js';
import { join } from 'node:path';

function bindSource(source: string) {
  const { ast, bag: parseBag } = parse(source);
  expect(parseBag.hasErrors).toBe(false);
  return bind([ast]);
}

function bindFiles(...sources: string[]) {
  const asts = sources.map((s, i) => {
    const { ast, bag } = parse(s, `file${i}.prd`);
    expect(bag.hasErrors).toBe(false);
    return ast;
  });
  return bind(asts);
}

describe('Binder', () => {
  // -----------------------------------------------------------------------
  // Module merging
  // -----------------------------------------------------------------------
  describe('module merging', () => {
    it('merges open modules from multiple files', () => {
      const result = bindFiles(
        `module billing { entity invoice { id: uuid } }`,
        `module billing { entity payment { id: uuid } }`,
      );
      expect(result.bag.hasErrors).toBe(false);
      const mod = result.modules.get('billing');
      expect(mod).toBeDefined();
      expect(mod!.symbols.size).toBe(2);
      expect(mod!.symbols.has('invoice')).toBe(true);
      expect(mod!.symbols.has('payment')).toBe(true);
    });

    it('detects duplicate product declaration', () => {
      const result = bindFiles(
        `product app_a { title: "A" version: "1.0" modules: [x] }`,
        `product app_b { title: "B" version: "1.0" modules: [y] }`,
      );
      expect(result.bag.hasErrors).toBe(true);
      expect(result.bag.errors[0]!.code).toBe('PRD0200');
    });
  });

  // -----------------------------------------------------------------------
  // Symbol tables
  // -----------------------------------------------------------------------
  describe('symbol tables', () => {
    it('creates symbols for all module items', () => {
      const result = bindSource(`
        module billing {
          entity invoice { id: uuid }
          enum status { draft paid }
          actor admin { title: "Admin" }
          workflow create_invoice { returns { ok: boolean } }
        }
      `);
      expect(result.bag.hasErrors).toBe(false);
      const mod = result.modules.get('billing')!;
      expect(mod.symbols.size).toBe(4);
      expect(mod.symbols.get('invoice')!.nodeKind).toBe('entity');
      expect(mod.symbols.get('status')!.nodeKind).toBe('enum');
      expect(mod.symbols.get('admin')!.nodeKind).toBe('actor');
      expect(mod.symbols.get('create_invoice')!.nodeKind).toBe('workflow');
    });

    it('builds allSymbols with qualified names', () => {
      const result = bindSource(`
        module billing {
          entity invoice { id: uuid }
        }
      `);
      expect(result.allSymbols.has('billing.invoice')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Duplicate detection
  // -----------------------------------------------------------------------
  describe('duplicate detection', () => {
    it('detects duplicate entity in same module', () => {
      const { ast } = parseFile(join(FIXTURES_DIR, 'invalid/duplicate-entity/app.prd'));
      const result = bind([ast]);
      expect(result.bag.hasErrors).toBe(true);
      expect(result.bag.errors.some((d) => d.code === 'PRD0201')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Import resolution
  // -----------------------------------------------------------------------
  describe('import resolution', () => {
    it('resolves valid imports', () => {
      const result = bindSource(`
        module identity {
          entity user { id: uuid }
        }
        module billing {
          import user from identity
          entity invoice { id: uuid }
        }
      `);
      expect(result.bag.hasErrors).toBe(false);
      const billing = result.modules.get('billing')!;
      expect(billing.imports).toHaveLength(1);
      expect(billing.imports[0]!.qualifiedName).toBe('identity.user');
    });

    it('detects missing module import', () => {
      const { ast } = parseFile(join(FIXTURES_DIR, 'invalid/missing-module/app.prd'));
      const result = bind([ast]);
      expect(result.bag.hasErrors).toBe(true);
      expect(result.bag.errors.some((d) => d.code === 'PRD0202')).toBe(true);
    });

    it('detects ambiguous imports', () => {
      const { ast } = parseFile(join(FIXTURES_DIR, 'invalid/ambiguous-import/app.prd'));
      const result = bind([ast]);
      expect(result.bag.hasErrors).toBe(true);
      expect(result.bag.errors.some((d) => d.code === 'PRD0203')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Symbol resolution
  // -----------------------------------------------------------------------
  describe('symbol resolution', () => {
    it('resolves unqualified name to current module', () => {
      const result = bindSource(`
        module billing {
          entity invoice { id: uuid }
          workflow create { writes { invoice } returns { ok: boolean } }
        }
      `);
      const sym = resolveSymbolRef(['invoice'], 'billing', result.modules, result.allSymbols);
      expect(sym).not.toBeNull();
      expect(sym!.qualifiedName).toBe('billing.invoice');
    });

    it('resolves qualified name across modules', () => {
      const result = bindSource(`
        module identity { entity user { id: uuid } }
        module billing { entity invoice { id: uuid } }
      `);
      const sym = resolveSymbolRef(['identity', 'user'], 'billing', result.modules, result.allSymbols);
      expect(sym).not.toBeNull();
      expect(sym!.qualifiedName).toBe('identity.user');
    });

    it('resolves imported symbol by local name', () => {
      const result = bindSource(`
        module identity { entity user { id: uuid } }
        module billing {
          import user from identity
          entity invoice { id: uuid }
        }
      `);
      const sym = resolveSymbolRef(['user'], 'billing', result.modules, result.allSymbols);
      expect(sym).not.toBeNull();
      expect(sym!.qualifiedName).toBe('identity.user');
    });

    it('returns null for unresolvable symbol', () => {
      const result = bindSource(`
        module billing { entity invoice { id: uuid } }
      `);
      const sym = resolveSymbolRef(['nonexistent'], 'billing', result.modules, result.allSymbols);
      expect(sym).toBeNull();
    });

    it('returns null for empty segments', () => {
      const result = bindSource(`
        module billing { entity invoice { id: uuid } }
      `);
      const sym = resolveSymbolRef([], 'billing', result.modules, result.allSymbols);
      expect(sym).toBeNull();
    });

    it('returns null when fromModule does not exist', () => {
      const result = bindSource(`
        module billing { entity invoice { id: uuid } }
      `);
      const sym = resolveSymbolRef(['invoice'], 'no_such_module', result.modules, result.allSymbols);
      expect(sym).toBeNull();
    });

    it('returns null when two-part key also misses', () => {
      const result = bindSource(`
        module billing { entity invoice { id: uuid } }
      `);
      const sym = resolveSymbolRef(['nonexistent', 'thing'], 'billing', result.modules, result.allSymbols);
      expect(sym).toBeNull();
    });

    it('resolves via two-part key fallback for three-segment ref', () => {
      const result = bindSource(`
        module billing { entity invoice { id: uuid } }
      `);
      // 'billing.invoice' exists in allSymbols but 'billing.invoice.status' does not
      const sym = resolveSymbolRef(['billing', 'invoice', 'status'], 'billing', result.modules, result.allSymbols);
      expect(sym).not.toBeNull();
      expect(sym!.qualifiedName).toBe('billing.invoice');
    });

    it('returns null when import target symbol is missing', () => {
      const result = bindSource(`
        module target_mod { entity real_thing { id: uuid } }
        module source_mod {
          import ghost from target_mod
        }
      `);
      // 'ghost' maps to an import pointing at target_mod.ghost, which doesn't exist
      const sym = resolveSymbolRef(['ghost'], 'source_mod', result.modules, result.allSymbols);
      expect(sym).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Product name extraction
  // -----------------------------------------------------------------------
  describe('product name', () => {
    it('extracts product name', () => {
      const result = bindSource(`
        product my_app { title: "My App" version: "1.0" modules: [core] }
        module core { entity task { id: uuid } }
      `);
      expect(result.productName).toBe('my_app');
    });

    it('returns undefined when no product', () => {
      const result = bindSource(`module core { entity task { id: uuid } }`);
      expect(result.productName).toBeUndefined();
    });

    it('reports error when product references missing module', () => {
      const result = bindSource(`
        product my_app { title: "App" version: "1.0" modules: [core, missing_mod] }
        module core { entity task { id: uuid } }
      `);
      expect(result.bag.hasErrors).toBe(true);
      expect(result.bag.errors.some((d) => d.code === 'PRD0204')).toBe(true);
    });

    it('warns when module exists but is not declared in product modules', () => {
      const result = bindSource(`
        product my_app { title: "App" version: "1.0" modules: [core] }
        module core { entity task { id: uuid } }
        module extra { entity widget { id: uuid } }
      `);
      expect(result.bag.all.some((d) => d.code === 'PRD0205')).toBe(true);
    });
  });
});
