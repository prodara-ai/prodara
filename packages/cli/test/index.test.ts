// ---------------------------------------------------------------------------
// @prodara/cli – index.ts barrel re-export test
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { resolveLocal, parseSemver, checkVersionCompatibility } from '../src/index.js';

describe('index', () => {
  it('re-exports resolveLocal', () => {
    expect(typeof resolveLocal).toBe('function');
  });

  it('re-exports parseSemver', () => {
    expect(typeof parseSemver).toBe('function');
  });

  it('re-exports checkVersionCompatibility', () => {
    expect(typeof checkVersionCompatibility).toBe('function');
  });
});
