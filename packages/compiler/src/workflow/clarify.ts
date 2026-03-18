// ---------------------------------------------------------------------------
// Prodara Compiler — Clarify Phase
// ---------------------------------------------------------------------------
// Generates prioritized clarification questions by analyzing the Product
// Graph for ambiguities, missing constructs, and incomplete definitions.

import type { ProductGraph, ModuleNode } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { QuestionPriority, ResolvedClarifyConfig, AmbiguityThreshold } from '../config/config.js';
import { priorityRank } from '../config/config.js';
import type { ClarifyOutput, ClarifyQuestion, ClarifyCategory, ClarifyConfidence, PhaseResult, AutoClarifyResult, ResolvedQuestion } from './types.js';

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function runClarifyPhase(
  graph: ProductGraph,
  spec: IncrementalSpec,
  config: ResolvedClarifyConfig,
): PhaseResult<ClarifyOutput> {
  const allQuestions = generateQuestions(graph, spec);
  const minRank = priorityRank(config.minimumQuestionPriority);

  const filtered = allQuestions.filter((q) => priorityRank(q.priority) >= minRank);
  const limited = filtered.slice(0, config.maxQuestions);

  return {
    phase: 'clarify',
    ok: true,
    data: {
      questions: limited,
      filteredCount: limited.length,
      totalCount: allQuestions.length,
    },
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Question generators
// ---------------------------------------------------------------------------

function generateQuestions(
  graph: ProductGraph,
  _spec: IncrementalSpec,
): ClarifyQuestion[] {
  const questions: ClarifyQuestion[] = [];
  let nextId = 1;

  for (const mod of graph.modules) {
    // Empty modules → what should they contain?
    const entities = getNodeArray(mod, 'entities');
    const workflows = getNodeArray(mod, 'workflows');
    if (entities.length === 0 && workflows.length === 0) {
      questions.push(makeQuestion(nextId++, 'medium', 'empty_module', mod.id,
        `Module "${mod.name}" has no entities or workflows. What domain constructs should it contain?`,
        'low'));
    }

    // Entities without identity fields → which field is the ID?
    for (const entity of entities) {
      const fields = getFields(entity);
      const hasId = fields.some((f) => f === 'id' || f.endsWith('_id'));
      if (!hasId && fields.length > 0) {
        questions.push(makeQuestion(nextId++, 'high', 'missing_field', entity.id,
          `Entity "${entity.name}" in module "${mod.name}" has no obvious identity field. Which field uniquely identifies it?`,
          'high'));
      }
    }

    // Workflows without authorization
    for (const wf of getNodeArray(mod, 'workflows')) {
      const hasAuth = graph.edges.some(
        (e) => e.from === wf.id && e.kind === 'authorized_as',
      );
      if (!hasAuth) {
        questions.push(makeQuestion(nextId++, 'high', 'missing_authorization', wf.id,
          `Workflow "${wf.name}" in module "${mod.name}" has no authorization. Who should be allowed to trigger it?`,
          'medium'));
      }
    }

    // Surfaces without actions
    for (const surface of getNodeArray(mod, 'surfaces')) {
      const hasAction = graph.edges.some(
        (e) => e.from === surface.id && e.kind === 'exposes_action',
      );
      if (!hasAction) {
        questions.push(makeQuestion(nextId++, 'medium', 'missing_action', surface.id,
          `Surface "${surface.name}" in module "${mod.name}" has no exposed actions. What can the user do here?`,
          'low'));
      }
    }

    // Unresolved imports
    for (const imp of mod.imports) {
      const found = graph.modules.some((m) => m.name === imp.from);
      if (!found) {
        questions.push(makeQuestion(nextId++, 'critical', 'unresolved_import', mod.id,
          `Module "${mod.name}" imports "${imp.symbol}" from "${imp.from}" which cannot be resolved. Is this an external dependency or a typo?`,
          'low'));
      }
    }
  }

  return questions;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQuestion(
  id: number,
  priority: QuestionPriority,
  category: ClarifyCategory,
  nodeId: string | null,
  question: string,
  confidence: ClarifyConfidence = 'medium',
): ClarifyQuestion {
  return { id: `q${id}`, priority, category, nodeId, question, confidence };
}

interface NamedNode {
  readonly id: string;
  readonly name: string;
}

function getNodeArray(mod: ModuleNode, category: string): readonly NamedNode[] {
  const val = mod[category];
  if (!Array.isArray(val)) return [];
  return val as readonly NamedNode[];
}

function getFields(entity: NamedNode): readonly string[] {
  const raw = entity as unknown as Record<string, unknown>;
  const fields = raw['fields'];
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((f): f is { name: string } => typeof f === 'object' && f !== null && 'name' in f)
    .map((f) => f.name);
}

// ---------------------------------------------------------------------------
// Auto-clarify — resolve questions the system can answer automatically
// ---------------------------------------------------------------------------

const confidenceRank: Record<ClarifyConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const thresholdRank: Record<AmbiguityThreshold, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function autoResolveClarifications(
  questions: readonly ClarifyQuestion[],
  threshold: AmbiguityThreshold,
  graph: ProductGraph,
): AutoClarifyResult {
  const minRank = thresholdRank[threshold];
  const autoResolved: ResolvedQuestion[] = [];
  const needsInput: ClarifyQuestion[] = [];

  for (const q of questions) {
    if (confidenceRank[q.confidence] >= minRank) {
      const answer = deriveAnswer(q, graph);
      if (answer !== null) {
        autoResolved.push({ question: q, answer: answer.answer, reason: answer.reason });
        continue;
      }
    }
    needsInput.push(q);
  }

  return { autoResolved, needsInput };
}

function deriveAnswer(
  q: ClarifyQuestion,
  graph: ProductGraph,
): { answer: string; reason: string } | null {
  switch (q.category) {
    case 'empty_module': {
      // Suggest based on module name if it hints at a domain
      const mod = graph.modules.find((m) => m.id === q.nodeId);
      if (mod) {
        return {
          answer: `Add domain entities and workflows appropriate for the "${mod.name}" module.`,
          reason: `Module "${mod.name}" exists but is empty; standard practice is to define at least one entity.`,
        };
      }
      return null;
    }
    case 'missing_field': {
      return {
        answer: 'Add an "id" field of type "uuid" as the primary identifier.',
        reason: 'Convention: every entity should have an explicit identity field; "id: uuid" is the standard default.',
      };
    }
    case 'missing_authorization': {
      return {
        answer: 'Restrict to authenticated users by default.',
        reason: 'Security best practice: workflows should require authentication unless explicitly public.',
      };
    }
    case 'missing_action': {
      const surface = graph.modules
        .flatMap((m) => ((m['surfaces'] ?? []) as readonly NamedNode[]))
        .find((s) => s.id === q.nodeId);
      if (surface) {
        return {
          answer: `Add at least one user action to surface "${surface.name}".`,
          reason: 'A surface without actions provides no interactivity.',
        };
      }
      return null;
    }
    case 'unresolved_import':
      // Cannot safely auto-resolve — could be a typo or missing dependency
      return null;
    default:
      return null;
  }
}
