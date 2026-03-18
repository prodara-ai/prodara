// ---------------------------------------------------------------------------
// Test helpers — shared utilities for Prodara compiler tests
// ---------------------------------------------------------------------------

import { SourceFile } from '../src/lexer/source.js';
import { DiagnosticBag } from '../src/diagnostics/diagnostic.js';
import { Lexer } from '../src/lexer/lexer.js';
import { Parser } from '../src/parser/parser.js';
import type { AstFile } from '../src/parser/ast.js';
import type { Token } from '../src/lexer/tokens.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const FIXTURES_DIR = join(import.meta.dirname, 'fixtures');

export function lex(source: string, path = 'test.prd'): { tokens: Token[]; bag: DiagnosticBag } {
  const bag = new DiagnosticBag();
  const sf = new SourceFile(path, source);
  const lexer = new Lexer(sf, bag);
  const tokens = lexer.tokenize();
  return { tokens, bag };
}

export function parse(source: string, path = 'test.prd'): { ast: AstFile; bag: DiagnosticBag } {
  const bag = new DiagnosticBag();
  const sf = new SourceFile(path, source);
  const parser = new Parser(sf, bag);
  const ast = parser.parse();
  return { ast, bag };
}

export function parseFile(filePath: string): { ast: AstFile; bag: DiagnosticBag } {
  const content = readFileSync(filePath, 'utf-8');
  return parse(content, filePath);
}

export function parseFixtureDir(dir: string): { asts: AstFile[]; bag: DiagnosticBag } {
  const files = readdirSync(dir).filter((f) => f.endsWith('.prd')).sort();
  const bag = new DiagnosticBag();
  const asts: AstFile[] = [];
  for (const f of files) {
    const fp = join(dir, f);
    const content = readFileSync(fp, 'utf-8');
    const sf = new SourceFile(fp, content);
    const parser = new Parser(sf, bag);
    asts.push(parser.parse());
  }
  return { asts, bag };
}
