// ---------------------------------------------------------------------------
// Prodara Compiler — Multi-Agent Party Mode
// ---------------------------------------------------------------------------
// Orchestrates multiple specialized agents working as a team on the
// Product Graph.  Each agent receives a graph slice relevant to its role.

import type { ProductGraph } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ReviewerAgent } from '../reviewers/reviewer.js';
import type { ReviewFinding } from '../reviewers/types.js';
import type { SliceCategory, GraphSlice } from '../generator/contracts.js';
import { sliceGraph } from '../generator/contracts.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PartyRole = 'architect' | 'security' | 'developer' | 'qa' | 'ux';

export interface PartyAgent {
  readonly role: PartyRole;
  readonly reviewer: ReviewerAgent;
}

export interface PartyConfig {
  readonly agents: readonly PartyAgent[];
  readonly coordinationMode: 'sequential' | 'parallel';
  readonly maxRounds: number;
}

export interface PartyRound {
  readonly roundNumber: number;
  readonly agentResults: readonly PartyAgentResult[];
  readonly consensusReached: boolean;
}

export interface PartyAgentResult {
  readonly role: PartyRole;
  readonly findings: readonly ReviewFinding[];
}

export interface PartyResult {
  readonly rounds: readonly PartyRound[];
  readonly finalConsensus: boolean;
  readonly totalFindings: number;
}

// ---------------------------------------------------------------------------
// Role → Graph Slice mapping
// ---------------------------------------------------------------------------

const ROLE_SLICES: Record<PartyRole, readonly SliceCategory[]> = {
  architect: ['backend', 'frontend', 'api', 'schema', 'runtime'],
  security: ['runtime', 'api'],
  developer: ['backend', 'frontend', 'api', 'schema'],
  qa: ['test', 'schema'],
  ux: ['frontend'],
};

/**
 * Get the graph slices relevant to a party role.
 */
export function getSlicesForRole(graph: ProductGraph, role: PartyRole): readonly GraphSlice[] {
  return ROLE_SLICES[role].map(cat => sliceGraph(graph, cat));
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Run a party-mode review session.
 *
 * Each round:
 * 1. Each agent reviews the full graph (agents are reviewers with role context)
 * 2. Findings are collected
 * 3. Consensus is checked — no new critical/error findings → done
 * 4. If max rounds reached → stop
 */
export function runParty(
  graph: ProductGraph,
  spec: IncrementalSpec,
  config: PartyConfig,
): PartyResult {
  const rounds: PartyRound[] = [];
  let previousCriticalCount = 0;

  for (let r = 1; r <= config.maxRounds; r++) {
    const agentResults: PartyAgentResult[] = [];

    for (const agent of config.agents) {
      const findings = agent.reviewer.review(graph, spec);
      agentResults.push({ role: agent.role, findings });
    }

    const allFindings = agentResults.flatMap(ar => ar.findings);
    const criticalCount = allFindings.filter(
      f => f.severity === 'critical' || f.severity === 'error',
    ).length;

    const consensusReached = r > 1 && criticalCount <= previousCriticalCount;
    previousCriticalCount = criticalCount;

    rounds.push({ roundNumber: r, agentResults, consensusReached });

    if (consensusReached || criticalCount === 0) break;
  }

  const totalFindings = rounds.flatMap(r => r.agentResults).flatMap(ar => ar.findings).length;
  const finalConsensus = rounds.length > 0 && (rounds[rounds.length - 1]!.consensusReached || totalFindings === 0);

  return { rounds, finalConsensus, totalFindings };
}

/**
 * Format party results for human output.
 */
export function formatPartyHuman(result: PartyResult): string {
  const lines: string[] = [];

  lines.push(`Party Mode — ${result.rounds.length} round(s), ${result.totalFindings} findings`);
  lines.push(`Consensus: ${result.finalConsensus ? 'YES' : 'NO'}`);
  lines.push('');

  for (const round of result.rounds) {
    lines.push(`## Round ${round.roundNumber}`);
    for (const ar of round.agentResults) {
      const count = ar.findings.length;
      lines.push(`  ${ar.role}: ${count} finding${count !== 1 ? 's' : ''}`);
      for (const f of ar.findings) {
        /* v8 ignore next -- severity ternary: info is the uncommon path */
        const icon = f.severity === 'critical' || f.severity === 'error' ? '✗' : f.severity === 'warning' ? '⚠' : 'ℹ';
        lines.push(`    ${icon} [${f.severity}] ${f.message}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
