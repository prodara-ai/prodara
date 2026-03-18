import { describe, it, expect } from 'vitest';
import { TokenKind } from '../src/lexer/tokens.js';
import { SourceFile } from '../src/lexer/source.js';
import { lex } from './helpers.js';

describe('Lexer', () => {
  // -----------------------------------------------------------------------
  // Whitespace & comments
  // -----------------------------------------------------------------------
  describe('whitespace and comments', () => {
    it('skips spaces, tabs, and newlines', () => {
      const { tokens } = lex('  \t\n\r\n  ');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]!.kind).toBe(TokenKind.EOF);
    });

    it('skips line comments', () => {
      const { tokens } = lex('// this is a comment\nproduct');
      const kinds = tokens.map((t) => t.kind);
      expect(kinds).toEqual([TokenKind.ProductKw, TokenKind.EOF]);
    });

    it('skips block comments', () => {
      const { tokens } = lex('/* block\ncomment */product');
      expect(tokens[0]!.kind).toBe(TokenKind.ProductKw);
    });

    it('reports unterminated block comment', () => {
      const { bag } = lex('/* unterminated');
      expect(bag.hasErrors).toBe(true);
      expect(bag.errors[0]!.code).toBe('PRD0002');
    });
  });

  // -----------------------------------------------------------------------
  // String literals
  // -----------------------------------------------------------------------
  describe('string literals', () => {
    it('lexes simple string', () => {
      const { tokens } = lex('"hello world"');
      expect(tokens[0]!.kind).toBe(TokenKind.StringLiteral);
      expect(tokens[0]!.text).toBe('"hello world"');
    });

    it('lexes string with escape sequences', () => {
      const { tokens } = lex('"hello\\nworld"');
      expect(tokens[0]!.kind).toBe(TokenKind.StringLiteral);
    });

    it('reports unterminated string', () => {
      const { bag } = lex('"unterminated');
      expect(bag.hasErrors).toBe(true);
    });

    it('reports unterminated string at newline', () => {
      const { bag } = lex('"unterminated\nmore');
      expect(bag.hasErrors).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Code literals (triple-quoted)
  // -----------------------------------------------------------------------
  describe('code literals', () => {
    it('lexes triple-quoted code literal', () => {
      const { tokens } = lex('"""\nsome code\n"""');
      expect(tokens[0]!.kind).toBe(TokenKind.CodeLiteral);
    });

    it('reports unterminated code literal', () => {
      const { bag } = lex('"""\ncode without end');
      expect(bag.hasErrors).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Number literals
  // -----------------------------------------------------------------------
  describe('number literals', () => {
    it('lexes integer', () => {
      const { tokens } = lex('42');
      expect(tokens[0]!.kind).toBe(TokenKind.IntegerLiteral);
      expect(tokens[0]!.text).toBe('42');
    });

    it('lexes decimal', () => {
      const { tokens } = lex('3.14');
      expect(tokens[0]!.kind).toBe(TokenKind.DecimalLiteral);
      expect(tokens[0]!.text).toBe('3.14');
    });

    it('lexes dimension literal', () => {
      const { tokens } = lex('1fr');
      expect(tokens[0]!.kind).toBe(TokenKind.DimensionLiteral);
      expect(tokens[0]!.text).toBe('1fr');
    });

    it('lexes pixel dimension', () => {
      const { tokens } = lex('240px');
      expect(tokens[0]!.kind).toBe(TokenKind.DimensionLiteral);
      expect(tokens[0]!.text).toBe('240px');
    });

    it('integer followed by dot-dot is not decimal', () => {
      const { tokens } = lex('1..2');
      expect(tokens[0]!.kind).toBe(TokenKind.IntegerLiteral);
      expect(tokens[1]!.kind).toBe(TokenKind.DotDot);
      expect(tokens[2]!.kind).toBe(TokenKind.IntegerLiteral);
    });
  });

  // -----------------------------------------------------------------------
  // Boolean literals
  // -----------------------------------------------------------------------
  describe('boolean literals', () => {
    it('lexes true', () => {
      const { tokens } = lex('true');
      expect(tokens[0]!.kind).toBe(TokenKind.BooleanTrue);
    });

    it('lexes false', () => {
      const { tokens } = lex('false');
      expect(tokens[0]!.kind).toBe(TokenKind.BooleanFalse);
    });
  });

  // -----------------------------------------------------------------------
  // Keywords
  // -----------------------------------------------------------------------
  describe('keywords', () => {
    it('recognizes product keyword', () => {
      const { tokens } = lex('product');
      expect(tokens[0]!.kind).toBe(TokenKind.ProductKw);
    });

    it('recognizes module keyword', () => {
      const { tokens } = lex('module');
      expect(tokens[0]!.kind).toBe(TokenKind.ModuleKw);
    });

    it('recognizes entity keyword', () => {
      const { tokens } = lex('entity');
      expect(tokens[0]!.kind).toBe(TokenKind.EntityKw);
    });

    it('recognizes workflow keyword', () => {
      const { tokens } = lex('workflow');
      expect(tokens[0]!.kind).toBe(TokenKind.WorkflowKw);
    });

    it('does not recognize non-keyword identifiers', () => {
      const { tokens } = lex('my_variable');
      expect(tokens[0]!.kind).toBe(TokenKind.Identifier);
      expect(tokens[0]!.text).toBe('my_variable');
    });

    it('recognizes all boolean expression keywords', () => {
      const { tokens } = lex('and or not');
      expect(tokens[0]!.kind).toBe(TokenKind.AndKw);
      expect(tokens[1]!.kind).toBe(TokenKind.OrKw);
      expect(tokens[2]!.kind).toBe(TokenKind.NotKw);
    });
  });

  // -----------------------------------------------------------------------
  // Identifiers
  // -----------------------------------------------------------------------
  describe('identifiers', () => {
    it('lexes simple identifier', () => {
      const { tokens } = lex('task_id');
      expect(tokens[0]!.kind).toBe(TokenKind.Identifier);
      expect(tokens[0]!.text).toBe('task_id');
    });

    it('allows underscores in identifiers', () => {
      const { tokens } = lex('_private my_var A1');
      expect(tokens[0]!.kind).toBe(TokenKind.Identifier);
      expect(tokens[1]!.kind).toBe(TokenKind.Identifier);
      expect(tokens[2]!.kind).toBe(TokenKind.Identifier);
    });
  });

  // -----------------------------------------------------------------------
  // Punctuation & operators
  // -----------------------------------------------------------------------
  describe('punctuation', () => {
    it('lexes braces', () => {
      const { tokens } = lex('{}');
      expect(tokens[0]!.kind).toBe(TokenKind.OpenBrace);
      expect(tokens[1]!.kind).toBe(TokenKind.CloseBrace);
    });

    it('lexes brackets', () => {
      const { tokens } = lex('[]');
      expect(tokens[0]!.kind).toBe(TokenKind.OpenBracket);
      expect(tokens[1]!.kind).toBe(TokenKind.CloseBracket);
    });

    it('lexes parens', () => {
      const { tokens } = lex('()');
      expect(tokens[0]!.kind).toBe(TokenKind.OpenParen);
      expect(tokens[1]!.kind).toBe(TokenKind.CloseParen);
    });

    it('lexes colon, comma, dot', () => {
      const { tokens } = lex(':,.');
      expect(tokens[0]!.kind).toBe(TokenKind.Colon);
      expect(tokens[1]!.kind).toBe(TokenKind.Comma);
      expect(tokens[2]!.kind).toBe(TokenKind.Dot);
    });

    it('lexes arrow', () => {
      const { tokens } = lex('->');
      expect(tokens[0]!.kind).toBe(TokenKind.Arrow);
    });

    it('lexes equals', () => {
      const { tokens } = lex('=');
      expect(tokens[0]!.kind).toBe(TokenKind.Equals);
    });

    it('lexes dot-dot', () => {
      const { tokens } = lex('..');
      expect(tokens[0]!.kind).toBe(TokenKind.DotDot);
    });
  });

  // -----------------------------------------------------------------------
  // Comparison operators
  // -----------------------------------------------------------------------
  describe('comparison operators', () => {
    it('lexes ==', () => {
      const { tokens } = lex('==');
      expect(tokens[0]!.kind).toBe(TokenKind.EqualsEquals);
    });

    it('lexes !=', () => {
      const { tokens } = lex('!=');
      expect(tokens[0]!.kind).toBe(TokenKind.BangEquals);
    });

    it('lexes < and <=', () => {
      const { tokens } = lex('< <=');
      expect(tokens[0]!.kind).toBe(TokenKind.LessThan);
      expect(tokens[1]!.kind).toBe(TokenKind.LessEqual);
    });

    it('lexes > and >=', () => {
      const { tokens } = lex('> >=');
      expect(tokens[0]!.kind).toBe(TokenKind.GreaterThan);
      expect(tokens[1]!.kind).toBe(TokenKind.GreaterEqual);
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  describe('error tokens', () => {
    it('produces Unknown for unexpected characters', () => {
      const { tokens, bag } = lex('#');
      expect(tokens[0]!.kind).toBe(TokenKind.Unknown);
      expect(bag.hasErrors).toBe(true);
    });

    it('continues lexing after error', () => {
      const { tokens } = lex('# product');
      const kinds = tokens.map((t) => t.kind);
      expect(kinds).toContain(TokenKind.ProductKw);
    });
  });

  // -----------------------------------------------------------------------
  // Source locations
  // -----------------------------------------------------------------------
  describe('source locations', () => {
    it('tracks line and column correctly', () => {
      const { tokens } = lex('product\nmodule');
      expect(tokens[0]!.line).toBe(1);
      expect(tokens[0]!.column).toBe(1);
      expect(tokens[1]!.line).toBe(2);
      expect(tokens[1]!.column).toBe(1);
    });

    it('handles tab stops', () => {
      const { tokens } = lex('\tproduct');
      expect(tokens[0]!.column).toBe(2); // 1-based, tab is 1 char
    });
  });

  // -----------------------------------------------------------------------
  // Full token sequences
  // -----------------------------------------------------------------------
  describe('token sequences', () => {
    it('tokenizes simple entity declaration', () => {
      const src = 'entity task { task_id: uuid }';
      const { tokens } = lex(src);
      const kinds = tokens.map((t) => t.kind);
      expect(kinds).toEqual([
        TokenKind.EntityKw,
        TokenKind.Identifier,
        TokenKind.OpenBrace,
        TokenKind.Identifier,
        TokenKind.Colon,
        TokenKind.Identifier,
        TokenKind.CloseBrace,
        TokenKind.EOF,
      ]);
    });

    it('tokenizes type with generic', () => {
      const src = 'optional<string>';
      const { tokens } = lex(src);
      const kinds = tokens.map((t) => t.kind);
      expect(kinds).toEqual([
        TokenKind.Identifier,
        TokenKind.LessThan,
        TokenKind.Identifier,
        TokenKind.GreaterThan,
        TokenKind.EOF,
      ]);
    });
  });

  describe('Error tokens', () => {
    it('produces error for bare !', () => {
      const { tokens, bag } = lex('!');
      expect(bag.hasErrors).toBe(true);
      expect(tokens[0]!.kind).toBe(TokenKind.Unknown);
    });

    it('tokenizes bare < as LessThan', () => {
      const { tokens } = lex('<');
      expect(tokens[0]!.kind).toBe(TokenKind.LessThan);
    });
  });

  describe('Code literal edge cases', () => {
    it('handles code literal with CR+LF newline', () => {
      const src = '"""\r\n  hello\r\n"""';
      const { tokens } = lex(src);
      expect(tokens[0]!.kind).toBe(TokenKind.CodeLiteral);
    });
  });

  describe('Source file edge cases', () => {
    it('handles bare CR line endings', () => {
      const sf = new SourceFile('test.prd', 'line1\rline2\rline3');
      const { line, column } = sf.getLineAndColumn(6); // 'l' of 'line2'
      expect(line).toBe(2);
      expect(column).toBe(1);
    });

    it('handles empty source', () => {
      const sf = new SourceFile('test.prd', '');
      const { line, column } = sf.getLineAndColumn(0);
      expect(line).toBe(1);
      expect(column).toBe(1);
    });

    it('handles offset beyond end of source', () => {
      const sf = new SourceFile('test.prd', 'abc');
      const { line, column } = sf.getLineAndColumn(100);
      // Should still return a valid line/column (graceful fallback)
      expect(line).toBeGreaterThan(0);
      expect(column).toBeGreaterThan(0);
    });
  });

  describe('Lexer edge cases', () => {
    it('tokenizes bare - as error', () => {
      const { tokens, bag } = lex('-');
      expect(bag.hasErrors).toBe(true);
    });

    it('tokenizes -> as arrow', () => {
      const { tokens } = lex('->');
      expect(tokens[0]!.kind).toBe(TokenKind.Arrow);
    });

    it('reports error for unterminated block comment', () => {
      const { bag } = lex('/* unclosed comment');
      expect(bag.hasErrors).toBe(true);
    });

    it('tokenizes == as EqualsEquals', () => {
      const { tokens } = lex('==');
      expect(tokens[0]!.kind).toBe(TokenKind.EqualsEquals);
    });
  });
});
