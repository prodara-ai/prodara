// ---------------------------------------------------------------------------
// Registry resolution tests
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { resolveConstitutions, parsePackageRef } from '../src/registry/resolution.js';
import type { AstFile } from '../src/parser/ast.js';
import type { BindResult } from '../src/binder/binder.js';
import { DiagnosticBag } from '../src/diagnostics/diagnostic.js';

const loc = { file: 'test.prd', line: 1, column: 0, endLine: 1, endColumn: 0 };

function makeBind(): BindResult {
  return {
    bag: new DiagnosticBag(),
    modules: new Map(),
    allSymbols: new Map(),
    productName: undefined,
  };
}

function makeFile(declarations: AstFile['declarations']): AstFile {
  return { path: 'test.prd', declarations };
}

describe('Registry Resolution', () => {
  describe('resolveConstitutions', () => {
    it('returns empty result when no constitutions declared', () => {
      const file = makeFile([
        {
          kind: 'module', name: 'core', items: [
            { kind: 'entity', name: 'task', fields: [], location: loc },
          ],
          location: loc,
        },
      ]);

      const result = resolveConstitutions([file], makeBind());
      expect(result.refs).toHaveLength(0);
      expect(result.packages).toHaveLength(0);
      expect(result.bag.all).toHaveLength(0);
    });

    it('extracts constitution package references', () => {
      const file = makeFile([
        {
          kind: 'module', name: 'core', items: [
            {
              kind: 'constitution',
              name: 'default',
              appliesTo: [],
              policies: [],
              packages: [
                { path: '@prodara/gdpr', version: '1.0.0' },
                { path: '@prodara/hipaa', version: '2.0.0' },
              ],
              location: loc,
            },
          ],
          location: loc,
        },
      ]);

      const result = resolveConstitutions([file], makeBind());
      expect(result.refs).toHaveLength(2);
      expect(result.refs[0]!.path).toBe('@prodara/gdpr');
      expect(result.refs[0]!.version).toBe('1.0.0');
      expect(result.refs[0]!.module).toBe('core');
      expect(result.refs[0]!.constitutionName).toBe('default');
      expect(result.refs[1]!.path).toBe('@prodara/hipaa');
    });

    it('emits info diagnostic for each unresolved package', () => {
      const file = makeFile([
        {
          kind: 'module', name: 'core', items: [
            {
              kind: 'constitution',
              name: 'default',
              appliesTo: [],
              policies: [],
              packages: [{ path: '@prodara/gdpr', version: '1.0.0' }],
              location: loc,
            },
          ],
          location: loc,
        },
      ]);

      const result = resolveConstitutions([file], makeBind());
      expect(result.bag.all).toHaveLength(1);
      const d = result.bag.all[0]!;
      expect(d.severity).toBe('info');
      expect(d.code).toBe('PRD0601');
      expect(d.message).toContain('@prodara/gdpr');
    });

    it('handles multiple constitutions across multiple modules', () => {
      const file = makeFile([
        {
          kind: 'module', name: 'a', items: [
            {
              kind: 'constitution', name: 'c1', appliesTo: [], policies: [],
              packages: [{ path: 'pkg-a', version: '1.0' }],
              location: loc,
            },
          ],
          location: loc,
        },
        {
          kind: 'module', name: 'b', items: [
            {
              kind: 'constitution', name: 'c2', appliesTo: [], policies: [],
              packages: [{ path: 'pkg-b', version: '2.0' }],
              location: loc,
            },
          ],
          location: loc,
        },
      ]);

      const result = resolveConstitutions([file], makeBind());
      expect(result.refs).toHaveLength(2);
      expect(result.refs[0]!.module).toBe('a');
      expect(result.refs[1]!.module).toBe('b');
    });

    it('skips constitutions that have no packages', () => {
      const file = makeFile([
        {
          kind: 'module', name: 'core', items: [
            {
              kind: 'constitution', name: 'default', appliesTo: [], policies: [],
              location: loc,
            },
          ],
          location: loc,
        },
      ]);

      const result = resolveConstitutions([file], makeBind());
      expect(result.refs).toHaveLength(0);
      expect(result.bag.all).toHaveLength(0);
    });

    it('skips non-module declarations', () => {
      const file = makeFile([
        {
          kind: 'product', name: 'app', title: 'App', version: '1.0',
          modules: ['core'],
          location: loc,
        },
      ]);

      const result = resolveConstitutions([file], makeBind());
      expect(result.refs).toHaveLength(0);
    });
  });

  describe('parsePackageRef', () => {
    it('parses scoped package with version', () => {
      const ref = parsePackageRef('@prodara/gdpr@1.0.0');
      expect(ref).toEqual({ path: '@prodara/gdpr', version: '1.0.0' });
    });

    it('parses unscoped package with version', () => {
      const ref = parsePackageRef('my-pkg@2.3.4');
      expect(ref).toEqual({ path: 'my-pkg', version: '2.3.4' });
    });

    it('defaults version to * when absent', () => {
      const ref = parsePackageRef('@prodara/gdpr');
      expect(ref).toEqual({ path: '@prodara/gdpr', version: '*' });
    });

    it('returns null for invalid input', () => {
      expect(parsePackageRef('')).toBeNull();
      expect(parsePackageRef('  ')).toBeNull();
    });
  });
});
