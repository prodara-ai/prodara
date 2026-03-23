#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Prodara Compiler — CLI Entry Point
// ---------------------------------------------------------------------------

import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdirSync, existsSync, watch } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { compile } from './compile.js';
import { createBuildSummary, formatBuildSummary } from '../orchestrator/orchestrator.js';
import { runPipeline } from '../orchestrator/pipeline.js';
import type { PipelineOptions, PhaseName } from '../orchestrator/pipeline.js';
import { formatDiagnosticsJson, formatDiagnosticsHuman } from '../diagnostics/reporter.js';
import { discoverFiles } from '../discovery/discovery.js';
import { DiagnosticBag } from '../diagnostics/diagnostic.js';
import { loadConfig, CONFIG_FILENAME } from '../config/config.js';
import type { ResolvedConfig } from '../config/config.js';
import { buildIncrementalSpec, serializeIncrementalSpec } from '../incremental/incremental-spec.js';
import { semanticDiff, formatSemanticDiffHuman } from '../planner/semantic-diff.js';
import { readPreviousGraph } from '../build-state/build-state.js';
import { detectDrift, formatDriftHuman } from '../drift/drift.js';
import { getStarterTemplate, listStarterTemplates } from './starters.js';
import { explainNode, collectAllNodeIds, formatExplanation, getDiagnosticInfo } from './explain.js';
import { registerShutdownHandlers, setActiveRoot, clearActiveRoot } from './lifecycle.js';
import { generateSlashCommands, writeSlashCommands, isValidAgentId, listSupportedAgents, getAgentConfig } from './agent-setup.js';
import type { AgentId } from './agent-setup.js';
import { banner, success, error as uiError, warn as uiWarn, info as uiInfo, phaseIcon, box, table, dim, bold, isInteractive, createSpinner } from './ui.js';
import { createProposal, listProposals, applyProposal, archiveProposal, getProposal } from '../proposal/proposal.js';
import { generateChecklist, formatChecklistHuman } from './checklist.js';
import { analyzeGraph, formatAnalysisHuman } from './analyze.js';
import { loadExtensions, installExtension, removeExtension, listInstalledExtensions } from '../extensions/loader.js';
import { loadPresets, installPreset, removePreset } from '../presets/loader.js';
import { runParty, formatPartyHuman } from '../agent/party.js';
import type { PartyRole } from '../agent/party.js';
import { isGitRepo, autoCommit } from './git.js';
import { buildNotificationMessage, sendNotification } from './notify.js';
import { collectDashboardData, formatDashboard } from './dashboard.js';
import { generateDocs, writeDocs } from '../doc-gen/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createProgram(): Command {

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8')) as { version: string };

const program = new Command();

program
  .name('prodara')
  .description('The Prodara compiler — compile .prd specifications into a validated Product Graph')
  .version(pkg.version);

// -----------------------------------------------------------------------
// build (default command)
// -----------------------------------------------------------------------
program
  .command('build', { isDefault: true })
  .description('Full build pipeline: compile → workflow → review → verify')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .option('--headless', 'Use API driver instead of prompt files')
  .option('--no-implement', 'Skip implementation phase')
  .option('--no-review', 'Skip review phase')
  .option('--max-review-loops <n>', 'Override max review iterations', parseInt)
  .option('--auto-clarify', 'Override ambiguity threshold to low')
  .option('--auto-commit', 'Auto-commit changes after successful build')
  .option('--notify', 'Send desktop notification on build completion')
  .option('--party', 'Run multi-agent party mode review')
  .option('--dry-run', 'Show implementation tasks without executing')
  .action(async (path: string, opts: {
    format: string;
    headless?: boolean;
    implement?: boolean;
    review?: boolean;
    maxReviewLoops?: number;
    autoClarify?: boolean;
    autoCommit?: boolean;
    notify?: boolean;
    party?: boolean;
    dryRun?: boolean;
  }) => {
    const root = resolve(path);
    registerShutdownHandlers();
    setActiveRoot(root);

    const { config: baseConfig } = loadConfig(root);

    // Apply CLI overrides to config
    const config: ResolvedConfig = applyCliOverrides(baseConfig, opts);

    const pipelineOpts: PipelineOptions = {
      headless: opts.headless ?? false,
      noImplement: opts.implement === false,
      noReview: opts.review === false,
      dryRun: opts.dryRun ?? false,
      onProgress: (phase: PhaseName, index: number, total: number) => {
        if (opts.format !== 'json') {
          process.stderr.write(`${uiInfo(`[${index + 1}/${total}] ${phase}...`)}\n`);
        }
      },
    };

    if (opts.format !== 'json') {
      process.stdout.write(banner('Prodara Build') + '\n\n');
    }

    const result = await runPipeline(root, config, pipelineOpts);

    if (opts.format === 'json') {
      process.stdout.write(JSON.stringify({
        status: result.status,
        phases: result.phases.map((p) => ({ phase: p.phase, status: p.status, detail: p.detail, duration_ms: p.duration_ms })),
        duration_ms: result.duration_ms,
        implementResult: result.implementResult ?? undefined,
      }, null, 2) + '\n');
    } else {
      const phaseRows = result.phases.map(p => [
        `${phaseIcon(p.status)} ${p.phase}`,
        p.detail,
        dim(`${p.duration_ms}ms`),
      ]);
      process.stdout.write(table(['Phase', 'Detail', 'Time'], phaseRows) + '\n\n');
      if (result.status === 'success') {
        process.stdout.write(box('Build Result', [success(`Build completed in ${result.duration_ms}ms`)]) + '\n');
      } else {
        process.stdout.write(box('Build Result', [uiError(`Build failed (${result.duration_ms}ms)`)]) + '\n');
      }
    }

    clearActiveRoot();

    // Auto-commit after successful build
    if (opts.autoCommit && result.status === 'success') {
      /* v8 ignore next -- graph always exists when status is success */
      const hash = autoCommit(root, result.graph?.product.name ?? 'unknown', result.phases.length);
      if (hash && opts.format !== 'json') {
        process.stdout.write(success(`Auto-committed: ${hash}`) + '\n');
      }
    }

    // Desktop notification
    if (opts.notify) {
      const msg = buildNotificationMessage(
        /* v8 ignore next -- graph always exists when status is success */
        result.graph?.product.name ?? 'unknown',
        result.status === 'success',
        result.phases.filter(p => p.status === 'error').length,
      );
      sendNotification(msg.title, msg.message).catch(() => {});
    }

    process.exitCode = result.status === 'success' ? 0 : 1;
  });

// -----------------------------------------------------------------------
// init
// -----------------------------------------------------------------------
program
  .command('init')
  .description('Scaffold a new Prodara project')
  .argument('[path]', 'Directory to initialize', '.')
  .option('--name <name>', 'Product name', 'my_app')
  .option('--template <template>', 'Starter template: minimal | saas | marketplace | internal-tool | api')
  .option('--ai <agent>', 'Configure AI agent slash commands (e.g. copilot, claude, cursor)')
  .option('--ai-commands-dir <dir>', 'Custom directory for slash commands (use with --ai generic)')
  .option('--skip-install', 'Skip automatic npm init and compiler installation')
  .action(async (path: string, opts: { name: string; template?: string; ai?: string; aiCommandsDir?: string; skipInstall?: boolean }) => {
    const root = resolve(path);
    const appPrd = join(root, 'app.prd');
    const configFile = join(root, CONFIG_FILENAME);
    const prodaraDir = join(root, '.prodara');

    if (existsSync(appPrd)) {
      process.stderr.write(uiError(`Already initialized: ${appPrd} exists`) + '\n');
      process.exitCode = 1;
      return;
    }

    process.stdout.write(banner('Prodara Init') + '\n\n');

    mkdirSync(root, { recursive: true });

    // Ensure npm is initialized and compiler is installed
    if (!opts.skipInstall) {
      const pkgJsonPath = join(root, 'package.json');
      if (!existsSync(pkgJsonPath)) {
        const spinner = createSpinner('Initializing npm project...').start();
        try {
          execSync('npm init -y', { cwd: root, stdio: 'pipe' });
          spinner.succeed('Created package.json');
        } catch {
          spinner.fail('Failed to initialize npm project');
          process.stderr.write(uiError('Run `npm init` manually.') + '\n');
          process.exitCode = 1;
          return;
        }
      }

      const installSpinner = createSpinner('Installing @prodara/compiler...').start();
      try {
        execSync('npm install --save-dev @prodara/compiler', { cwd: root, stdio: 'pipe' });
        installSpinner.succeed('Installed @prodara/compiler');
      } catch {
        installSpinner.fail('Failed to install @prodara/compiler');
        process.stderr.write(uiWarn('Install it manually: npm install --save-dev @prodara/compiler') + '\n');
      }
    }

    mkdirSync(prodaraDir, { recursive: true });
    mkdirSync(join(prodaraDir, 'runs'), { recursive: true });
    mkdirSync(join(prodaraDir, 'reviewers'), { recursive: true });

    // Scaffold sample custom reviewer
    const sampleReviewer = join(prodaraDir, 'reviewers', 'performance.md');
    writeFileSync(sampleReviewer, `# Performance Reviewer

Review the specification and implementation for performance concerns.

## Focus Areas
- Identify N+1 query patterns in workflows that iterate over collections
- Check that large collections define pagination (limit/offset or cursor)
- Flag missing caching strategies for frequently-read entities
- Ensure bulk operations exist where repeated single-item writes appear
- Verify that async workflows are used for long-running operations
`, 'utf-8');

    if (opts.template) {
      const tmpl = getStarterTemplate(opts.template, opts.name);
      if (!tmpl) {
        const available = listStarterTemplates().map(t => t.name).join(', ');
        process.stderr.write(uiError(`Unknown template: ${opts.template}`) + '\n');
        process.stderr.write(uiInfo(`Available templates: ${available}`) + '\n');
        process.exitCode = 1;
        return;
      }
      for (const f of tmpl.files) {
        const filePath = join(root, f.path);
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, f.content, 'utf-8');
      }
      process.stdout.write(success(`Initialized Prodara project (template: ${tmpl.name})`) + '\n');
      for (const f of tmpl.files) {
        process.stdout.write(`  ${success(f.path)}\n`);
      }
    } else {
      writeFileSync(appPrd, `product ${opts.name} {
  title: "${opts.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}"
  version: "0.1.0"
  modules: [core]
}

module core {

  entity item {
    id: uuid
    title: string
    done: boolean = false
  }

}
`, 'utf-8');
      process.stdout.write(success('Created app.prd') + '\n');
    }

    writeFileSync(configFile, JSON.stringify({
      phases: {},
      reviewFix: { maxIterations: 3 },
      reviewers: {
        architecture: { enabled: true },
        security: { enabled: true },
        codeQuality: { enabled: true },
        testQuality: { enabled: true },
        uxQuality: { enabled: true },
        adversarial: { enabled: false },
        edgeCase: { enabled: false },
        performance: { enabled: true, promptPath: '.prodara/reviewers/performance.md' },
      },
      validation: { lint: null, typecheck: null, test: null, build: null },
      audit: { enabled: true, path: '.prodara/runs/' },
    }, null, 2) + '\n', 'utf-8');

    process.stdout.write(success(`Created ${CONFIG_FILENAME}`) + '\n');
    process.stdout.write(success('Created .prodara/reviewers/') + '\n');

    // Slash command generation — interactive prompt if --ai not provided
    let agentId: AgentId | null = null;

    if (opts.ai) {
      if (!isValidAgentId(opts.ai)) {
        const supported = listSupportedAgents().join(', ');
        process.stderr.write(uiError(`Unknown AI agent: ${opts.ai}`) + '\n');
        process.stderr.write(uiInfo(`Supported agents: ${supported}`) + '\n');
        process.exitCode = 1;
        return;
      }
      agentId = opts.ai as AgentId;
    } else if (isInteractive()) {
      const { select } = await import('@inquirer/prompts');
      const agents = listSupportedAgents();
      const popular: AgentId[] = ['copilot', 'claude', 'cursor', 'gemini'];
      const others = agents.filter(a => !popular.includes(a) && a !== 'generic');
      const choices = [
        ...popular.map(a => ({ name: a.charAt(0).toUpperCase() + a.slice(1), value: a })),
        ...others.map(a => ({ name: a.charAt(0).toUpperCase() + a.slice(1), value: a })),
        { name: 'Generic', value: 'generic' as AgentId },
        { name: 'Skip (no agent setup)', value: 'skip' as string },
      ];
      const selected = await select<string>({ message: 'Which AI agent do you use?', choices });
      if (selected !== 'skip') {
        agentId = selected as AgentId;
      }
    }

    if (agentId) {
      if (agentId === 'generic' && !opts.aiCommandsDir) {
        process.stderr.write(uiError('--ai generic requires --ai-commands-dir <dir>') + '\n');
        process.exitCode = 1;
        return;
      }

      const commands = generateSlashCommands(agentId, root, opts.name, opts.aiCommandsDir);
      writeSlashCommands(commands);

      const agentConfig = getAgentConfig(agentId);
      /* v8 ignore next -- triple fallback for command dir */
      const commandsDir = opts.aiCommandsDir ?? agentConfig?.commandsDir ?? '.ai/commands';
      process.stdout.write(success(`Created slash commands in ${commandsDir}/`) + '\n');
      for (const cmd of commands) {
        const rel = relative(root, cmd.path);
        process.stdout.write(`  ${dim(rel)}\n`);
      }
    }

    process.stdout.write('\n' + box('Next Steps', [
      `${bold('cd')} ${root === resolve('.') ? '.' : root}`,
      `Use the ${bold('/prodara')} slash command in your AI agent`,
      `Example: ${dim('/prodara build a todo application')}`,
    ]) + '\n');
    process.exitCode = 0;
  });

// -----------------------------------------------------------------------
// validate
// -----------------------------------------------------------------------
program
  .command('validate')
  .description('Parse and validate .prd files without building a graph')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .action((path: string, opts: { format: string }) => {
    const root = resolve(path);
    const result = compile(root, { stopAfter: 'validate' });
    outputDiagnostics(result.diagnostics, opts.format);
    if (!result.diagnostics.hasErrors && opts.format !== 'json') {
      process.stdout.write(success('No errors found') + '\n');
    }
    process.exitCode = result.diagnostics.hasErrors ? 1 : 0;
  });

// -----------------------------------------------------------------------
// graph
// -----------------------------------------------------------------------
program
  .command('graph')
  .description('Compile .prd files and output the Product Graph')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'json')
  .option('--output <file>', 'Write graph to file instead of stdout')
  .action((path: string, opts: { format: string; output?: string }) => {
    const root = resolve(path);
    const result = compile(root, { stopAfter: 'graph' });

    if (result.diagnostics.hasErrors) {
      outputDiagnostics(result.diagnostics, opts.format === 'json' ? 'json' : 'human');
      process.exitCode = 1;
      return;
    }

    if (result.graphJson) {
      if (opts.output) {
        writeFileSync(resolve(opts.output), result.graphJson, 'utf-8');
        if (opts.format !== 'json') {
          process.stderr.write(success(`Graph written to ${opts.output}`) + '\n');
        }
      } else {
        process.stdout.write(result.graphJson + '\n');
      }
    }

    if (result.diagnostics.warnings.length > 0) {
      outputDiagnostics(result.diagnostics, opts.format === 'json' ? 'json' : 'human');
    }
    process.exitCode = 0;
  });

// -----------------------------------------------------------------------
// plan
// -----------------------------------------------------------------------
program
  .command('plan')
  .description('Compile and produce an incremental plan')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'json')
  .action((path: string, opts: { format: string }) => {
    const root = resolve(path);
    const result = compile(root, { stopAfter: 'plan' });

    if (result.diagnostics.hasErrors) {
      outputDiagnostics(result.diagnostics, opts.format === 'json' ? 'json' : 'human');
      process.exitCode = 1;
      return;
    }

    if (result.planJson) {
      process.stdout.write(result.planJson + '\n');
    }
    process.exitCode = 0;
  });

// -----------------------------------------------------------------------
// test
// -----------------------------------------------------------------------
program
  .command('test')
  .description('Run spec tests defined in .prd files')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .action((path: string, opts: { format: string }) => {
    const root = resolve(path);
    const result = compile(root, { stopAfter: 'test' });

    if (result.testResults) {
      if (opts.format === 'json') {
        process.stdout.write(JSON.stringify(result.testResults, null, 2) + '\n');
      } else {
        const r = result.testResults;
        process.stdout.write(`Tests: ${r.totalPassed} passed, ${r.totalFailed} failed\n`);
        for (const t of r.results) {
          const icon = t.passed ? phaseIcon('ok') : phaseIcon('error');
          process.stdout.write(`  ${icon} ${t.name}\n`);
          for (const f of t.failures) {
            process.stdout.write(`    ${f}\n`);
          }
        }
      }
    }

    if (result.diagnostics.hasErrors) {
      outputDiagnostics(result.diagnostics, opts.format === 'json' ? 'json' : 'human');
      process.exitCode = 1;
    } else {
      process.exitCode = result.testResults?.totalFailed ? 1 : 0;
    }
  });

// -----------------------------------------------------------------------
// diff
// -----------------------------------------------------------------------
program
  .command('diff')
  .description('Show incremental spec (diff) between current and previous graph')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'json')
  .option('--semantic', 'Show human-readable semantic diff summary')
  .action((path: string, opts: { format: string; semantic?: boolean }) => {
    const root = resolve(path);
    const result = compile(root, { stopAfter: 'plan', writeBuild: false });

    if (result.diagnostics.hasErrors || !result.graph || !result.plan) {
      outputDiagnostics(result.diagnostics, opts.format === 'json' ? 'json' : 'human');
      process.exitCode = 1;
      return;
    }

    if (opts.semantic) {
      const prevGraph = readPreviousGraph(root);
      if (!prevGraph) {
        process.stdout.write(uiInfo('No previous graph found — nothing to diff.') + '\n');
        process.exitCode = 0;
        return;
      }
      const semDiff = semanticDiff(prevGraph, result.graph);
      if (opts.format === 'json') {
        process.stdout.write(JSON.stringify(semDiff, null, 2) + '\n');
      } else {
        process.stdout.write(formatSemanticDiffHuman(semDiff) + '\n');
      }
      process.exitCode = 0;
      return;
    }

    const spec = buildIncrementalSpec(result.plan, result.graph);

    if (opts.format === 'json') {
      process.stdout.write(serializeIncrementalSpec(spec) + '\n');
    } else {
      const s = spec.summary;
      process.stdout.write(`Incremental Spec Summary:\n`);
      process.stdout.write(`  Added:    ${s.addedCount}\n`);
      process.stdout.write(`  Removed:  ${s.removedCount}\n`);
      process.stdout.write(`  Modified: ${s.modifiedCount}\n`);
      process.stdout.write(`  Impacted: ${s.impactedCount}\n`);
      process.stdout.write(`  Tasks:    ${s.taskCount}\n`);
      if (s.affectedModules.length > 0) {
        process.stdout.write(`  Modules:  ${s.affectedModules.join(', ')}\n`);
      }
    }

    process.exitCode = 0;
  });

// -----------------------------------------------------------------------
// doctor
// -----------------------------------------------------------------------
program
  .command('doctor')
  .description('Check compiler installation and workspace health')
  .argument('[path]', 'Directory to check', '.')
  .action((path: string) => {
    const root = resolve(path);
    const files = discoverFiles(root);
    process.stdout.write(box('Prodara Doctor', [
      `Compiler  ${bold(`v${pkg.version}`)}`,
      `Node.js   ${bold(process.version)}`,
      `Workspace ${root}`,
      `Found     ${bold(String(files.length))} .prd file(s)`,
    ]) + '\n');
    for (const f of files) {
      process.stdout.write(`  ${dim(f)}\n`);
    }
    process.exitCode = 0;
  });

// -----------------------------------------------------------------------
// drift
// -----------------------------------------------------------------------
program
  .command('drift')
  .description('Detect whether .prd specifications have drifted from last build')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .action((path: string, opts: { format: string }) => {
    const root = resolve(path);
    const result = detectDrift(root);

    if (opts.format === 'json') {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else {
      process.stdout.write(formatDriftHuman(result) + '\n');
    }

    process.exitCode = result.status === 'drifted' ? 1 : 0;
  });

// -----------------------------------------------------------------------
// watch
// -----------------------------------------------------------------------
program
  .command('watch')
  .description('Watch .prd files and re-compile on changes')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .action((path: string, opts: { format: string }) => {
    const root = resolve(path);
    registerShutdownHandlers();
    setActiveRoot(root);

    process.stdout.write(`Watching ${root} for .prd changes...\n`);

    const runBuild = () => {
      const { config } = loadConfig(root);
      const result = compile(root, { stopAfter: 'test' });
      outputDiagnostics(result.diagnostics, opts.format);
      if (!result.diagnostics.hasErrors) {
        process.stdout.write(success('Build OK') + '\n');
      }
    };

    // Initial build
    runBuild();

    // Watch for changes
    try {
      /* v8 ignore start */
      const watcher = watch(root, { recursive: true }, (_event, filename) => {
        if (filename && filename.endsWith('.prd')) {
          process.stdout.write(`\nChanged: ${filename}\n`);
          runBuild();
        }
      });
      // Keep the process alive
      process.on('SIGINT', () => {
        watcher.close();
        clearActiveRoot();
        process.exit(130);
      });
      /* v8 ignore stop */
    } catch {
      process.stderr.write('Error: fs.watch not available\n');
      process.exitCode = 1;
    }
  });

// -----------------------------------------------------------------------
// explain
// -----------------------------------------------------------------------
program
  .command('explain')
  .description('Explain a node in the product graph by ID (e.g. core.entity.user)')
  .argument('<node-id>', 'Node ID to explain')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .action((nodeId: string, path: string, opts: { format: string }) => {
    const root = resolve(path);
    const result = compile(root, { stopAfter: 'graph', writeBuild: false });

    if (result.diagnostics.hasErrors || !result.graph) {
      /* v8 ignore next -- error-path format ternary */
      outputDiagnostics(result.diagnostics, opts.format === 'json' ? 'json' : 'human');
      process.exitCode = 1;
      return;
    }

    const explanation = explainNode(result.graph, nodeId);
    if (!explanation) {
      process.stderr.write(uiError(`Node not found: ${nodeId}`) + '\n');
      const allIds = collectAllNodeIds(result.graph);
      if (allIds.size > 0) {
        const matches = [...allIds].filter(id => id.includes(/* v8 ignore next -- pop() on non-empty array */ nodeId.split('.').pop() ?? ''));
        if (matches.length > 0) {
          process.stderr.write(uiInfo(`Did you mean: ${matches.slice(0, 5).join(', ')}?`) + '\n');
        }
      }
      process.exitCode = 1;
      return;
    }

    if (opts.format === 'json') {
      process.stdout.write(JSON.stringify(explanation, null, 2) + '\n');
    } else {
      process.stdout.write(formatExplanation(explanation) + '\n');
    }
    process.exitCode = 0;
  });

// -----------------------------------------------------------------------
// why
// -----------------------------------------------------------------------
program
  .command('why')
  .description('Explain why a diagnostic code was reported')
  .argument('<code>', 'Diagnostic code (e.g. PRD1001)')
  .action((code: string) => {
    const info = getDiagnosticInfo(code);
    if (!info) {
      process.stderr.write(uiError(`Unknown diagnostic code: ${code}`) + '\n');
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`${bold(code)}: ${info.title}\n`);
    process.stdout.write(`  Phase: ${info.phase}\n`);
    process.stdout.write(`  Severity: ${info.severity}\n`);
    process.stdout.write(`  ${info.description}\n`);
    process.exitCode = 0;
  });

// -----------------------------------------------------------------------
// propose
// -----------------------------------------------------------------------
program
  .command('propose')
  .description('Create a new change proposal')
  .argument('<description>', 'Brief description of the proposed change')
  .argument('[path]', 'Directory containing .prd files', '.')
  .action((description: string, path: string) => {
    const root = resolve(path);
    try {
      const proposal = createProposal(description, root);
      process.stdout.write(success(`Created change proposal: ${proposal.name}`) + '\n');
      process.stdout.write(`  Directory: ${dim(relative(root, proposal.path))}/\n`);
      process.stdout.write(`  delta.prd: Edit to define specification changes\n`);
      process.stdout.write(`  proposal.md: Document motivation and scope\n`);
      process.stdout.write(`  tasks.md: Track implementation tasks\n`);
      process.exitCode = 0;
    } catch (e) {
      process.stderr.write(uiError((e as Error).message) + '\n');
      process.exitCode = 1;
    }
  });

// -----------------------------------------------------------------------
// changes
// -----------------------------------------------------------------------
program
  .command('changes')
  .description('List active change proposals')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .action((path: string, opts: { format: string }) => {
    const root = resolve(path);
    const proposals = listProposals(root);

    if (opts.format === 'json') {
      process.stdout.write(JSON.stringify(proposals, null, 2) + '\n');
    } else if (proposals.length === 0) {
      process.stdout.write(uiInfo('No active change proposals.') + '\n');
      process.stdout.write(dim('Run `prodara propose "<description>"` to create one.') + '\n');
    } else {
      process.stdout.write(bold(`Active change proposals (${proposals.length}):`) + '\n\n');
      for (const p of proposals) {
        /* v8 ignore next -- proposal status ternary */
        const icon = p.status === 'proposed' ? '○' : p.status === 'in-progress' ? '◐' : '●';
        process.stdout.write(`  ${icon} ${p.name} [${p.status}]\n`);
        process.stdout.write(`    ${p.description}\n`);
        process.stdout.write(`    Created: ${p.created}\n\n`);
      }
    }
    process.exitCode = 0;
  });

// -----------------------------------------------------------------------
// apply
// -----------------------------------------------------------------------
program
  .command('apply')
  .description('Apply a change proposal (compile its delta.prd)')
  .argument('<change>', 'Name of the change proposal')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .action((change: string, path: string, opts: { format: string }) => {
    const root = resolve(path);
    try {
      const proposal = applyProposal(change, root);
      const deltaPath = join(proposal.path, 'delta.prd');

      if (!existsSync(deltaPath)) {
        process.stderr.write(uiError(`No delta.prd found in proposal: ${change}`) + '\n');
        process.exitCode = 1;
        return;
      }

      // Compile the project to validate delta alongside main specs
      const result = compile(root, { stopAfter: 'graph', writeBuild: false });

      if (result.diagnostics.hasErrors) {
        /* v8 ignore next -- error-path format ternary */
        outputDiagnostics(result.diagnostics, opts.format === 'json' ? 'json' : 'human');
        process.exitCode = 1;
        return;
      }

      process.stdout.write(success(`Applied change proposal: ${proposal.name}`) + '\n');
      process.stdout.write(`  Status: ${dim(proposal.status)}\n`);

      if (result.graph) {
        const prevGraph = readPreviousGraph(root);
        if (prevGraph) {
          const diff = semanticDiff(prevGraph, result.graph);
          if (opts.format === 'json') {
            process.stdout.write(JSON.stringify(diff, null, 2) + '\n');
          } else {
            process.stdout.write(formatSemanticDiffHuman(diff) + '\n');
          }
        }
      }
      process.exitCode = 0;
    } catch (e) {
      process.stderr.write(uiError((e as Error).message) + '\n');
      process.exitCode = 1;
    }
  });

// -----------------------------------------------------------------------
// archive
// -----------------------------------------------------------------------
program
  .command('archive')
  .description('Archive a completed change proposal')
  .argument('<change>', 'Name of the change proposal')
  .argument('[path]', 'Directory containing .prd files', '.')
  .action((change: string, path: string) => {
    const root = resolve(path);
    try {
      const proposal = archiveProposal(change, root);
      process.stdout.write(success(`Archived change proposal: ${proposal.name}`) + '\n');
      process.stdout.write(`  Moved to: ${dim(relative(root, proposal.path))}/\n`);
      process.exitCode = 0;
    } catch (e) {
      process.stderr.write(uiError((e as Error).message) + '\n');
      process.exitCode = 1;
    }
  });

// -----------------------------------------------------------------------
// clarify
// -----------------------------------------------------------------------
program
  .command('clarify')
  .description('Run the clarify phase to identify specification ambiguities')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .option('--auto', 'Auto-resolve high-confidence questions')
  .option('--output <file>', 'Write questions to a file')
  .action(async (path: string, opts: { format: string; auto?: boolean; output?: string }) => {
    const root = resolve(path);
    const result = compile(root, { stopAfter: 'plan', writeBuild: false });

    if (result.diagnostics.hasErrors || !result.graph || !result.plan) {
      /* v8 ignore next -- error-path format ternary */
      outputDiagnostics(result.diagnostics, opts.format === 'json' ? 'json' : 'human');
      process.exitCode = 1;
      return;
    }

    const { config } = loadConfig(root);
    const spec = buildIncrementalSpec(result.plan, result.graph);
    const { runClarifyPhase, autoResolveClarifications } = await import('../workflow/clarify.js');
    const clarifyResult = runClarifyPhase(result.graph, spec, config.phases.clarify);

    /* v8 ignore next -- clarify always returns data */
    let questions = clarifyResult.data?.questions ?? [];
    if (opts.auto && clarifyResult.data) {
      const resolved = autoResolveClarifications(clarifyResult.data.questions, config.phases.clarify.ambiguityThreshold, result.graph);
      questions = resolved.needsInput;
      if (opts.format !== 'json') {
        process.stdout.write(success(`Auto-resolved ${resolved.autoResolved.length} question(s)`) + '\n\n');
      }
    }

    if (opts.format === 'json') {
      const output = JSON.stringify({ questions, total: questions.length }, null, 2);
      if (opts.output) {
        writeFileSync(resolve(opts.output), output + '\n', 'utf-8');
        process.stdout.write(success(`Questions written to ${opts.output}`) + '\n');
      } else {
        process.stdout.write(output + '\n');
      }
    } else {
      if (questions.length === 0) {
        process.stdout.write(success('No ambiguities found in the specification.') + '\n');
      } else {
        process.stdout.write(bold(`Found ${questions.length} ambiguity question(s):`) + '\n\n');
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i]!;
          process.stdout.write(`  ${i + 1}. [${q.category}] ${q.question}\n`);
          process.stdout.write(`     Priority: ${q.priority} | Confidence: ${q.confidence}\n`);
          process.stdout.write('\n');
        }
      }
      if (opts.output) {
        const output = questions.map((q, i) => `${i + 1}. [${q.category}] ${q.question}`).join('\n');
        writeFileSync(resolve(opts.output), output + '\n', 'utf-8');
        process.stdout.write(success(`Questions written to ${opts.output}`) + '\n');
      }
    }
    process.exitCode = 0;
  });

// -----------------------------------------------------------------------
// checklist
// -----------------------------------------------------------------------
program
  .command('checklist')
  .description('Generate a quality validation checklist')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .option('--output <file>', 'Write checklist to a file')
  .action((path: string, opts: { format: string; output?: string }) => {
    const root = resolve(path);
    const result = compile(root, { stopAfter: 'graph', writeBuild: false });

    if (result.diagnostics.hasErrors || !result.graph) {
      /* v8 ignore next -- error-path format ternary */
      outputDiagnostics(result.diagnostics, opts.format === 'json' ? 'json' : 'human');
      process.exitCode = 1;
      return;
    }

    const { config } = loadConfig(root);
    const checklist = generateChecklist(result.graph, config);

    if (opts.format === 'json') {
      const output = JSON.stringify(checklist, null, 2);
      if (opts.output) {
        writeFileSync(resolve(opts.output), output + '\n', 'utf-8');
        process.stdout.write(success(`Checklist written to ${opts.output}`) + '\n');
      } else {
        process.stdout.write(output + '\n');
      }
    } else {
      const output = formatChecklistHuman(checklist);
      if (opts.output) {
        writeFileSync(resolve(opts.output), output + '\n', 'utf-8');
        process.stdout.write(success(`Checklist written to ${opts.output}`) + '\n');
      } else {
        process.stdout.write(output + '\n');
      }
    }
    process.exitCode = 0;
  });

// -----------------------------------------------------------------------
// analyze
// -----------------------------------------------------------------------
program
  .command('analyze')
  .description('Run cross-spec consistency and coverage analysis')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .option('--threshold <n>', 'Cross-module coupling threshold', parseInt)
  .action((path: string, opts: { format: string; threshold?: number }) => {
    const root = resolve(path);
    const result = compile(root, { stopAfter: 'graph', writeBuild: false });

    if (result.diagnostics.hasErrors || !result.graph) {
      /* v8 ignore next -- error-path format ternary */
      outputDiagnostics(result.diagnostics, opts.format === 'json' ? 'json' : 'human');
      process.exitCode = 1;
      return;
    }

    const analysis = analyzeGraph(result.graph, { couplingThreshold: opts.threshold ?? 5 });

    if (opts.format === 'json') {
      process.stdout.write(JSON.stringify(analysis, null, 2) + '\n');
    } else {
      process.stdout.write(formatAnalysisHuman(analysis) + '\n');
    }
    process.exitCode = 0;
  });

// -----------------------------------------------------------------------
// onboard
// -----------------------------------------------------------------------
program
  .command('onboard')
  .description('Generate a guided project walkthrough for new team members')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .option('--output <file>', 'Write onboarding doc to a file')
  .action((path: string, opts: { format: string; output?: string }) => {
    const root = resolve(path);
    const result = compile(root, { stopAfter: 'graph', writeBuild: false });

    if (result.diagnostics.hasErrors || !result.graph) {
      /* v8 ignore next -- error-path format ternary */
      outputDiagnostics(result.diagnostics, opts.format === 'json' ? 'json' : 'human');
      process.exitCode = 1;
      return;
    }

    const graph = result.graph;
    const getArray = (mod: Record<string, unknown>, key: string): Array<{ id: string; name: string }> =>
      /* v8 ignore next -- modules always have array properties */
      (Array.isArray(mod[key]) ? mod[key] : []) as Array<{ id: string; name: string }>;
    const entityCount = graph.modules.reduce((sum, m) => sum + getArray(m, 'entities').length, 0);
    const workflowCount = graph.modules.reduce((sum, m) => sum + getArray(m, 'workflows').length, 0);
    const surfaceCount = graph.modules.reduce((sum, m) => sum + getArray(m, 'surfaces').length, 0);

    if (opts.format === 'json') {
      const data = {
        product: graph.product.name,
        version: graph.product.version,
        modules: graph.modules.map(m => ({
          name: m.name,
          entities: getArray(m, 'entities').map(e => e.name),
          workflows: getArray(m, 'workflows').map(w => w.name),
          surfaces: getArray(m, 'surfaces').map(s => s.name),
        })),
        stats: { modules: graph.modules.length, entities: entityCount, workflows: workflowCount, surfaces: surfaceCount },
      };
      const output = JSON.stringify(data, null, 2);
      if (opts.output) {
        writeFileSync(resolve(opts.output), output + '\n', 'utf-8');
        process.stdout.write(success(`Onboarding doc written to ${opts.output}`) + '\n');
      } else {
        process.stdout.write(output + '\n');
      }
    } else {
      const lines: string[] = [];
      lines.push(`# Welcome to ${graph.product.name}`);
      lines.push('');
      lines.push('## Product Overview');
      lines.push('');
      lines.push(`**${graph.product.name}** v${graph.product.version}`);
      lines.push('');
      lines.push(`## Modules (${graph.modules.length} module${/* v8 ignore next -- singular module case */ graph.modules.length !== 1 ? 's' : ''})`);
      lines.push('');
      for (const mod of graph.modules) {
        lines.push(`### ${mod.name}`);
        const ents = getArray(mod, 'entities');
        const wfs = getArray(mod, 'workflows');
        const surfs = getArray(mod, 'surfaces');
        if (ents.length > 0) lines.push(`- Entities: ${ents.map(e => e.name).join(', ')}`);
        if (wfs.length > 0) lines.push(`- Workflows: ${wfs.map(w => w.name).join(', ')}`);
        if (surfs.length > 0) lines.push(`- Surfaces: ${surfs.map(s => s.name).join(', ')}`);
        lines.push('');
      }
      lines.push('## Architecture');
      lines.push('');
      lines.push(`- ${entityCount} entities, ${workflowCount} workflows, ${surfaceCount} surfaces`);
      lines.push(`- ${graph.edges.length} relationships in the product graph`);
      lines.push('');
      lines.push('## Getting Started');
      lines.push('');
      lines.push('1. Run `prodara validate` to check specs');
      lines.push('2. Run `prodara plan` to see the implementation plan');
      lines.push('3. Run `prodara build` to compile and implement');
      lines.push('4. Use `prodara explain <node-id>` to understand any graph node');
      lines.push('');
      const output = lines.join('\n');
      if (opts.output) {
        writeFileSync(resolve(opts.output), output + '\n', 'utf-8');
        process.stdout.write(success(`Onboarding doc written to ${opts.output}`) + '\n');
      } else {
        process.stdout.write(output + '\n');
      }
    }
    process.exitCode = 0;
  });

// -----------------------------------------------------------------------
// history
// -----------------------------------------------------------------------
program
  .command('history')
  .description('Browse past build runs')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--format <format>', 'Output format: human | json', 'human')
  .option('--last <n>', 'Show last N builds', parseInt)
  .option('--status <status>', 'Filter by outcome: success | failure')
  .action(async (path: string, opts: { format: string; last?: number; status?: string }) => {
    const root = resolve(path);
    const { config } = loadConfig(root);
    const { listAuditRecords } = await import('../audit/audit.js');
    const recordPaths = listAuditRecords(root, config.audit);

    // Parse audit records from files
    type AuditRecord = import('../audit/types.js').AuditRecord;
    let records: AuditRecord[] = recordPaths
      .map(p => JSON.parse(readFileSync(p, 'utf-8')) as AuditRecord)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Filter by status
    if (opts.status) {
      records = records.filter(r => r.outcome === opts.status);
    }

    // Limit results
    const limit = opts.last ?? 10;
    records = records.slice(0, limit);

    if (opts.format === 'json') {
      process.stdout.write(JSON.stringify(records, null, 2) + '\n');
    } else if (records.length === 0) {
      process.stdout.write(uiInfo('No build history recorded.') + '\n');
      process.stdout.write(dim('Run `prodara build` to create a build record.') + '\n');
    } else {
      process.stdout.write(bold(`Build History (last ${records.length}):`) + '\n\n');
      for (const r of records) {
        const icon = r.outcome === 'success' ? phaseIcon('ok') : phaseIcon('error');
        const date = new Date(r.timestamp).toLocaleString();
        const phaseSummary = r.phases.map(p => `${p.name}:${p.status}`).join(' ');
        process.stdout.write(`  ${icon} ${date} — ${r.outcome}\n`);
        if (phaseSummary) {
          process.stdout.write(`    Phases: ${phaseSummary}\n`);
        }
        process.stdout.write('\n');
      }
    }
    process.exitCode = 0;
  });

// ---------------------------------------------------------------------------
// Extension management
// ---------------------------------------------------------------------------

const ext = program
  .command('extension')
  .description('Manage Prodara extensions');

ext
  .command('list')
  .description('List installed extensions')
  .argument('[path]', 'Project root directory', '.')
  .action((path: string) => {
    const root = resolve(path);
    const extensions = listInstalledExtensions(root);
    if (extensions.length === 0) {
      process.stdout.write(uiInfo('No extensions installed.') + '\n');
    } else {
      process.stdout.write(bold(`Installed extensions (${extensions.length}):`) + '\n\n');
      for (const ext of extensions) {
        const caps = ext.manifest.capabilities.map(c => c.kind).join(', ');
        process.stdout.write(`  ${ext.manifest.name}@${ext.manifest.version} — ${ext.manifest.description}\n`);
        process.stdout.write(`    Capabilities: ${caps}\n\n`);
      }
    }
    process.exitCode = 0;
  });

ext
  .command('add')
  .description('Install an extension from a manifest JSON file')
  .argument('<manifest-path>', 'Path to prodara-extension.json')
  .argument('[path]', 'Project root directory', '.')
  .action((manifestPath: string, path: string) => {
    const root = resolve(path);
    const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf-8'));
    const installed = installExtension(root, manifest.name, manifest);
    process.stdout.write(success(`Installed extension "${manifest.name}" at ${installed.path}`) + '\n');
    process.exitCode = 0;
  });

ext
  .command('remove')
  .description('Remove an installed extension')
  .argument('<name>', 'Extension name')
  .argument('[path]', 'Project root directory', '.')
  .action((name: string, path: string) => {
    const root = resolve(path);
    removeExtension(root, name);
    process.stdout.write(success(`Removed extension "${name}".`) + '\n');
    process.exitCode = 0;
  });

// ---------------------------------------------------------------------------
// Preset management
// ---------------------------------------------------------------------------

const pst = program
  .command('preset')
  .description('Manage Prodara presets');

pst
  .command('list')
  .description('List installed presets')
  .argument('[path]', 'Project root directory', '.')
  .action((path: string) => {
    const root = resolve(path);
    const presets = loadPresets(root);
    if (presets.length === 0) {
      process.stdout.write(uiInfo('No presets installed.') + '\n');
    } else {
      process.stdout.write(bold(`Installed presets (${presets.length}):`) + '\n\n');
      for (const p of presets) {
        process.stdout.write(`  ${p.manifest.name}@${p.manifest.version} — ${p.manifest.description}\n`);
        process.stdout.write(`    Priority: ${p.priority}\n\n`);
      }
    }
    process.exitCode = 0;
  });

pst
  .command('add')
  .description('Install a preset from a manifest JSON file')
  .argument('<manifest-path>', 'Path to prodara-preset.json')
  .argument('[path]', 'Project root directory', '.')
  .action((manifestPath: string, path: string) => {
    const root = resolve(path);
    const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf-8'));
    const installed = installPreset(root, manifest.name, manifest);
    process.stdout.write(success(`Installed preset "${manifest.name}" at ${installed.path}`) + '\n');
    process.exitCode = 0;
  });

pst
  .command('remove')
  .description('Remove an installed preset')
  .argument('<name>', 'Preset name')
  .argument('[path]', 'Project root directory', '.')
  .action((name: string, path: string) => {
    const root = resolve(path);
    removePreset(root, name);
    process.stdout.write(success(`Removed preset "${name}".`) + '\n');
    process.exitCode = 0;
  });

// ---------------------------------------------------------------------------
// docs
// ---------------------------------------------------------------------------

program
  .command('docs')
  .description('Generate human-readable markdown docs from .prd specifications')
  .argument('[path]', 'Directory containing .prd files', '.')
  .option('--output <dir>', 'Output directory (relative to project root)')
  .action((path: string, opts: { output?: string }) => {
    const root = resolve(path);
    const result = compile(root, { stopAfter: 'graph', writeBuild: false });

    if (result.diagnostics.hasErrors || !result.graph) {
      outputDiagnostics(result.diagnostics, 'human');
      process.exitCode = 1;
      return;
    }

    const { config } = loadConfig(root);
    const docsConfig = opts.output
      ? { ...config.docs, outputDir: opts.output }
      : config.docs;

    const files = generateDocs(result.graph, docsConfig, root);
    writeDocs(files, docsConfig.outputDir, root);

    process.stdout.write(success(`Generated ${files.length} doc file(s) in ${docsConfig.outputDir}/`) + '\n');
    process.exitCode = 0;
  });

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

program
  .command('dashboard')
  .description('Show project overview dashboard')
  .argument('[path]', 'Directory containing .prd files', '.')
  .action((path: string) => {
    const root = resolve(path);
    const result = compile(root, {});
    const data = collectDashboardData(root, result);
    process.stdout.write(formatDashboard(data) + '\n');
    process.exitCode = 0;
  });

return program;
}

// Entry point — only runs when executed directly
/* v8 ignore next 3 */
if (process.argv[1] && resolve(process.argv[1]).includes('main')) {
  createProgram().parse();
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
export function outputDiagnostics(bag: import('../diagnostics/diagnostic.js').DiagnosticBag, format: string): void {
  if (format === 'json') {
    process.stdout.write(formatDiagnosticsJson(bag) + '\n');
  } else {
    const text = formatDiagnosticsHuman(bag);
    if (text.length > 0) {
      process.stderr.write(text + '\n');
    }
  }
}

export function applyCliOverrides(
  config: ResolvedConfig,
  opts: { maxReviewLoops?: number; autoClarify?: boolean },
): ResolvedConfig {
  let result = config;

  if (opts.maxReviewLoops !== undefined && opts.maxReviewLoops > 0) {
    result = {
      ...result,
      reviewFix: { ...result.reviewFix, maxIterations: opts.maxReviewLoops },
    };
  }

  if (opts.autoClarify) {
    result = {
      ...result,
      phases: { ...result.phases, clarify: { ...result.phases.clarify, ambiguityThreshold: 'low' as const } },
    };
  }

  return result;
}
