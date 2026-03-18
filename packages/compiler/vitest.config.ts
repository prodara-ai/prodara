import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/graph/graph-types.ts',
        'src/parser/ast.ts',
        'src/planner/plan-types.ts',
        'src/orchestrator/types.ts',
        'src/incremental/types.ts',
        'src/reviewers/types.ts',
        'src/verification/types.ts',
        'src/workflow/types.ts',
        'src/governance/types.ts',
        'src/agent/types.ts',
        'src/validation/types.ts',
        'src/audit/types.ts',
        'src/implement/types.ts',
        'src/implement/index.ts',
        'src/doc-gen/doc-gen-types.ts',
        'src/extensions/types.ts',
        'src/presets/types.ts',
        'src/proposal/types.ts',
      ],
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
