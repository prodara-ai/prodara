// ---------------------------------------------------------------------------
// UI utilities tests
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ora before importing ui.ts
const mockOra = vi.fn();
vi.mock('ora', () => ({
  default: (...args: unknown[]) => mockOra(...args),
}));

import {
  bold, dim, green, red, yellow, cyan,
  success, error, warn, info,
  phaseIcon, banner, box, table,
  isInteractive, createSpinner, stripAnsi,
} from '../src/cli/ui.js';

describe('UI utilities', () => {
  // -----------------------------------------------------------------------
  // Color helpers (identity-like — just verify they return strings)
  // -----------------------------------------------------------------------
  describe('color helpers', () => {
    it('bold wraps text', () => {
      const result = bold('hello');
      expect(stripAnsi(result)).toBe('hello');
    });

    it('dim wraps text', () => {
      const result = dim('hello');
      expect(stripAnsi(result)).toBe('hello');
    });

    it('green wraps text', () => {
      const result = green('hello');
      expect(stripAnsi(result)).toBe('hello');
    });

    it('red wraps text', () => {
      const result = red('hello');
      expect(stripAnsi(result)).toBe('hello');
    });

    it('yellow wraps text', () => {
      const result = yellow('hello');
      expect(stripAnsi(result)).toBe('hello');
    });

    it('cyan wraps text', () => {
      const result = cyan('hello');
      expect(stripAnsi(result)).toBe('hello');
    });
  });

  // -----------------------------------------------------------------------
  // Status message helpers
  // -----------------------------------------------------------------------
  describe('status messages', () => {
    it('success returns ✓ + message', () => {
      const result = stripAnsi(success('done'));
      expect(result).toBe('✓ done');
    });

    it('error returns ✗ + message', () => {
      const result = stripAnsi(error('fail'));
      expect(result).toBe('✗ fail');
    });

    it('warn returns ⚠ + message', () => {
      const result = stripAnsi(warn('careful'));
      expect(result).toBe('⚠ careful');
    });

    it('info returns ℹ + message', () => {
      const result = stripAnsi(info('note'));
      expect(result).toBe('ℹ note');
    });
  });

  // -----------------------------------------------------------------------
  // Phase icons
  // -----------------------------------------------------------------------
  describe('phaseIcon', () => {
    it('ok returns ✓', () => {
      expect(stripAnsi(phaseIcon('ok'))).toBe('✓');
    });

    it('warn returns ⚠', () => {
      expect(stripAnsi(phaseIcon('warn'))).toBe('⚠');
    });

    it('error returns ✗', () => {
      expect(stripAnsi(phaseIcon('error'))).toBe('✗');
    });

    it('skip returns ○', () => {
      expect(stripAnsi(phaseIcon('skip'))).toBe('○');
    });

    it('skipped returns ○', () => {
      expect(stripAnsi(phaseIcon('skipped'))).toBe('○');
    });
  });

  // -----------------------------------------------------------------------
  // Banner
  // -----------------------------------------------------------------------
  describe('banner', () => {
    it('creates boxed banner with text', () => {
      const result = banner('Test');
      const plain = stripAnsi(result);
      const lines = plain.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toMatch(/^┌─+┐$/);
      expect(lines[1]).toContain('Test');
      expect(lines[2]).toMatch(/^└─+┘$/);
    });

    it('banner handles empty text', () => {
      const result = banner('');
      const plain = stripAnsi(result);
      expect(plain).toContain('┌');
      expect(plain).toContain('┘');
    });
  });

  // -----------------------------------------------------------------------
  // Box
  // -----------------------------------------------------------------------
  describe('box', () => {
    it('creates titled box with lines', () => {
      const result = box('Title', ['line one', 'line two']);
      const plain = stripAnsi(result);
      const lines = plain.split('\n');
      expect(lines[0]).toMatch(/^┌─+┐$/);
      expect(lines[1]).toContain('Title');
      expect(lines[2]).toContain('line one');
      expect(lines[3]).toContain('line two');
      expect(lines[4]).toMatch(/^└─+┘$/);
    });

    it('box handles empty lines array', () => {
      const result = box('Empty', []);
      const plain = stripAnsi(result);
      expect(plain).toContain('Empty');
      expect(plain).toContain('┌');
    });
  });

  // -----------------------------------------------------------------------
  // Table
  // -----------------------------------------------------------------------
  describe('table', () => {
    it('creates aligned table with headers and rows', () => {
      const result = table(['Name', 'Value'], [['foo', 'bar'], ['baz', 'qux']]);
      const plain = stripAnsi(result);
      const lines = plain.split('\n');
      expect(lines).toHaveLength(4); // header, separator, 2 rows
      expect(lines[0]).toContain('Name');
      expect(lines[0]).toContain('Value');
      expect(lines[1]).toContain('─');
      expect(lines[2]).toContain('foo');
      expect(lines[2]).toContain('bar');
      expect(lines[3]).toContain('baz');
    });

    it('handles empty rows', () => {
      const result = table(['A', 'B'], []);
      const plain = stripAnsi(result);
      const lines = plain.split('\n');
      expect(lines).toHaveLength(2); // header + separator only
      expect(lines[0]).toContain('A');
    });

    it('handles missing cell values', () => {
      const result = table(['A', 'B'], [['x']]);
      const plain = stripAnsi(result);
      expect(plain).toContain('x');
    });
  });

  // -----------------------------------------------------------------------
  // isInteractive
  // -----------------------------------------------------------------------
  describe('isInteractive', () => {
    const origTTY = process.stdout.isTTY;
    const origCI = process.env['CI'];

    afterEach(() => {
      Object.defineProperty(process.stdout, 'isTTY', { value: origTTY, writable: true });
      if (origCI === undefined) {
        delete process.env['CI'];
      } else {
        process.env['CI'] = origCI;
      }
    });

    it('returns true when TTY and no CI', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      delete process.env['CI'];
      expect(isInteractive()).toBe(true);
    });

    it('returns false when not TTY', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });
      delete process.env['CI'];
      expect(isInteractive()).toBe(false);
    });

    it('returns false when CI is set', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      process.env['CI'] = 'true';
      expect(isInteractive()).toBe(false);
    });

    it('returns false when TTY is undefined', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: undefined, writable: true });
      delete process.env['CI'];
      expect(isInteractive()).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // createSpinner
  // -----------------------------------------------------------------------
  describe('createSpinner', () => {
    const origTTY = process.stdout.isTTY;

    afterEach(() => {
      Object.defineProperty(process.stdout, 'isTTY', { value: origTTY, writable: true });
    });

    it('returns no-op spinner when not interactive', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });
      const spinner = createSpinner('loading');
      expect(spinner.text).toBe('loading');
      // no-op methods return self
      expect(spinner.start()).toBe(spinner);
      expect(spinner.succeed()).toBe(spinner);
      expect(spinner.fail()).toBe(spinner);
      expect(spinner.stop()).toBe(spinner);
    });

    it('returns ora-backed spinner when interactive', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      delete process.env['CI'];

      const mockSpinnerInstance = {
        start: vi.fn(),
        succeed: vi.fn(),
        fail: vi.fn(),
        stop: vi.fn(),
        text: 'loading',
      };
      mockOra.mockReturnValue(mockSpinnerInstance);

      const spinner = createSpinner('loading');
      spinner.start('starting');
      expect(mockSpinnerInstance.start).toHaveBeenCalledWith('starting');
      spinner.succeed('done');
      expect(mockSpinnerInstance.succeed).toHaveBeenCalledWith('done');
      spinner.fail('oops');
      expect(mockSpinnerInstance.fail).toHaveBeenCalledWith('oops');
      spinner.stop();
      expect(mockSpinnerInstance.stop).toHaveBeenCalled();
      spinner.text = 'updated';
      expect(mockSpinnerInstance.text).toBe('updated');
      expect(spinner.text).toBe('updated');
    });
  });

  // -----------------------------------------------------------------------
  // stripAnsi
  // -----------------------------------------------------------------------
  describe('stripAnsi', () => {
    it('removes ANSI escape codes', () => {
      expect(stripAnsi('\x1b[32mhello\x1b[0m')).toBe('hello');
    });

    it('returns plain text unchanged', () => {
      expect(stripAnsi('hello')).toBe('hello');
    });

    it('handles empty string', () => {
      expect(stripAnsi('')).toBe('');
    });
  });
});
