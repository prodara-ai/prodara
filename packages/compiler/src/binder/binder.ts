// ---------------------------------------------------------------------------
// Prodara Compiler — Binder
// ---------------------------------------------------------------------------
// The binder merges open modules, builds symbol tables, resolves imports,
// and detects duplicate/ambiguous symbols

import type { AstFile, ModuleDecl, ModuleItem, ImportDecl } from '../parser/ast.js';
import type { DiagnosticPhase, DiagnosticCategory, NodeKind } from '../types.js';
import { DiagnosticBag } from '../diagnostics/diagnostic.js';

// ---------------------------------------------------------------------------
// Symbol
// ---------------------------------------------------------------------------
export interface Symbol {
  readonly name: string;
  readonly qualifiedName: string;         // module.name
  readonly nodeKind: NodeKind;
  readonly module: string;
  readonly declaration: ModuleItem;
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

// ---------------------------------------------------------------------------
// Module Symbol Table
// ---------------------------------------------------------------------------
export interface ModuleSymbolTable {
  readonly name: string;
  readonly symbols: ReadonlyMap<string, Symbol>;
  readonly imports: readonly ResolvedImport[];
}

export interface ResolvedImport {
  readonly localName: string;        // alias or symbol name
  readonly qualifiedName: string;    // fully resolved: module.symbol
  readonly sourceModule: string;
  readonly originalSymbol: string;
  readonly import: ImportDecl;
}

// ---------------------------------------------------------------------------
// Bind result
// ---------------------------------------------------------------------------
export interface BindResult {
  readonly modules: ReadonlyMap<string, ModuleSymbolTable>;
  readonly allSymbols: ReadonlyMap<string, Symbol>;  // qualifiedName -> Symbol
  readonly productName: string | undefined;
  readonly declaredModules: readonly string[] | undefined;
  readonly bag: DiagnosticBag;
}

// ---------------------------------------------------------------------------
// nodeKind mapping from AST kind string
// ---------------------------------------------------------------------------
function itemNodeKind(item: ModuleItem): NodeKind | null {
  switch (item.kind) {
    case 'import': /* v8 ignore next */ return null; // imports are not symbols
    case 'entity': return 'entity';
    case 'value': return 'value';
    case 'enum': return 'enum';
    case 'rule': return 'rule';
    case 'actor': return 'actor';
    case 'capability': return 'capability';
    case 'workflow': return 'workflow';
    case 'action': return 'action';
    case 'event': return 'event';
    case 'schedule': return 'schedule';
    case 'surface': return 'surface';
    case 'rendering': return 'rendering';
    case 'tokens': return 'tokens';
    case 'theme': return 'theme';
    case 'strings': return 'strings';
    case 'serialization': return 'serialization';
    case 'integration': return 'integration';
    case 'transport': return 'transport';
    case 'storage': return 'storage';
    case 'execution': return 'execution';
    case 'extension': return 'extension';
    case 'constitution': return 'constitution';
    case 'security': return 'security';
    case 'privacy': return 'privacy';
    case 'validation': return 'validation';
    case 'secret': return 'secret';
    case 'environment': return 'environment';
    case 'deployment': return 'deployment';
    case 'test': return 'test';
    case 'product_ref': return 'product_ref';
    /* v8 ignore next */
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Binder
// ---------------------------------------------------------------------------
export function bind(files: readonly AstFile[]): BindResult {
  const bag = new DiagnosticBag();

  // 1. Merge open modules — group module items by name across all files
  const mergedModules = new Map<string, { items: ModuleItem[]; files: Set<string> }>();
  let productName: string | undefined;
  let declaredModules: readonly string[] | undefined;
  let productLocation: { file: string; line: number; column: number } | undefined;

  for (const file of files) {
    for (const decl of file.declarations) {
      if (decl.kind === 'product') {
        if (productName !== undefined && productName !== decl.name) {
          bag.add({
            phase: 'binder', category: 'semantic_error', severity: 'error',
            code: 'PRD0200', message: `Duplicate product declaration '${decl.name}' (already declared as '${productName}')`,
            file: file.path, line: decl.location.line, column: decl.location.column,
          });
        }
        productName = decl.name;
        declaredModules = decl.modules;
        productLocation = { file: file.path, line: decl.location.line, column: decl.location.column };
        continue;
      }
      if (decl.kind === 'module') {
        let merged = mergedModules.get(decl.name);
        if (!merged) {
          merged = { items: [], files: new Set() };
          mergedModules.set(decl.name, merged);
        }
        merged.files.add(file.path);
        for (const item of decl.items) {
          merged.items.push(item);
        }
      }
    }
  }

  // 2. Build symbol tables per module
  const allSymbols = new Map<string, Symbol>();
  const moduleTables = new Map<string, ModuleSymbolTable>();

  for (const [modName, merged] of mergedModules) {
    const symbols = new Map<string, Symbol>();
    const imports: ImportDecl[] = [];

    for (const item of merged.items) {
      if (item.kind === 'import') {
        imports.push(item);
        continue;
      }

      const nk = itemNodeKind(item);
      /* v8 ignore next */
      if (!nk) continue;

      const name = item.name;
      const qualifiedName = `${modName}.${name}`;

      if (symbols.has(name)) {
        const existing = symbols.get(name)!;
        bag.add({
          phase: 'binder', category: 'semantic_error', severity: 'error',
          code: 'PRD0201',
          message: `Duplicate declaration '${name}' in module '${modName}' (previously declared at ${existing.file}:${existing.line})`,
          file: item.location.file, line: item.location.line, column: item.location.column,
        });
        continue;
      }

      const sym: Symbol = {
        name, qualifiedName, nodeKind: nk, module: modName,
        declaration: item,
        file: item.location.file,
        line: item.location.line,
        column: item.location.column,
      };
      symbols.set(name, sym);
      allSymbols.set(qualifiedName, sym);
    }

    // 3. Resolve imports
    const resolvedImports: ResolvedImport[] = [];
    for (const imp of imports) {
      const fromModule = mergedModules.get(imp.from);
      if (!fromModule) {
        bag.add({
          phase: 'binder', category: 'resolution_error', severity: 'error',
          code: 'PRD0202',
          message: `Module '${imp.from}' not found (imported in module '${modName}')`,
          file: imp.location.file, line: imp.location.line, column: imp.location.column,
        });
        continue;
      }

      const targetQualified = `${imp.from}.${imp.symbol}`;
      const localName = imp.alias ?? imp.symbol;

      resolvedImports.push({
        localName,
        qualifiedName: targetQualified,
        sourceModule: imp.from,
        originalSymbol: imp.symbol,
        import: imp,
      });
    }

    // Check for ambiguous imports (same local name)
    const importsByLocal = new Map<string, ResolvedImport[]>();
    for (const ri of resolvedImports) {
      const arr = importsByLocal.get(ri.localName) ?? [];
      arr.push(ri);
      importsByLocal.set(ri.localName, arr);
    }
    for (const [localName, arr] of importsByLocal) {
      if (arr.length > 1) {
        for (const ri of arr) {
          bag.add({
            phase: 'binder', category: 'resolution_error', severity: 'error',
            code: 'PRD0203',
            message: `Ambiguous import: '${localName}' imported from both '${arr[0]!.sourceModule}' and '${arr[1]!.sourceModule}'`,
            file: ri.import.location.file, line: ri.import.location.line, column: ri.import.location.column,
          });
        }
      }
    }

    moduleTables.set(modName, { name: modName, symbols, imports: resolvedImports });
  }

  // 4. Validate declared modules vs. found modules
  if (declaredModules && productLocation) {
    for (const declMod of declaredModules) {
      if (!moduleTables.has(declMod)) {
        bag.add({
          phase: 'binder', category: 'resolution_error', severity: 'error',
          code: 'PRD0204',
          message: `Product references module '${declMod}' but no module '${declMod}' was found`,
          file: productLocation.file, line: productLocation.line, column: productLocation.column,
        });
      }
    }
    const declaredSet = new Set(declaredModules);
    for (const modName of moduleTables.keys()) {
      if (!declaredSet.has(modName)) {
        bag.add({
          phase: 'binder', category: 'semantic_error', severity: 'warning',
          code: 'PRD0205',
          message: `Module '${modName}' exists but is not listed in the product's modules`,
          file: productLocation.file, line: productLocation.line, column: productLocation.column,
        });
      }
    }
  }

  return { modules: moduleTables, allSymbols, productName, declaredModules, bag };
}

// ---------------------------------------------------------------------------
// Symbol Resolver — resolves a symbol_ref (string[]) from a given module context
// ---------------------------------------------------------------------------
export function resolveSymbolRef(
  segments: readonly string[],
  fromModule: string,
  modules: ReadonlyMap<string, ModuleSymbolTable>,
  allSymbols: ReadonlyMap<string, Symbol>,
): Symbol | null {
  if (segments.length === 0) return null;

  // Fully qualified: module.name or module.enum.member etc.
  if (segments.length >= 2) {
    const qualifiedName = segments.join('.');
    // Try direct lookup
    const direct = allSymbols.get(qualifiedName);
    if (direct) return direct;
    // Try module.name (first two segments)
    const twoPartKey = `${segments[0]}.${segments[1]}`;
    const sym = allSymbols.get(twoPartKey);
    if (sym) return sym;
  }

  // Unqualified: single identifier
  if (segments.length === 1) {
    const name = segments[0]!;
    const moduleTable = modules.get(fromModule);
    if (!moduleTable) return null;

    // 1. Current module declarations
    const local = moduleTable.symbols.get(name);
    if (local) return local;

    // 2. Import aliases first, then imported symbols
    for (const imp of moduleTable.imports) {
      if (imp.localName === name) {
        return allSymbols.get(imp.qualifiedName) ?? null;
      }
    }
  }

  return null;
}
