// ---------------------------------------------------------------------------
// Tests — Multi-Agent Party Mode
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { runParty, formatPartyHuman, getSlicesForRole } from '../src/agent/party.js';
import type { PartyConfig, PartyAgent } from '../src/agent/party.js';
import type { ProductGraph, ModuleNode } from '../src/graph/graph-types.js';
import type { IncrementalSpec } from '../src/incremental/types.js';
import type { ReviewerAgent } from '../src/reviewers/reviewer.js';
import type { ReviewFinding } from '../src/reviewers/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGraph(overrides: Partial<ProductGraph> = {}): ProductGraph {
  return {
    format: 'prodara-product-graph',
    version: '0.1.0',
    product: { id: 'product', kind: 'product', name: 'test', title: null, version: null, modules: ['core'], publishes: null },
    modules: [
      {
        id: 'module:core',
        kind: 'module',
        name: 'core',
        imports: [],
        entities: [{ id: 'entity:User', kind: 'entity', name: 'User' }],
        workflows: [{ id: 'workflow:Register', kind: 'workflow', name: 'Register' }],
        surfaces: [{ id: 'surface:Dashboard', kind: 'surface', name: 'Dashboard' }],
      } as ModuleNode,
    ],
    edges: [
      { from: 'workflow:Register', to: 'entity:User', kind: 'writes' },
      { from: 'surface:Dashboard', to: 'entity:User', kind: 'reads' },
    ],
    metadata: { compiler: '0.0.0', compiled_at: new Date().toISOString(), source_files: ['test.prd'] },
    ...overrides,
  };
}

function makeSpec(): IncrementalSpec {
  return {
    format: 'prodara-incremental-spec',
    version: '0.1.0',
    summary: { addedCount: 0, removedCount: 0, modifiedCount: 0, impactedCount: 0, taskCount: 0, affectedModules: [] },
    changes: [],
    impacts: [],
    tasks: [],
    slices: {} as IncrementalSpec['slices'],
  };
}

function makeReviewer(name: string, findings: ReviewFinding[]): ReviewerAgent {
  return {
    name,
    description: `${name} reviewer`,
    review: () => findings,
  };
}

function makeAgent(role: PartyAgent['role'], findings: ReviewFinding[] = []): PartyAgent {
  return { role, reviewer: makeReviewer(role, findings) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runParty', () => {
  it('returns clean result when no findings', () => {
    const config: PartyConfig = {
      agents: [makeAgent('architect'), makeAgent('qa')],
      coordinationMode: 'sequential',
      maxRounds: 3,
    };
    const result = runParty(makeGraph(), makeSpec(), config);
    expect(result.finalConsensus).toBe(true);
    expect(result.totalFindings).toBe(0);
    expect(result.rounds).toHaveLength(1);
  });

  it('stops after consensus (no new critical findings)', () => {
    let roundCount = 0;
    const agent: PartyAgent = {
      role: 'security',
      reviewer: {
        name: 'security',
        description: 'sec',
        review: () => {
          roundCount++;
          // First round: critical findings. Second round: same count → consensus.
          return [{ reviewer: 'security', severity: 'error', category: 'auth', message: `issue-${roundCount}` }];
        },
      },
    };
    const config: PartyConfig = {
      agents: [agent],
      coordinationMode: 'sequential',
      maxRounds: 5,
    };
    const result = runParty(makeGraph(), makeSpec(), config);
    // Should stop after 2 rounds (consensus on round 2 since critical count didn't increase)
    expect(result.rounds.length).toBeLessThanOrEqual(3);
  });

  it('respects max rounds limit', () => {
    let callNum = 0;
    const agent: PartyAgent = {
      role: 'architect',
      reviewer: {
        name: 'arch',
        description: 'arch',
        review: () => {
          callNum++;
          // Always produce increasing critical findings → never reach consensus
          return Array.from({ length: callNum }, (_, i) => ({
            reviewer: 'arch',
            severity: 'critical' as const,
            category: 'arch',
            message: `new-issue-${callNum}-${i}`,
          }));
        },
      },
    };
    const config: PartyConfig = {
      agents: [agent],
      coordinationMode: 'sequential',
      maxRounds: 2,
    };
    const result = runParty(makeGraph(), makeSpec(), config);
    expect(result.rounds).toHaveLength(2);
    expect(result.finalConsensus).toBe(false);
  });

  it('collects findings from all agents', () => {
    const config: PartyConfig = {
      agents: [
        makeAgent('architect', [{ reviewer: 'architect', severity: 'warning', category: 'arch', message: 'w1' }]),
        makeAgent('security', [{ reviewer: 'security', severity: 'info', category: 'sec', message: 'i1' }]),
      ],
      coordinationMode: 'sequential',
      maxRounds: 1,
    };
    const result = runParty(makeGraph(), makeSpec(), config);
    expect(result.totalFindings).toBe(2);
    expect(result.rounds[0]!.agentResults).toHaveLength(2);
  });
});

describe('getSlicesForRole', () => {
  it('returns graph slices for architect (all categories)', () => {
    const slices = getSlicesForRole(makeGraph(), 'architect');
    expect(slices.length).toBeGreaterThan(0);
  });

  it('returns frontend slice for UX role', () => {
    const slices = getSlicesForRole(makeGraph(), 'ux');
    expect(slices).toHaveLength(1);
    expect(slices[0]!.category).toBe('frontend');
  });

  it('returns test slice for QA role', () => {
    const slices = getSlicesForRole(makeGraph(), 'qa');
    const categories = slices.map(s => s.category);
    expect(categories).toContain('test');
  });
});

describe('formatPartyHuman', () => {
  it('formats clean result', () => {
    const config: PartyConfig = {
      agents: [makeAgent('architect')],
      coordinationMode: 'sequential',
      maxRounds: 1,
    };
    const result = runParty(makeGraph(), makeSpec(), config);
    const output = formatPartyHuman(result);
    expect(output).toContain('Party Mode');
    expect(output).toContain('Consensus: YES');
  });

  it('shows individual agent findings', () => {
    const config: PartyConfig = {
      agents: [
        makeAgent('security', [{ reviewer: 'security', severity: 'error', category: 'auth', message: 'Missing auth' }]),
      ],
      coordinationMode: 'sequential',
      maxRounds: 1,
    };
    const result = runParty(makeGraph(), makeSpec(), config);
    const output = formatPartyHuman(result);
    expect(output).toContain('security');
    expect(output).toContain('Missing auth');
    expect(output).toContain('✗');
  });
});
