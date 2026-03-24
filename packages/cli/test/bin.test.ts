// ---------------------------------------------------------------------------
// @prodara/cli – bin.ts tests
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockExecFileSync = vi.fn();
const mockExecSync = vi.fn();
const mockResolveLocal = vi.fn();
const mockCheckVersionCompatibility = vi.fn();

vi.mock('node:child_process', () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
  execSync: (...args: unknown[]) => mockExecSync(...args),
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
    realpathSync: orig.realpathSync,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let stderrOutput: string;
let stdoutOutput: string;
let originalStderrWrite: typeof process.stderr.write;
let originalStdoutWrite: typeof process.stdout.write;
let originalArgv: string[];
let originalExitCode: number | undefined;

function captureOutput(): void {
  stderrOutput = '';
  stdoutOutput = '';
  originalStderrWrite = process.stderr.write;
  originalStdoutWrite = process.stdout.write;
  process.stderr.write = ((chunk: string) => {
    stderrOutput += chunk;
    return true;
  }) as typeof process.stderr.write;
  process.stdout.write = ((chunk: string) => {
    stdoutOutput += chunk;
    return true;
  }) as typeof process.stdout.write;
}

function restoreOutput(): void {
  process.stderr.write = originalStderrWrite;
  process.stdout.write = originalStdoutWrite;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let main: () => void;
let printHelp: (version: string) => void;
let printVersion: (wrapperVersion: string, localVersion: string | null) => void;
let bootstrapInit: (cwd: string, wrapperVersion: string) => boolean;

beforeEach(async () => {
  vi.resetAllMocks();
  originalArgv = process.argv;
  originalExitCode = process.exitCode;
  process.exitCode = undefined;
  captureOutput();

  // Default: resolveLocal returns null (no local compiler)
  mockResolveLocal.mockReturnValue(null);
  // Default: existsSync and readFileSync delegate to real implementations
  mockExistsSync.mockImplementation((p: string) => realFs.existsSync(p));
  mockReadFileSync.mockImplementation((p: string, enc?: string) => realFs.readFileSync(p, enc as BufferEncoding));
  // Default: version compat ok
  mockCheckVersionCompatibility.mockReturnValue({ compatible: true, message: '' });

  const mod = await import('../src/bin.js');
  main = mod.main;
  printHelp = mod.printHelp;
  printVersion = mod.printVersion;
  bootstrapInit = mod.bootstrapInit;
});

afterEach(() => {
  restoreOutput();
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

  it('bootstraps init: creates package.json, installs compiler, delegates', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    // First call: no local. After bootstrap installs compiler, second call returns local.
    mockResolveLocal.mockReturnValueOnce(null).mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    // Simulate no package.json in cwd
    const cwd = process.cwd();
    mockExistsSync.mockImplementation((p: string) => {
      if (p === cwd + '/package.json' || p === cwd + '\\package.json') return false;
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    main();
    // npm init should have been called
    expect(mockExecSync).toHaveBeenCalledWith('npm init -y', expect.objectContaining({ cwd: expect.any(String) }));
    // npm install should have been called
    expect(mockExecSync).toHaveBeenCalledWith('npm install --save-dev @prodara/compiler', expect.objectContaining({ cwd: expect.any(String) }));
    // Should delegate to local compiler with --skip-install
    expect(mockExecFileSync).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining(['init', '.', '--skip-install']),
      expect.objectContaining({ stdio: 'inherit' }),
    );
  });

  it('init bootstrap skips npm init when package.json exists', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(null).mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    // package.json exists, so npm init should be skipped
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    main();
    // npm init should NOT have been called
    expect(mockExecSync).not.toHaveBeenCalledWith('npm init -y', expect.anything());
    // npm install should still be called
    expect(mockExecSync).toHaveBeenCalledWith('npm install --save-dev @prodara/compiler', expect.objectContaining({ cwd: expect.any(String) }));
    expect(mockExecFileSync).toHaveBeenCalled();
  });

  it('propagates exit code from compiler init delegation', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(null).mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    mockExecFileSync.mockImplementation(() => {
      const err = new Error('init failed') as Error & { status: number };
      err.status = 2;
      throw err;
    });
    main();
    expect(process.exitCode).toBe(2);
  });

  it('sets exit code 1 for generic init delegation error', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(null).mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    mockExecFileSync.mockImplementation(() => { throw 'string error'; });
    main();
    expect(process.exitCode).toBe(1);
  });

  it('fails when npm init fails', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    mockResolveLocal.mockReturnValue(null);
    const cwd = process.cwd();
    mockExistsSync.mockImplementation((p: string) => {
      if (p === cwd + '/package.json' || p === cwd + '\\package.json') return false;
      return realFs.existsSync(p);
    });
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd === 'npm init -y') throw new Error('npm failed');
    });
    main();
    expect(stderrOutput).toContain('Failed to initialize npm project');
    expect(process.exitCode).toBe(1);
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('fails when npm install fails', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    mockResolveLocal.mockReturnValue(null);
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('npm install')) throw new Error('install failed');
    });
    main();
    expect(stderrOutput).toContain('Failed to install @prodara/compiler');
    expect(process.exitCode).toBe(1);
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('fails when compiler installs but cannot be resolved', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    // resolveLocal always returns null even after install
    mockResolveLocal.mockReturnValue(null);
    main();
    expect(stderrOutput).toContain('could not resolve');
    expect(process.exitCode).toBe(1);
  });

  it('fails when compiler entry is missing after bootstrap', () => {
    process.argv = ['node', 'prodara', 'init', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    // First resolveLocal: null (triggers bootstrap).
    // bootstrapInit's internal call: returns local (bootstrap succeeds).
    // main()'s re-resolve: returns local but cliEntry doesn't exist.
    mockResolveLocal.mockReturnValueOnce(null).mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return false;
      return realFs.existsSync(p);
    });
    main();
    expect(stderrOutput).toContain('could not resolve');
    expect(process.exitCode).toBe(1);
  });

  it('does not add --skip-install when already present', () => {
    process.argv = ['node', 'prodara', 'init', '.', '--skip-install'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(null).mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    main();
    // Should only have one --skip-install, not two
    const callArgs = mockExecFileSync.mock.calls[0][1] as string[];
    const skipCount = callArgs.filter((a: string) => a === '--skip-install').length;
    expect(skipCount).toBe(1);
  });

  // -----------------------------------------------------------------------
  // upgrade bootstrap (no local compiler)
  // -----------------------------------------------------------------------

  it('upgrade bootstraps when no local compiler exists', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.2.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(null).mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    main();
    expect(mockExecSync).toHaveBeenCalledWith('npm install --save-dev @prodara/compiler', expect.objectContaining({ cwd: expect.any(String) }));
    expect(mockExecFileSync).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining(['upgrade', '.', '--skip-install']),
      expect.objectContaining({ stdio: 'inherit' }),
    );
  });

  it('upgrade bootstrap fails when install fails', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.'];
    mockResolveLocal.mockReturnValue(null);
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('npm install')) throw new Error('install failed');
    });
    main();
    expect(stderrOutput).toContain('Failed to install @prodara/compiler');
    expect(process.exitCode).toBe(1);
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('upgrade bootstrap fails when compiler cannot be resolved after install', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.'];
    mockResolveLocal.mockReturnValue(null);
    main();
    expect(stderrOutput).toContain('could not resolve');
    expect(process.exitCode).toBe(1);
  });

  it('upgrade bootstrap propagates exit code from delegation', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.2.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(null).mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    mockExecFileSync.mockImplementation(() => {
      const err = new Error('upgrade failed') as Error & { status: number };
      err.status = 3;
      throw err;
    });
    main();
    expect(process.exitCode).toBe(3);
  });

  it('upgrade bootstrap sets exit code 1 for generic error', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.2.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(null).mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    mockExecFileSync.mockImplementation(() => { throw 'string error'; });
    main();
    expect(process.exitCode).toBe(1);
  });

  it('upgrade bootstrap does not duplicate --skip-install', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.', '--skip-install'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.2.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(null).mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    main();
    const callArgs = mockExecFileSync.mock.calls[0][1] as string[];
    const skipCount = callArgs.filter((a: string) => a === '--skip-install').length;
    expect(skipCount).toBe(1);
  });

  it('upgrade bootstrap fails when entry missing after install', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.2.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(null).mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return false;
      return realFs.existsSync(p);
    });
    main();
    expect(stderrOutput).toContain('could not resolve');
    expect(process.exitCode).toBe(1);
  });

  // -----------------------------------------------------------------------
  // upgrade with existing local compiler (pre-update + delegate)
  // -----------------------------------------------------------------------

  it('upgrade updates compiler before delegating when local exists', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.6',
      cliEntry: '/fake/dist/cli/main.js',
    };
    const updatedLocal = {
      packageDir: '/fake',
      version: '0.2.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(fakeLocal).mockReturnValue(updatedLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    main();
    // Should update compiler via npm first
    expect(mockExecSync).toHaveBeenCalledWith(
      'npm install --save-dev @prodara/compiler@latest',
      expect.objectContaining({ cwd: expect.any(String), stdio: 'pipe' }),
    );
    expect(stderrOutput).toContain('Updating @prodara/compiler');
    expect(stderrOutput).toContain('Updated @prodara/compiler');
    // Should delegate with --skip-install
    expect(mockExecFileSync).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining(['upgrade', '.', '--skip-install']),
      expect.objectContaining({ stdio: 'inherit' }),
    );
  });

  it('upgrade skips npm update when --skip-install is passed', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.', '--skip-install'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.6',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    main();
    // Should NOT call npm install
    expect(mockExecSync).not.toHaveBeenCalledWith(
      'npm install --save-dev @prodara/compiler@latest',
      expect.anything(),
    );
    // Should delegate directly (normal delegation path includes cliEntry)
    expect(mockExecFileSync).toHaveBeenCalledWith(
      process.execPath,
      ['/fake/dist/cli/main.js', 'upgrade', '.', '--skip-install'],
      expect.objectContaining({ stdio: 'inherit' }),
    );
  });

  it('upgrade fails when npm update fails', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.6',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    mockExecSync.mockImplementation(() => { throw new Error('npm failed'); });
    main();
    expect(stderrOutput).toContain('Failed to update @prodara/compiler');
    expect(process.exitCode).toBe(1);
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('upgrade propagates exit code from delegation after update', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.6',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    mockExecFileSync.mockImplementation(() => {
      const err = new Error('failed') as Error & { status: number };
      err.status = 4;
      throw err;
    });
    main();
    expect(process.exitCode).toBe(4);
  });

  it('upgrade sets exit code 1 for generic delegation error after update', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.6',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(fakeLocal).mockReturnValue(fakeLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    mockExecFileSync.mockImplementation(() => { throw 'string error'; });
    main();
    expect(process.exitCode).toBe(1);
  });

  it('upgrade fails when entry missing after npm update', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.6',
      cliEntry: '/fake/dist/cli/main.js',
    };
    const updatedLocal = {
      packageDir: '/fake',
      version: '0.2.0',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(fakeLocal).mockReturnValue(updatedLocal);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return false;
      return realFs.existsSync(p);
    });
    main();
    expect(stderrOutput).toContain('could not resolve');
    expect(process.exitCode).toBe(1);
  });

  it('upgrade fails when resolve returns null after npm update', () => {
    process.argv = ['node', 'prodara', 'upgrade', '.'];
    const fakeLocal = {
      packageDir: '/fake',
      version: '0.1.6',
      cliEntry: '/fake/dist/cli/main.js',
    };
    mockResolveLocal.mockReturnValueOnce(fakeLocal).mockReturnValue(null);
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('dist/cli/main.js')) return true;
      return realFs.existsSync(p);
    });
    main();
    expect(stderrOutput).toContain('could not resolve');
    expect(process.exitCode).toBe(1);
  });

  // -----------------------------------------------------------------------
  // bootstrapInit direct tests
  // -----------------------------------------------------------------------

  it('bootstrapInit returns true on success', () => {
    const fakeLocal = { packageDir: '/fake', version: '0.1.0', cliEntry: '/fake/dist/cli/main.js' };
    mockResolveLocal.mockReturnValue(fakeLocal);
    const result = bootstrapInit('/tmp/test', '0.1.0');
    expect(result).toBe(true);
  });

  it('bootstrapInit returns false when npm init fails', () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p === '/tmp/test/package.json') return false;
      return realFs.existsSync(p);
    });
    mockExecSync.mockImplementation(() => { throw new Error('npm failed'); });
    const result = bootstrapInit('/tmp/test', '0.1.0');
    expect(result).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('bootstrapInit returns false when npm install fails', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('npm install')) throw new Error('install failed');
    });
    mockResolveLocal.mockReturnValue(null);
    const result = bootstrapInit('/tmp/test', '0.1.0');
    expect(result).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('bootstrapInit returns false when resolve fails after install', () => {
    mockResolveLocal.mockReturnValue(null);
    const result = bootstrapInit('/tmp/test', '0.1.0');
    expect(result).toBe(false);
    expect(stderrOutput).toContain('could not resolve');
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

  // -----------------------------------------------------------------------
  // help command
  // -----------------------------------------------------------------------

  it('shows help for "help" argument', () => {
    process.argv = ['node', 'prodara', 'help'];
    main();
    expect(stdoutOutput).toContain('Prodara CLI');
    expect(stdoutOutput).toContain('Usage:');
    expect(stdoutOutput).toContain('build');
    expect(stdoutOutput).toContain('init');
    expect(stdoutOutput).toContain('validate');
    expect(stdoutOutput).toContain('Core');
    expect(stdoutOutput).toContain('Analysis');
    expect(stdoutOutput).toContain('Global Options');
    expect(process.exitCode).toBe(0);
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('shows help for "--help" flag', () => {
    process.argv = ['node', 'prodara', '--help'];
    main();
    expect(stdoutOutput).toContain('Prodara CLI');
    expect(stdoutOutput).toContain('Usage:');
    expect(process.exitCode).toBe(0);
  });

  it('shows help for "-h" flag', () => {
    process.argv = ['node', 'prodara', '-h'];
    main();
    expect(stdoutOutput).toContain('Prodara CLI');
    expect(process.exitCode).toBe(0);
  });

  it('help includes all command groups', () => {
    process.argv = ['node', 'prodara', 'help'];
    main();
    expect(stdoutOutput).toContain('Core');
    expect(stdoutOutput).toContain('Analysis');
    expect(stdoutOutput).toContain('Exploration');
    expect(stdoutOutput).toContain('Change Management');
    expect(stdoutOutput).toContain('Utilities');
  });

  it('help does not delegate to local compiler', () => {
    process.argv = ['node', 'prodara', 'help'];
    mockResolveLocal.mockReturnValue({
      packageDir: '/fake',
      version: '0.1.0',
      cliEntry: '/fake/dist/cli/main.js',
    });
    main();
    expect(mockExecFileSync).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  // -----------------------------------------------------------------------
  // version command
  // -----------------------------------------------------------------------

  it('shows version with local compiler installed', () => {
    process.argv = ['node', 'prodara', 'version'];
    mockResolveLocal.mockReturnValue({
      packageDir: '/fake',
      version: '0.1.0',
      cliEntry: '/fake/dist/cli/main.js',
    });
    main();
    expect(stdoutOutput).toContain('@prodara/cli');
    expect(stdoutOutput).toContain('@prodara/compiler');
    expect(stdoutOutput).toContain('v0.1.0');
    expect(process.exitCode).toBe(0);
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('shows version without local compiler', () => {
    process.argv = ['node', 'prodara', 'version'];
    mockResolveLocal.mockReturnValue(null);
    main();
    expect(stdoutOutput).toContain('@prodara/cli');
    expect(stdoutOutput).toContain('not installed');
    expect(process.exitCode).toBe(0);
  });

  it('shows version for "--version" flag', () => {
    process.argv = ['node', 'prodara', '--version'];
    mockResolveLocal.mockReturnValue(null);
    main();
    expect(stdoutOutput).toContain('@prodara/cli');
    expect(process.exitCode).toBe(0);
  });

  it('shows version for "-V" flag', () => {
    process.argv = ['node', 'prodara', '-V'];
    mockResolveLocal.mockReturnValue(null);
    main();
    expect(stdoutOutput).toContain('@prodara/cli');
    expect(process.exitCode).toBe(0);
  });

  // -----------------------------------------------------------------------
  // printHelp / printVersion direct tests
  // -----------------------------------------------------------------------

  it('printHelp outputs formatted help with given version', () => {
    printHelp('1.2.3');
    expect(stdoutOutput).toContain('Prodara CLI');
    expect(stdoutOutput).toContain('v1.2.3');
    expect(stdoutOutput).toContain('prodara');
    expect(stdoutOutput).toContain('<command>');
  });

  it('printVersion shows both versions when local is present', () => {
    printVersion('1.0.0', '1.0.1');
    expect(stdoutOutput).toContain('@prodara/cli');
    expect(stdoutOutput).toContain('v1.0.0');
    expect(stdoutOutput).toContain('@prodara/compiler');
    expect(stdoutOutput).toContain('v1.0.1');
  });

  it('printVersion shows not installed when local is null', () => {
    printVersion('1.0.0', null);
    expect(stdoutOutput).toContain('@prodara/cli');
    expect(stdoutOutput).toContain('v1.0.0');
    expect(stdoutOutput).toContain('not installed');
  });
});
