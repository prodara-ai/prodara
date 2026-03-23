// ---------------------------------------------------------------------------
// @prodara/cli – bin.ts tests
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockExecFileSync = vi.fn();
const mockResolveLocal = vi.fn();
const mockCheckVersionCompatibility = vi.fn();

vi.mock('node:child_process', () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

vi.mock('../src/resolve.js', () => ({
  resolveLocal: (...args: unknown[]) => mockResolveLocal(...args),
  checkVersionCompatibility: (...args: unknown[]) => mockCheckVersionCompatibility(...args),
}));

// Selective fs mock — bin.ts reads its own package.json and checks file existence
const realFs = await vi.importActual<typeof import('node:fs')>('node:fs');
const mockExistsSync = vi.fn<(p: string) => boolean>();
const mockReadFileSync = vi.fn<(p: string, enc?: string) => string>();

vi.mock('node:fs', async () => {
  const orig = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...orig,
    existsSync: (...args: unknown[]) => mockExistsSync(args[0] as string),
    readFileSync: (...args: unknown[]) => mockReadFileSync(args[0] as string, args[1] as string),
  };
});

// Mock createRequire for resolveBundledCompiler
const mockRequireResolve = vi.fn();
vi.mock('node:module', () => ({
  createRequire: () => ({
    resolve: (...args: unknown[]) => mockRequireResolve(...args),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let stderrOutput: string;
let originalStderrWrite: typeof process.stderr.write;
let originalArgv: string[];
let originalExitCode: number | undefined;

function captureStderr(): void {
  stderrOutput = '';
  originalStderrWrite = process.stderr.write;
  process.stderr.write = ((chunk: string) => {
    stderrOutput += chunk;
    return true;
  }) as typeof process.stderr.write;
}

function restoreStderr(): void {
  process.stderr.write = originalStderrWrite;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let main: () => void;

beforeEach(async () => {
  vi.resetAllMocks();
  originalArgv = process.argv;
  originalExitCode = process.exitCode;
  process.exitCode = undefined;
  captureStderr();

  // Default: resolveLocal returns null (no local compiler)
  mockResolveLocal.mockReturnValue(null);
  // Default: existsSync and readFileSync delegate to real implementations
  mockExistsSync.mockImplementation((p: string) => realFs.existsSync(p));
  mockReadFileSync.mockImplementation((p: string, enc?: string) => realFs.readFileSync(p, enc as BufferEncoding));
  // Default: require.resolve throws (no bundled compiler)
  mockRequireResolve.mockImplementation(() => { throw new Error('not found'); });
  // Default: version compat ok
  mockCheckVersionCompatibility.mockReturnValue({ compatible: true, message: '' });

  const mod = await import('../src/bin.js');
  main = mod.main;
});

afterEach(() => {
  restoreStderr();
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
});

describe('bin', () => {
  it('shows error when no local compiler is found', () => {
    process.argv = ['node', 'prodara', 'build', '.'];
    mockResolveLocal.mockReturnValue(null);
    main();
    expect(stderrOutput).toContain('Could not find a local installation');
    expect(stderrOutput).toContain('prodara init');
    expect(process.exitCode).toBe(1);
  });

  it('delegates to local compiler when found', () => {
    process.argv = ['node', 'prodara', 'build', '.'];
    mockResolveLocal.mockReturnValue({
      packageDir: '/fake/node_modules/@prodara/compiler',
      version: '0.1.0',
      cliEntry: '/fake/node_modules/@prodara/compiler/dist/cli/main.js',
    });
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    main();
    expect(mockExecFileSync).toHaveBeenCalledWith(
      process.execPath,
      ['/fake/node_modules/@prodara/compiler/dist/cli/main.js', 'build', '.'],
      expect.objectContaining({ stdio: 'inherit' }),
    );
  });

  it('propagates exit code from local compiler', () => {
    process.argv = ['node', 'prodara', 'build', '.'];
    mockResolveLocal.mockReturnValue({
      packageDir: '/fake',
      version: '0.1.0',
      cliEntry: '/fake/dist/cli/main.js',
    });
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    mockExecFileSync.mockImplementation(() => {
      const err = new Error('Command failed') as Error & { status: number };
      err.status = 2;
      throw err;
    });
    main();
    expect(process.exitCode).toBe(2);
  });

  it('sets exit code 1 for generic exec errors', () => {
    process.argv = ['node', 'prodara', 'build', '.'];
    mockResolveLocal.mockReturnValue({
      packageDir: '/fake',
      version: '0.1.0',
      cliEntry: '/fake/dist/cli/main.js',
    });
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    mockExecFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
    main();
    expect(process.exitCode).toBe(1);
  });

  it('reports missing CLI binary when package exists but not built', () => {
    process.argv = ['node', 'prodara', 'build', '.'];
    mockResolveLocal.mockReturnValue({
      packageDir: '/fake/node_modules/@prodara/compiler',
      version: '0.1.0',
      cliEntry: '/fake/node_modules/@prodara/compiler/dist/cli/main.js',
    });
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return false;
      return realFs.existsSync(p);
    });
    main();
    expect(stderrOutput).toContain('CLI binary is not built');
    expect(process.exitCode).toBe(1);
  });

  it('shows version compatibility warning but still delegates', () => {
    process.argv = ['node', 'prodara', 'build', '.'];
    mockResolveLocal.mockReturnValue({
      packageDir: '/fake',
      version: '2.0.0',
      cliEntry: '/fake/dist/cli/main.js',
    });
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    mockCheckVersionCompatibility.mockReturnValue({ compatible: false, message: 'Major version mismatch' });
    main();
    expect(stderrOutput).toContain('Major version mismatch');
    expect(mockExecFileSync).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // init bootstrap (no local compiler)
  // -----------------------------------------------------------------------

  it('delegates init to bundled compiler when no local install', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    mockResolveLocal.mockReturnValue(null);
    mockRequireResolve.mockReturnValue('/cli/node_modules/@prodara/compiler/package.json');
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    main();
    expect(mockExecFileSync).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining(['init', '.']),
      expect.objectContaining({ stdio: 'inherit' }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('propagates exit code from bundled compiler init', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    mockResolveLocal.mockReturnValue(null);
    mockRequireResolve.mockReturnValue('/cli/node_modules/@prodara/compiler/package.json');
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    mockExecFileSync.mockImplementation(() => {
      const err = new Error('init failed') as Error & { status: number };
      err.status = 1;
      throw err;
    });
    main();
    expect(process.exitCode).toBe(1);
  });

  it('sets exit code 1 for generic init exec error', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    mockResolveLocal.mockReturnValue(null);
    mockRequireResolve.mockReturnValue('/cli/node_modules/@prodara/compiler/package.json');
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    mockExecFileSync.mockImplementation(() => { throw 'string error'; });
    main();
    expect(process.exitCode).toBe(1);
  });

  it('falls through to error when bundled compiler entry is missing', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    mockResolveLocal.mockReturnValue(null);
    mockRequireResolve.mockReturnValue('/cli/node_modules/@prodara/compiler/package.json');
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('dist/cli/main.js')) return false;
      return realFs.existsSync(p);
    });
    main();
    expect(stderrOutput).toContain('Could not find a local installation');
    expect(process.exitCode).toBe(1);
  });

  it('falls through to error when bundled require.resolve fails', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    mockResolveLocal.mockReturnValue(null);
    mockRequireResolve.mockImplementation(() => { throw new Error('MODULE_NOT_FOUND'); });
    main();
    expect(stderrOutput).toContain('Could not find a local installation');
    expect(process.exitCode).toBe(1);
  });

  // -----------------------------------------------------------------------
  // getWrapperVersion edge cases
  // -----------------------------------------------------------------------

  it('defaults wrapper version to 0.0.0 when package.json is missing', () => {
    process.argv = ['node', 'prodara', 'build', '.'];
    mockExistsSync.mockImplementation((p: string) => {
      if (typeof p === 'string' && p.includes('cli') && p.endsWith('package.json')) return false;
      return realFs.existsSync(p);
    });
    mockResolveLocal.mockReturnValue(null);
    main();
    expect(stderrOutput).toContain('v0.0.0');
  });

  it('defaults wrapper version to 0.0.0 when package.json is invalid', () => {
    process.argv = ['node', 'prodara', 'build', '.'];
    mockReadFileSync.mockImplementation((p: string, enc?: string) => {
      if (typeof p === 'string' && p.includes('cli') && p.endsWith('package.json')) return '{invalid';
      return realFs.readFileSync(p, enc as BufferEncoding);
    });
    mockResolveLocal.mockReturnValue(null);
    main();
    expect(stderrOutput).toContain('v0.0.0');
  });

  it('defaults wrapper version to 0.0.0 when version field is not a string', () => {
    process.argv = ['node', 'prodara', 'build', '.'];
    mockReadFileSync.mockImplementation((p: string, enc?: string) => {
      if (typeof p === 'string' && p.includes('cli') && p.endsWith('package.json')) return JSON.stringify({ version: 42 });
      return realFs.readFileSync(p, enc as BufferEncoding);
    });
    mockResolveLocal.mockReturnValue(null);
    main();
    expect(stderrOutput).toContain('v0.0.0');
  });
});
