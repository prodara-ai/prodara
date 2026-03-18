// ---------------------------------------------------------------------------
// Prodara Compiler — Lexer
// ---------------------------------------------------------------------------

import { DiagnosticBag } from '../diagnostics/diagnostic.js';
import { KEYWORDS } from './keywords.js';
import { SourceFile } from './source.js';
import { Token, TokenKind } from './tokens.js';

export class Lexer {
  private readonly source: SourceFile;
  private readonly bag: DiagnosticBag;
  private pos = 0;

  constructor(source: SourceFile, bag: DiagnosticBag) {
    this.source = source;
    this.bag = bag;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (true) {
      const tok = this.nextToken();
      tokens.push(tok);
      if (tok.kind === TokenKind.EOF) break;
    }
    return tokens;
  }

  private nextToken(): Token {
    this.skipWhitespaceAndComments();
    if (this.pos >= this.source.length) {
      return this.makeToken(TokenKind.EOF, this.pos, this.pos);
    }

    const start = this.pos;
    const ch = this.source.text[start]!;

    // String literal
    if (ch === '"') {
      // Check for code literal (triple quote)
      if (this.source.text[start + 1] === '"' && this.source.text[start + 2] === '"') {
        return this.readCodeLiteral(start);
      }
      return this.readStringLiteral(start);
    }

    // Number or dimension literal
    if (isDigit(ch)) {
      return this.readNumberOrDimension(start);
    }

    // Identifier or keyword
    if (isIdentStart(ch)) {
      return this.readIdentifierOrKeyword(start);
    }

    // Punctuation & operators
    switch (ch) {
      case '{': this.pos++; return this.makeToken(TokenKind.OpenBrace, start, this.pos);
      case '}': this.pos++; return this.makeToken(TokenKind.CloseBrace, start, this.pos);
      case '[': this.pos++; return this.makeToken(TokenKind.OpenBracket, start, this.pos);
      case ']': this.pos++; return this.makeToken(TokenKind.CloseBracket, start, this.pos);
      case '(': this.pos++; return this.makeToken(TokenKind.OpenParen, start, this.pos);
      case ')': this.pos++; return this.makeToken(TokenKind.CloseParen, start, this.pos);
      case ':': this.pos++; return this.makeToken(TokenKind.Colon, start, this.pos);
      case ',': this.pos++; return this.makeToken(TokenKind.Comma, start, this.pos);
      case '@': this.pos++; return this.makeToken(TokenKind.AtSign, start, this.pos);
      case '/': this.pos++; return this.makeToken(TokenKind.Slash, start, this.pos);
      case '.':
        if (this.source.text[start + 1] === '.') {
          this.pos += 2;
          return this.makeToken(TokenKind.DotDot, start, this.pos);
        }
        this.pos++;
        return this.makeToken(TokenKind.Dot, start, this.pos);
      case '-':
        if (this.source.text[start + 1] === '>') {
          this.pos += 2;
          return this.makeToken(TokenKind.Arrow, start, this.pos);
        }
        // Negative numbers are not in the spec; fall through to unknown
        this.pos++;
        return this.errorToken(start, `Unexpected character: '${ch}'`);
      case '=':
        if (this.source.text[start + 1] === '=') {
          this.pos += 2;
          return this.makeToken(TokenKind.EqualsEquals, start, this.pos);
        }
        this.pos++;
        return this.makeToken(TokenKind.Equals, start, this.pos);
      case '!':
        if (this.source.text[start + 1] === '=') {
          this.pos += 2;
          return this.makeToken(TokenKind.BangEquals, start, this.pos);
        }
        this.pos++;
        return this.errorToken(start, `Unexpected character: '${ch}'`);
      case '<':
        if (this.source.text[start + 1] === '=') {
          this.pos += 2;
          return this.makeToken(TokenKind.LessEqual, start, this.pos);
        }
        this.pos++;
        return this.makeToken(TokenKind.LessThan, start, this.pos);
      case '>':
        if (this.source.text[start + 1] === '=') {
          this.pos += 2;
          return this.makeToken(TokenKind.GreaterEqual, start, this.pos);
        }
        this.pos++;
        return this.makeToken(TokenKind.GreaterThan, start, this.pos);
      default:
        this.pos++;
        return this.errorToken(start, `Unexpected character: '${ch}'`);
    }
  }

  private readStringLiteral(start: number): Token {
    this.pos++; // skip opening "
    while (this.pos < this.source.length) {
      const c = this.source.text[this.pos]!;
      if (c === '\\') {
        this.pos += 2; // skip escape sequence
        continue;
      }
      if (c === '"') {
        this.pos++;
        return this.makeToken(TokenKind.StringLiteral, start, this.pos);
      }
      if (c === '\n' || c === '\r') {
        break; // unterminated
      }
      this.pos++;
    }
    return this.errorToken(start, 'Unterminated string literal');
  }

  private readCodeLiteral(start: number): Token {
    this.pos += 3; // skip opening """
    // The opening """ must be followed by a newline per spec
    if (this.pos < this.source.length && this.source.text[this.pos] === '\n') {
      this.pos++;
    } else if (this.pos + 1 < this.source.length && this.source.text[this.pos] === '\r' && this.source.text[this.pos + 1] === '\n') {
      this.pos += 2;
    }

    while (this.pos < this.source.length) {
      if (
        this.source.text[this.pos] === '"' &&
        this.source.text[this.pos + 1] === '"' &&
        this.source.text[this.pos + 2] === '"'
      ) {
        this.pos += 3;
        return this.makeToken(TokenKind.CodeLiteral, start, this.pos);
      }
      this.pos++;
    }
    return this.errorToken(start, 'Unterminated code literal');
  }

  private readNumberOrDimension(start: number): Token {
    // Read integer part
    while (this.pos < this.source.length && isDigit(this.source.text[this.pos]!)) {
      this.pos++;
    }

    let isDecimal = false;
    // Check for decimal point (but not ..)
    if (
      this.pos < this.source.length &&
      this.source.text[this.pos] === '.' &&
      this.source.text[this.pos + 1] !== '.'
    ) {
      const next = this.source.text[this.pos + 1];
      if (next !== undefined && isDigit(next)) {
        isDecimal = true;
        this.pos++; // skip dot
        while (this.pos < this.source.length && isDigit(this.source.text[this.pos]!)) {
          this.pos++;
        }
      }
    }

    // Check for dimension suffix (e.g. 1fr, 240px)
    if (this.pos < this.source.length && isIdentStart(this.source.text[this.pos]!)) {
      while (this.pos < this.source.length && isIdentContinue(this.source.text[this.pos]!)) {
        this.pos++;
      }
      return this.makeToken(TokenKind.DimensionLiteral, start, this.pos);
    }

    return this.makeToken(isDecimal ? TokenKind.DecimalLiteral : TokenKind.IntegerLiteral, start, this.pos);
  }

  private readIdentifierOrKeyword(start: number): Token {
    while (this.pos < this.source.length && isIdentContinue(this.source.text[this.pos]!)) {
      this.pos++;
    }
    const text = this.source.text.slice(start, this.pos);
    const kwKind = KEYWORDS.get(text);
    if (kwKind !== undefined) {
      return this.makeToken(kwKind, start, this.pos);
    }
    return this.makeToken(TokenKind.Identifier, start, this.pos);
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.source.length) {
      const ch = this.source.text[this.pos]!;
      // Whitespace
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.pos++;
        continue;
      }
      // Line comment
      if (ch === '/' && this.source.text[this.pos + 1] === '/') {
        this.pos += 2;
        while (this.pos < this.source.length && this.source.text[this.pos] !== '\n') {
          this.pos++;
        }
        continue;
      }
      // Block comment
      if (ch === '/' && this.source.text[this.pos + 1] === '*') {
        const commentStart = this.pos;
        this.pos += 2;
        while (this.pos < this.source.length) {
          if (this.source.text[this.pos] === '*' && this.source.text[this.pos + 1] === '/') {
            this.pos += 2;
            break;
          }
          this.pos++;
        }
        /* v8 ignore next */
        if (this.pos >= this.source.length && !(this.source.text[this.pos - 1] === '/' && this.source.text[this.pos - 2] === '*')) {
          const loc = this.source.getLineAndColumn(commentStart);
          this.bag.add({
            phase: 'lexer',
            category: 'lexical_error',
            severity: 'error',
            code: 'PRD0002',
            message: 'Unterminated block comment',
            file: this.source.path,
            line: loc.line,
            column: loc.column,
          });
        }
        continue;
      }
      break;
    }
  }

  private makeToken(kind: TokenKind, start: number, end: number): Token {
    const { line, column } = this.source.getLineAndColumn(start);
    return {
      kind,
      text: this.source.text.slice(start, end),
      pos: start,
      line,
      column,
      end,
    };
  }

  private errorToken(start: number, message: string): Token {
    const { line, column } = this.source.getLineAndColumn(start);
    this.bag.add({
      phase: 'lexer',
      category: 'lexical_error',
      severity: 'error',
      code: 'PRD0001',
      message,
      file: this.source.path,
      line,
      column,
    });
    return this.makeToken(TokenKind.Unknown, start, this.pos);
  }
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isIdentContinue(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch);
}
