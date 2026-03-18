// ---------------------------------------------------------------------------
// Prodara Compiler — Expression Parser (Pratt/precedence climbing)
// ---------------------------------------------------------------------------

import type { SourceLocation } from '../types.js';
import { TokenKind, type Token } from '../lexer/tokens.js';
import type { Expression } from './ast.js';

/**
 * Parse a Prodara expression from a token stream.
 * Uses precedence climbing for correct operator precedence.
 *
 * Precedence (lowest→highest):
 *   1. or
 *   2. and
 *   3. not (prefix)
 *   4. comparisons: > < >= <= == !=
 *   5. field access (.)
 *   6. atoms: identifier, literal, parenthesized
 */
export function parseExpression(
  tokens: readonly Token[],
  pos: { value: number },
  file: string,
): Expression {
  return parseOr(tokens, pos, file);
}

function parseOr(tokens: readonly Token[], pos: { value: number }, file: string): Expression {
  let left = parseAnd(tokens, pos, file);
  while (peek(tokens, pos)?.kind === TokenKind.OrKw) {
    advance(tokens, pos);
    const right = parseAnd(tokens, pos, file);
    left = { kind: 'binary', op: 'or', left, right, location: left.location };
  }
  return left;
}

function parseAnd(tokens: readonly Token[], pos: { value: number }, file: string): Expression {
  let left = parseNot(tokens, pos, file);
  while (peek(tokens, pos)?.kind === TokenKind.AndKw) {
    advance(tokens, pos);
    const right = parseNot(tokens, pos, file);
    left = { kind: 'binary', op: 'and', left, right, location: left.location };
  }
  return left;
}

function parseNot(tokens: readonly Token[], pos: { value: number }, file: string): Expression {
  if (peek(tokens, pos)?.kind === TokenKind.NotKw) {
    const tok = advance(tokens, pos)!;
    const operand = parseNot(tokens, pos, file);
    return {
      kind: 'unary',
      op: 'not',
      operand,
      location: makeLoc(file, tok),
    };
  }
  return parseComparison(tokens, pos, file);
}

function parseComparison(tokens: readonly Token[], pos: { value: number }, file: string): Expression {
  const left = parseAccess(tokens, pos, file);
  const tok = peek(tokens, pos);
  if (tok && isComparisonOp(tok.kind)) {
    const opTok = advance(tokens, pos)!;
    const right = parseAccess(tokens, pos, file);
    return { kind: 'binary', op: opTok.text, left, right, location: left.location };
  }
  return left;
}

function parseAccess(tokens: readonly Token[], pos: { value: number }, file: string): Expression {
  let expr = parseAtom(tokens, pos, file);
  while (peek(tokens, pos)?.kind === TokenKind.Dot) {
    advance(tokens, pos); // skip .
    const ident = advance(tokens, pos);
    if (!ident || (ident.kind !== TokenKind.Identifier && !isIdentLike(ident.kind))) {
      // Recovery: return what we have
      break;
    }
    if (expr.kind === 'access') {
      expr = { kind: 'access', segments: [...expr.segments, ident.text], location: expr.location };
    } else {
      // wrap in access
      expr = { kind: 'access', segments: [expressionToString(expr), ident.text], location: expr.location };
    }
  }
  return expr;
}

function parseAtom(tokens: readonly Token[], pos: { value: number }, file: string): Expression {
  const tok = peek(tokens, pos);
  /* v8 ignore next 3 */
  if (!tok || tok.kind === TokenKind.EOF) {
    return { kind: 'literal', value: '', literalType: 'string', location: makeLoc(file, tok ?? { line: 1, column: 1, pos: 0, end: 0, text: '', kind: TokenKind.EOF }) };
  }

  if (tok.kind === TokenKind.OpenParen) {
    advance(tokens, pos); // skip (
    const inner = parseExpression(tokens, pos, file);
    if (peek(tokens, pos)?.kind === TokenKind.CloseParen) {
      advance(tokens, pos);
    }
    return { kind: 'paren', inner, location: makeLoc(file, tok) };
  }

  if (tok.kind === TokenKind.IntegerLiteral) {
    advance(tokens, pos);
    return { kind: 'literal', value: parseInt(tok.text, 10), literalType: 'integer', location: makeLoc(file, tok) };
  }

  if (tok.kind === TokenKind.DecimalLiteral) {
    advance(tokens, pos);
    return { kind: 'literal', value: parseFloat(tok.text), literalType: 'decimal', location: makeLoc(file, tok) };
  }

  if (tok.kind === TokenKind.StringLiteral) {
    advance(tokens, pos);
    return { kind: 'literal', value: unquote(tok.text), literalType: 'string', location: makeLoc(file, tok) };
  }

  if (tok.kind === TokenKind.BooleanTrue || tok.kind === TokenKind.BooleanFalse) {
    advance(tokens, pos);
    return { kind: 'literal', value: tok.kind === TokenKind.BooleanTrue, literalType: 'boolean', location: makeLoc(file, tok) };
  }

  if (tok.kind === TokenKind.Identifier || isIdentLike(tok.kind)) {
    advance(tokens, pos);
    return { kind: 'access', segments: [tok.text], location: makeLoc(file, tok) };
  }

  // Empty list comparison  []
  if (tok.kind === TokenKind.OpenBracket) {
    const next = tokens[pos.value + 1];
    if (next?.kind === TokenKind.CloseBracket) {
      advance(tokens, pos); // [
      advance(tokens, pos); // ]
      return { kind: 'literal', value: '[]', literalType: 'identifier', location: makeLoc(file, tok) };
    }
  }

  // Recovery: advance past the unexpected token
  advance(tokens, pos);
  return { kind: 'literal', value: tok.text, literalType: 'identifier', location: makeLoc(file, tok) };
}

function isComparisonOp(kind: TokenKind): boolean {
  return (
    kind === TokenKind.GreaterThan ||
    kind === TokenKind.LessThan ||
    kind === TokenKind.GreaterEqual ||
    kind === TokenKind.LessEqual ||
    kind === TokenKind.EqualsEquals ||
    kind === TokenKind.BangEquals
  );
}

/** Allow some keywords to be used in expression identifier positions. */
/* v8 ignore start */
function isIdentLike(kind: TokenKind): boolean {
  // Any keyword can appear as a field reference in expressions
  // (e.g., 'title' in condition: title != "")
  // Non-keywords (operators, braces, literals, etc.) are excluded
  switch (kind) {
    case TokenKind.Identifier:
    case TokenKind.AutoKw:
    case TokenKind.ModeKw:
    case TokenKind.KindKw:
    case TokenKind.SourceKw:
    case TokenKind.PathKw:
    case TokenKind.VersionKw:
    case TokenKind.UrlKw:
    case TokenKind.TitleKw:
    case TokenKind.DescriptionKw:
    case TokenKind.EntityKw:
    case TokenKind.MessageKw:
    case TokenKind.ConditionKw:
    case TokenKind.CapabilityKw:
    case TokenKind.TargetKw:
    case TokenKind.RulesKw:
    case TokenKind.StepsKw:
    case TokenKind.InputKw:
    case TokenKind.ReadsKw:
    case TokenKind.WritesKw:
    case TokenKind.ReturnsKw:
    case TokenKind.WorkflowKw:
    case TokenKind.ActionKw:
    case TokenKind.EventKw:
    case TokenKind.RuleKw:
    case TokenKind.SurfaceKw:
    case TokenKind.FromKw:
    case TokenKind.FieldsKw:
    case TokenKind.ActorKw:
    case TokenKind.EnumKw:
    case TokenKind.ValueKw:
    case TokenKind.ModuleKw:
    case TokenKind.ImportKw:
    case TokenKind.ProductKw:
    case TokenKind.IntegrationKw:
    case TokenKind.ScheduleKw:
    case TokenKind.EnvironmentKw:
    case TokenKind.SecretKw:
    case TokenKind.TestKw:
    case TokenKind.DeploymentKw:
    case TokenKind.RenderingKw:
    case TokenKind.ThemeKw:
    case TokenKind.TokensKw:
    case TokenKind.StringsKw:
      return true;
    /* v8 ignore start */
    default:
      return false;
    /* v8 ignore stop */
  }
}
/* v8 ignore stop */

/* v8 ignore start */
function expressionToString(expr: Expression): string {
  if (expr.kind === 'access') return expr.segments.join('.');
  if (expr.kind === 'literal') return String(expr.value);
  return '?';
}
/* v8 ignore stop */

function peek(tokens: readonly Token[], pos: { value: number }): Token | undefined {
  return tokens[pos.value];
}

function advance(tokens: readonly Token[], pos: { value: number }): Token | undefined {
  const tok = tokens[pos.value];
  pos.value++;
  return tok;
}

/* v8 ignore start */
function makeLoc(file: string, tok: Token | { line: number; column: number; pos: number; end: number }): SourceLocation {
  return {
    file,
    line: tok.line,
    column: tok.column,
    endLine: tok.line,
    endColumn: tok.column + ('text' in tok ? tok.text.length : 1),
  };
}
/* v8 ignore stop */

/* v8 ignore start */
function unquote(s: string): string {
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  }
  return s;
}
/* v8 ignore stop */
