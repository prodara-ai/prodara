import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-code-block',
  template: `
    <div class="group relative my-4 overflow-hidden rounded-lg border border-surface-200 bg-surface-950 dark:bg-surface-50">
      @if (filename()) {
        <div class="flex items-center justify-between border-b border-surface-200 bg-surface-900 dark:bg-surface-100 px-4 py-2">
          <span class="font-mono text-xs text-surface-300">{{ filename() }}</span>
          <button
            (click)="copyCode()"
            class="rounded p-1 text-surface-300 transition hover:text-surface-900 opacity-0 group-hover:opacity-100"
            aria-label="Copy code"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>
      }
      <pre class="overflow-x-auto p-4 text-sm leading-relaxed"><code class="font-mono hl-base" [innerHTML]="highlighted()"></code></pre>
    </div>
  `,
})
export class CodeBlockComponent {
  readonly code = input.required<string>();
  readonly language = input('prd');
  readonly filename = input('');

  private readonly sanitizer = inject(DomSanitizer);

  readonly highlighted = computed(() => {
    const html = highlight(this.code(), this.language());
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  copyCode(): void {
    navigator.clipboard.writeText(this.code());
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrap(cls: string, text: string): string {
  return `<span class="hl-${cls}">${esc(text)}</span>`;
}

function highlight(code: string, lang: string): string {
  switch (lang) {
    case 'prd': return highlightPrd(code);
    case 'bash': return highlightBash(code);
    case 'json': return highlightJson(code);
    case 'typescript': return highlightTs(code);
    default: return esc(code);
  }
}

const PRD_DECLARATIONS = new Set([
  'product', 'module', 'entity', 'enum', 'workflow', 'surface', 'actor',
  'test', 'constitution', 'use',
]);

const PRD_PROPERTIES = new Set([
  'capability', 'authorization', 'input', 'output',
  'returns', 'reads', 'writes', 'transitions', 'effects', 'steps', 'rules',
  'policies', 'expect', 'given', 'target', 'kind', 'title', 'version',
  'modules', 'binds', 'actions', 'hooks', 'fields', 'ok', 'error',
  'on', 'call', 'decide', 'fail', 'yes', 'no', 'audit', 'emit', 'notify',
  'stack', 'security', 'privacy', 'testing', 'style', 'generation',
  'architecture', 'applies_to', 'authentication',
  'action', 'surfaces',
]);

const PRD_TYPES = new Set([
  'string', 'integer', 'decimal', 'boolean', 'datetime', 'date', 'uuid',
  'money', 'email', 'optional', 'list',
]);

const PRD_CONSTANTS = new Set(['true', 'false', 'required']);

function highlightPrd(code: string): string {
  return code.split('\n').map(line => {
    // Comments
    if (line.trimStart().startsWith('//')) {
      return wrap('comment', line);
    }
    // Tokenize — capture word+colon as a group so any identifier before ":" is a property
    return line.replace(
      /("(?:[^"\\]|\\.)*")|(\b[a-z_][a-z0-9_.]*\b)(\s*:)?|([{}[\],])|(:)|(\d+)/gi,
      (match, str, word, colon, punct, colonOnly, num) => {
        if (str) return wrap('string', str);
        if (num) return wrap('number', num);
        if (punct) return wrap('punct', punct);
        if (colonOnly) return wrap('punct', colonOnly);
        if (word) {
          const isFollowedByColon = !!colon;
          if (PRD_DECLARATIONS.has(word)) return wrap('keyword', word) + (colon ? wrap('punct', colon) : '');
          if (isFollowedByColon || PRD_PROPERTIES.has(word)) return wrap('prop', word) + (colon ? wrap('punct', colon) : '');
          if (PRD_TYPES.has(word)) return wrap('type', word);
          if (PRD_CONSTANTS.has(word)) return wrap('const', word);
          return esc(word) + (colon ? wrap('punct', colon) : '');
        }
        return esc(match);
      }
    );
  }).join('\n');
}

function highlightBash(code: string): string {
  return code.split('\n').map(line => {
    const trimmed = line.trimStart();
    // Full-line comments
    if (trimmed.startsWith('#')) {
      return wrap('comment', line);
    }
    // Tokenize
    return line.replace(
      /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(--?[\w-]+)|(\$)|(\b(?:prodara|npm|npx|cd|code|mkdir|ls|cat|echo|install)\b)/g,
      (match, dq, sq, flag, dollar, cmd) => {
        if (dq) return wrap('string', dq);
        if (sq) return wrap('string', sq);
        if (flag) return wrap('flag', flag);
        if (dollar) return wrap('prompt', dollar);
        if (cmd) return wrap('cmd', cmd);
        return esc(match);
      }
    );
  }).join('\n');
}

function highlightJson(code: string): string {
  return code.replace(
    /("(?:[^"\\]|\\.)*")\s*(:)|("(?:[^"\\]|\\.)*")|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, key, colon, str, literal, num) => {
      if (key) return wrap('key', key) + esc(colon);
      if (str) return wrap('string', str);
      if (literal) return wrap('const', literal);
      if (num) return wrap('number', num);
      return esc(match);
    }
  );
}

const TS_KEYWORDS = new Set([
  'import', 'from', 'export', 'const', 'let', 'var', 'function', 'return',
  'if', 'else', 'async', 'await', 'new', 'class', 'interface', 'type',
  'extends', 'implements', 'typeof', 'instanceof',
]);

function highlightTs(code: string): string {
  return code.split('\n').map(line => {
    if (line.trimStart().startsWith('//')) {
      return wrap('comment', line);
    }
    return line.replace(
      /("(?:[^"\\]|\\.)*")|('(?:[^"\\]|\\.)*')|(`(?:[^`\\]|\\.)*`)|(\b\d+\b)|(\b[a-zA-Z_$][\w$]*\b)/g,
      (match, dq, sq, tpl, num, word) => {
        if (dq || sq || tpl) return wrap('string', dq || sq || tpl);
        if (num) return wrap('number', num);
        if (word) {
          if (TS_KEYWORDS.has(word)) return wrap('keyword', word);
          return esc(word);
        }
        return esc(match);
      }
    );
  }).join('\n');
}
