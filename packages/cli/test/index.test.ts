// ---------------------------------------------------------------------------
// @prodara/cli – index.ts barrel re-export test
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { resolveLocal, parseSemver, checkVersionCompatibility, printHelp, printVersion, bootstrapInit } from '../src/index.js';

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

  it('re-exports printHelp', () => {
    expect(typeof printHelp).toBe('function');
  });

  it('re-exports printVersion', () => {
    expect(typeof printVersion).toBe('function');
  });

  it('re-exports bootstrapInit', () => {
    expect(typeof bootstrapInit).toBe('function');
  });
});
