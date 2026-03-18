import { describe, it, expect } from 'vitest';
import { resolveRuntime } from '../src/runtime/resolution.js';
import { parse } from './helpers.js';

describe('Runtime Resolution', () => {
  it('extracts secrets', () => {
    const { ast } = parse(`
      module infra {
        secret DB_PASSWORD {
          source: vault
          description: "Database password"
        }
        secret API_KEY {
          source: environment
        }
      }
    `);
    const result = resolveRuntime([ast]);
    expect(result.secrets).toHaveLength(2);
    expect(result.secrets[0]!.name).toBe('DB_PASSWORD');
    expect(result.secrets[0]!.source).toBe('vault');
    expect(result.secrets[0]!.description).toBe('Database password');
    expect(result.secrets[1]!.name).toBe('API_KEY');
    expect(result.secrets[1]!.source).toBe('environment');
  });

  it('extracts environments', () => {
    const { ast } = parse(`
      module infra {
        environment staging {
          url: "https://staging.example.com"
        }
        environment production {
          url: "https://example.com"
        }
      }
    `);
    const result = resolveRuntime([ast]);
    expect(result.environments).toHaveLength(2);
    expect(result.environments[0]!.name).toBe('staging');
    expect(result.environments[0]!.url).toBe('https://staging.example.com');
  });

  it('extracts deployments', () => {
    const { ast } = parse(`
      module infra {
        deployment main_deploy {
          environments: [staging, production]
        }
      }
    `);
    const result = resolveRuntime([ast]);
    expect(result.deployments).toHaveLength(1);
    expect(result.deployments[0]!.name).toBe('main_deploy');
  });

  it('returns empty for modules without runtime items', () => {
    const { ast } = parse(`
      module core {
        entity Task {
          name: string
        }
      }
    `);
    const result = resolveRuntime([ast]);
    expect(result.secrets).toHaveLength(0);
    expect(result.environments).toHaveLength(0);
    expect(result.deployments).toHaveLength(0);
    expect(result.bag.hasErrors).toBe(false);
  });

  it('generates qualified IDs', () => {
    const { ast } = parse(`
      module ops {
        secret TOKEN { source: vault }
        environment dev { url: "http://localhost" }
        deployment localDeploy {}
      }
    `);
    const result = resolveRuntime([ast]);
    expect(result.secrets[0]!.id).toBe('ops.secret.TOKEN');
    expect(result.environments[0]!.id).toBe('ops.environment.dev');
    expect(result.deployments[0]!.id).toBe('ops.deployment.localDeploy');
  });

  it('handles multiple modules', () => {
    const ast1 = parse(`
      module a {
        secret S1 { source: env }
      }
    `).ast;
    const ast2 = parse(`
      module b {
        secret S2 { source: vault }
      }
    `).ast;
    const result = resolveRuntime([ast1, ast2]);
    expect(result.secrets).toHaveLength(2);
    expect(result.secrets[0]!.id).toContain('a.');
    expect(result.secrets[1]!.id).toContain('b.');
  });

  it('resolves environment secrets by extracting values', () => {
    const { ast } = parse(`
      module infra {
        environment prod {
          url: "https://prod.example.com"
          secrets {
            db_password: "vault_db_prod"
            api_token: some_ref
          }
        }
      }
    `);
    const result = resolveRuntime([ast]);
    expect(result.environments).toHaveLength(1);
    expect(result.environments[0]!.secrets).toHaveLength(2);
    expect(result.environments[0]!.secrets[0]!.name).toBe('db_password');
    expect(result.environments[0]!.secrets[0]!.resolvedSource).toBe('vault_db_prod');
    expect(result.environments[0]!.secrets[1]!.name).toBe('api_token');
  });

  it('maps deployment environments from symbol refs', () => {
    const { ast } = parse(`
      module infra {
        deployment multi_env {
          environments: [staging.us, production.eu]
        }
      }
    `);
    const result = resolveRuntime([ast]);
    expect(result.deployments).toHaveLength(1);
    expect(result.deployments[0]!.environments).toEqual(['staging.us', 'production.eu']);
  });

  it('defaults secret source to environment when not specified', () => {
    const { ast } = parse(`
      module infra {
        secret BARE_SECRET {}
      }
    `);
    const result = resolveRuntime([ast]);
    expect(result.secrets).toHaveLength(1);
    expect(result.secrets[0]!.source).toBe('environment');
    expect(result.secrets[0]!.description).toBeNull();
  });

  it('handles environment without url or secrets', () => {
    const { ast } = parse(`
      module infra {
        environment bare_env {
          description: "Empty env"
        }
      }
    `);
    const result = resolveRuntime([ast]);
    expect(result.environments).toHaveLength(1);
    expect(result.environments[0]!.url).toBeNull();
    expect(result.environments[0]!.secrets).toHaveLength(0);
  });

  it('handles deployment without environments list', () => {
    const { ast } = parse(`
      module infra {
        deployment bare_deploy {
          description: "No envs"
        }
      }
    `);
    const result = resolveRuntime([ast]);
    expect(result.deployments).toHaveLength(1);
    expect(result.deployments[0]!.environments).toEqual([]);
  });

  it('skips non-module top-level declarations', () => {
    const { ast } = parse(`
      product my_app {
        title: "App"
        version: "1.0"
        modules: [infra]
      }
      module infra {
        secret db_pass { source: vault }
      }
    `);
    const result = resolveRuntime([ast]);
    expect(result.secrets).toHaveLength(1);
  });

  it('resolves identifier value in environment secret', () => {
    const { ast } = parse(`
      module infra {
        environment staging {
          url: "https://staging.example.com"
          secrets {
            api_key: my_vault_key
          }
        }
      }
    `);
    const result = resolveRuntime([ast]);
    expect(result.environments).toHaveLength(1);
    expect(result.environments[0]!.secrets[0]!.resolvedSource).toBe('my_vault_key');
  });
});
