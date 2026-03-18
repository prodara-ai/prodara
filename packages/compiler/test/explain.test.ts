import { describe, it, expect } from 'vitest';
import { explainNode, collectAllNodeIds, formatExplanation, getDiagnosticInfo } from '../src/cli/explain.js';
import { parse } from './helpers.js';
import { bind } from '../src/binder/binder.js';
import { buildGraph } from '../src/graph/builder.js';
import type { ProductGraph } from '../src/graph/graph-types.js';

function graphFromSource(source: string): ProductGraph {
  const { ast, bag: parseBag } = parse(source);
  expect(parseBag.hasErrors).toBe(false);
  const bindResult = bind([ast]);
  expect(bindResult.bag.hasErrors).toBe(false);
  const { graph } = buildGraph([ast], bindResult);
  return graph;
}

describe('explain', () => {
  const graph = graphFromSource(`
    module core {
      entity task { id: uuid title: string done: boolean }
      entity user { id: uuid name: string }
    }
  `);

  describe('collectAllNodeIds', () => {
    it('collects all nodes from graph', () => {
      const ids = collectAllNodeIds(graph);
      expect(ids.has('product')).toBe(true);
      expect(ids.has('core')).toBe(true);
      expect([...ids].some((id: string) => id.includes('task'))).toBe(true);
    });
  });

  describe('explainNode', () => {
    it('explains the product node', () => {
      const result = explainNode(graph, 'product');
      expect(result).not.toBeNull();
      expect(result!.kind).toBe('product');
    });

    it('explains a module node', () => {
      const result = explainNode(graph, 'core');
      expect(result).not.toBeNull();
      expect(result!.kind).toBe('module');
      expect(result!.name).toBe('core');
    });

    it('explains a nested entity node', () => {
      const result = explainNode(graph, 'core.entity.task');
      expect(result).not.toBeNull();
      expect(result!.kind).toBe('entity');
      expect(result!.name).toBe('task');
      expect(result!.module).toBe('core');
    });

    it('returns null for nonexistent nodes', () => {
      const result = explainNode(graph, 'nonexistent.node');
      expect(result).toBeNull();
    });
  });

  describe('formatExplanation', () => {
    it('formats explanation output', () => {
      const result = explainNode(graph, 'product')!;
      const output = formatExplanation(result);
      expect(output).toContain('Node: product');
      expect(output).toContain('Kind: product');
    });

    it('formats explanation with module', () => {
      const result = explainNode(graph, 'core.entity.task')!;
      const output = formatExplanation(result);
      expect(output).toContain('Module: core');
    });

    it('formats array of objects in properties', () => {
      const result = explainNode(graph, 'core.entity.task')!;
      const output = formatExplanation(result);
      // Entity has fields which is an array of objects
      expect(output).toContain('fields:');
    });

    it('formats primitive array properties', () => {
      const explanation: import('../src/cli/explain.js').NodeExplanation = {
        id: 'test', kind: 'test', name: 'test', module: null,
        properties: { tags: ['a', 'b', 'c'] },
        incomingEdges: [], outgoingEdges: [],
      };
      const output = formatExplanation(explanation);
      expect(output).toContain('tags: a, b, c');
    });

    it('formats object properties as JSON', () => {
      const explanation: import('../src/cli/explain.js').NodeExplanation = {
        id: 'test', kind: 'test', name: 'test', module: null,
        properties: { meta: { key: 'value' } },
        incomingEdges: [], outgoingEdges: [],
      };
      const output = formatExplanation(explanation);
      expect(output).toContain('meta:');
      expect(output).toContain('value');
    });

    it('formats scalar properties', () => {
      const explanation: import('../src/cli/explain.js').NodeExplanation = {
        id: 'test', kind: 'test', name: 'test', module: null,
        properties: { count: 42 },
        incomingEdges: [], outgoingEdges: [],
      };
      const output = formatExplanation(explanation);
      expect(output).toContain('count: 42');
    });

    it('skips null, undefined, and empty array properties', () => {
      const explanation: import('../src/cli/explain.js').NodeExplanation = {
        id: 'test', kind: 'test', name: 'test', module: null,
        properties: { a: null, b: undefined, c: [] },
        incomingEdges: [], outgoingEdges: [],
      };
      const output = formatExplanation(explanation);
      expect(output).not.toContain('a:');
      expect(output).not.toContain('b:');
      expect(output).not.toContain('c:');
    });

    it('shows incoming and outgoing edges', () => {
      const graphWithEdges = graphFromSource(`
        module core {
          entity task { id: uuid assignee: core.user }
          entity user { id: uuid }
        }
      `);
      const result = explainNode(graphWithEdges, 'core.entity.task');
      expect(result).not.toBeNull();
      const output = formatExplanation(result!);
      if (result!.outgoingEdges.length > 0) {
        expect(output).toContain('Outgoing edges');
      }
      if (result!.incomingEdges.length > 0) {
        expect(output).toContain('Incoming edges');
      }
    });
  });
});

describe('why', () => {
  describe('getDiagnosticInfo', () => {
    it('returns info for known codes', () => {
      const info = getDiagnosticInfo('PRD0001');
      expect(info).not.toBeNull();
      expect(info!.title).toBe('Unexpected character');
      expect(info!.phase).toBe('lexer');
    });

    it('is case-insensitive', () => {
      const info = getDiagnosticInfo('prd0001');
      expect(info).not.toBeNull();
    });

    it('returns null for unknown codes', () => {
      const info = getDiagnosticInfo('PRD9999');
      expect(info).toBeNull();
    });

    it('has entries for all major phases', () => {
      const phases = ['lexer', 'parser', 'binder', 'checker', 'validator', 'graph', 'testing'];
      for (const phase of phases) {
        // Find at least one diagnostic for each phase
        const codes = ['PRD0001', 'PRD0100', 'PRD0200', 'PRD0300', 'PRD0400', 'PRD0500', 'PRD0800'];
        const found = codes.some(code => {
          const info = getDiagnosticInfo(code);
          return info && info.phase === phase;
        });
        expect(found).toBe(true);
      }
    });
  });
});
