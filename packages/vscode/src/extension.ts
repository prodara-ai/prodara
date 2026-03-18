// ---------------------------------------------------------------------------
// Prodara VS Code Extension — Entry Point
// ---------------------------------------------------------------------------

import * as vscode from 'vscode';
import * as path from 'path';
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // Start LSP client
  const serverModule = context.asAbsolutePath(
    path.join('node_modules', '@prodara', 'lsp', 'dist', 'server.js'),
  );

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'prd' }],
  };

  client = new LanguageClient(
    'prodaraLsp',
    'Prodara Language Server',
    serverOptions,
    clientOptions,
  );

  client.start().catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Prodara LSP failed to start: ${msg}`);
  });

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  statusBarItem.text = '$(symbol-misc) Prodara';
  statusBarItem.tooltip = 'Prodara Specification Language';
  statusBarItem.command = 'prodara.build';
  context.subscriptions.push(statusBarItem);

  // Show/hide status bar based on active editor language
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
  );
  updateStatusBar(vscode.window.activeTextEditor);

  // Document symbol provider (outline)
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { language: 'prd' },
      new PrdDocumentSymbolProvider(),
    ),
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('prodara.build', runBuild),
    vscode.commands.registerCommand('prodara.validate', runValidate),
    vscode.commands.registerCommand('prodara.showGraph', showGraph),
    vscode.commands.registerCommand('prodara.showPlan', showPlan),
    vscode.commands.registerCommand('prodara.drift', runDrift),
    vscode.commands.registerCommand('prodara.diff', runDiff),
    vscode.commands.registerCommand('prodara.explain', runExplain),
    vscode.commands.registerCommand('prodara.graphVisualizer', () => openGraphVisualizer(context)),
  );
}

export async function deactivate(): Promise<void> {
  if (client) {
    await client.stop();
  }
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

function updateStatusBar(editor: vscode.TextEditor | undefined): void {
  if (!statusBarItem) return;
  if (editor && editor.document.languageId === 'prd') {
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}

// ---------------------------------------------------------------------------
// Document Symbol Provider (Outline)
// ---------------------------------------------------------------------------

const DECLARATION_PATTERN = /^\s*(product|module|entity|enum|workflow|screen|policy|test|event|api|job|integration|role|view)\s+(\w+)\s*\{/;

class PrdDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    const symbols: vscode.DocumentSymbol[] = [];
    const stack: { symbol: vscode.DocumentSymbol; braceDepth: number }[] = [];
    let braceDepth = 0;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text;

      // Count braces, skipping those inside strings and comments
      for (let ci = 0; ci < text.length; ci++) {
        const ch = text[ci];
        // Skip single-line comments
        if (ch === '/' && ci + 1 < text.length && text[ci + 1] === '/') break;
        // Skip string literals
        if (ch === '"' || ch === "'") {
          const quote = ch;
          ci++;
          while (ci < text.length && text[ci] !== quote) {
            if (text[ci] === '\\') ci++; // skip escaped char
            ci++;
          }
          continue;
        }
        if (ch === '{') braceDepth++;
        if (ch === '}') {
          braceDepth--;
          // Pop from stack if we closed a scope
          if (stack.length > 0 && braceDepth < stack[stack.length - 1].braceDepth) {
            const item = stack.pop()!;
            item.symbol.range = new vscode.Range(item.symbol.range.start, line.range.end);
          }
        }
      }

      // Check for declaration
      const match = DECLARATION_PATTERN.exec(text);
      if (match) {
        const kind = match[1];
        const name = match[2];
        const symbolKind = mapToSymbolKind(kind);
        const range = line.range;
        const sym = new vscode.DocumentSymbol(
          name,
          kind,
          symbolKind,
          range,
          range,
        );

        if (stack.length > 0) {
          stack[stack.length - 1].symbol.children.push(sym);
        } else {
          symbols.push(sym);
        }

        stack.push({ symbol: sym, braceDepth });
      }
    }

    return symbols;
  }
}

function mapToSymbolKind(kind: string): vscode.SymbolKind {
  switch (kind) {
    case 'product': return vscode.SymbolKind.Package;
    case 'module': return vscode.SymbolKind.Module;
    case 'entity': return vscode.SymbolKind.Class;
    case 'enum': return vscode.SymbolKind.Enum;
    case 'workflow': return vscode.SymbolKind.Function;
    case 'screen': return vscode.SymbolKind.Interface;
    case 'policy': return vscode.SymbolKind.Constant;
    case 'test': return vscode.SymbolKind.Method;
    case 'event': return vscode.SymbolKind.Event;
    case 'api': return vscode.SymbolKind.Interface;
    case 'job': return vscode.SymbolKind.Function;
    case 'role': return vscode.SymbolKind.TypeParameter;
    default: return vscode.SymbolKind.Variable;
  }
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

/** Shell-escape a string for safe embedding in a terminal command. */
function shellEscape(arg: string): string {
  // Single-quote wrapping with inner single-quote escaping
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

function runTerminalCommand(name: string, args: string[]): void {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) return;

  const terminal = vscode.window.createTerminal(`Prodara ${name}`);
  terminal.show();
  const allArgs = [...args, workspaceRoot];
  const escaped = allArgs.map(shellEscape).join(' ');
  terminal.sendText(`npx prodara ${escaped}`);
}

async function runBuild(): Promise<void> {
  runTerminalCommand('Build', ['build']);
}

async function runValidate(): Promise<void> {
  runTerminalCommand('Validate', ['validate']);
}

async function showGraph(): Promise<void> {
  runTerminalCommand('Graph', ['graph']);
}

async function showPlan(): Promise<void> {
  runTerminalCommand('Plan', ['plan']);
}

async function runDrift(): Promise<void> {
  runTerminalCommand('Drift', ['drift']);
}

async function runDiff(): Promise<void> {
  runTerminalCommand('Diff', ['diff', '--semantic', '--format', 'human']);
}

async function runExplain(): Promise<void> {
  const nodeId = await vscode.window.showInputBox({
    prompt: 'Enter the node ID to explain (e.g. core.entity.user)',
    placeHolder: 'module.kind.name',
  });
  if (!nodeId) return;

  // Validate node ID format (only allow alphanumeric, dots, hyphens, underscores)
  if (!/^[\w][\w.\-]*$/.test(nodeId)) {
    vscode.window.showErrorMessage('Invalid node ID format. Use alphanumeric characters, dots, hyphens, and underscores.');
    return;
  }

  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) return;

  const terminal = vscode.window.createTerminal('Prodara Explain');
  terminal.show();
  const escaped = [shellEscape('explain'), shellEscape(nodeId), shellEscape(workspaceRoot)].join(' ');
  terminal.sendText(`npx prodara ${escaped}`);
}

// ---------------------------------------------------------------------------
// Graph Visualizer Webview
// ---------------------------------------------------------------------------

async function openGraphVisualizer(context: vscode.ExtensionContext): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) return;

  const graphPath = path.join(workspaceRoot, '.prodara', 'graph.json');
  let graphJson: string;
  try {
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(graphPath));
    graphJson = Buffer.from(bytes).toString('utf-8');
  } catch {
    vscode.window.showWarningMessage('No graph.json found. Run `Prodara: Build` first.');
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'prodaraGraph',
    'Prodara Product Graph',
    vscode.ViewColumn.Beside,
    { enableScripts: true },
  );

  panel.webview.html = getGraphVisualizerHtml(graphJson);
}

function getGraphVisualizerHtml(graphJson: string): string {
  // Sanitize the JSON for embedding in HTML
  const safeJson = graphJson.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prodara Product Graph</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family, sans-serif);
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #cccccc);
      overflow: hidden;
    }
    #toolbar {
      padding: 8px 12px;
      background: var(--vscode-sideBar-background, #252526);
      border-bottom: 1px solid var(--vscode-panel-border, #333);
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 13px;
    }
    #toolbar button {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #fff);
      border: none;
      padding: 4px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    #toolbar button:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }
    #toolbar .info {
      margin-left: auto;
      opacity: 0.7;
    }
    #canvas {
      width: 100vw;
      height: calc(100vh - 37px);
    }
    svg { width: 100%; height: 100%; }
    .node {
      cursor: pointer;
    }
    .node rect {
      rx: 6;
      ry: 6;
      stroke-width: 1.5;
    }
    .node text {
      font-size: 11px;
      fill: var(--vscode-editor-foreground, #ccc);
    }
    .node .kind-label {
      font-size: 9px;
      opacity: 0.6;
    }
    .edge line {
      stroke: #555;
      stroke-width: 1;
    }
    .edge .label {
      font-size: 9px;
      fill: #888;
    }
    .node.selected rect {
      stroke-width: 3;
      filter: brightness(1.3);
    }
    #tooltip {
      position: fixed;
      display: none;
      background: var(--vscode-editorWidget-background, #2d2d2d);
      border: 1px solid var(--vscode-editorWidget-border, #454545);
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 12px;
      max-width: 300px;
      z-index: 100;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <button onclick="resetView()">Reset View</button>
    <button onclick="toggleEdges()">Toggle Edges</button>
    <span class="info" id="stats"></span>
  </div>
  <div id="canvas"></div>
  <div id="tooltip"></div>

  <script>
    const graph = ${safeJson};

    function escapeHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Collect all nodes
    const nodes = [];
    const nodeMap = new Map();

    // Product node
    nodes.push({ id: 'product', kind: 'product', name: graph.product.name, color: '#4fc3f7' });
    nodeMap.set('product', nodes[0]);

    // Module nodes and their children
    for (const mod of graph.modules) {
      nodes.push({ id: mod.id, kind: 'module', name: mod.name, color: '#81c784' });
      nodeMap.set(mod.id, nodes[nodes.length - 1]);

      for (const [key, value] of Object.entries(mod)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && 'id' in item && 'kind' in item) {
              const c = kindColor(item.kind);
              nodes.push({ id: item.id, kind: item.kind, name: item.name, color: c, parent: mod.id });
              nodeMap.set(item.id, nodes[nodes.length - 1]);
            }
          }
        }
      }
    }

    function kindColor(kind) {
      const colors = {
        entity: '#ffb74d', workflow: '#ba68c8', enum: '#4dd0e1',
        screen: '#aed581', policy: '#ef5350', test: '#78909c',
        event: '#f06292', api: '#7986cb', job: '#a1887f',
        role: '#90a4ae', view: '#80cbc4',
      };
      return colors[kind] || '#9e9e9e';
    }

    // Layout: simple force-directed-ish grid
    const W = window.innerWidth;
    const H = window.innerHeight - 37;
    const cols = Math.ceil(Math.sqrt(nodes.length));
    nodes.forEach((n, i) => {
      n.x = 80 + (i % cols) * 160 + (Math.random() - 0.5) * 30;
      n.y = 60 + Math.floor(i / cols) * 90 + (Math.random() - 0.5) * 20;
    });

    let showEdges = true;
    const canvas = document.getElementById('canvas');
    const tooltip = document.getElementById('tooltip');
    const stats = document.getElementById('stats');
    stats.textContent = nodes.length + ' nodes, ' + graph.edges.length + ' edges';

    function render() {
      let svg = '<svg xmlns="http://www.w3.org/2000/svg">';

      // Edges
      if (showEdges) {
        for (const e of graph.edges) {
          const from = nodeMap.get(e.from);
          const to = nodeMap.get(e.to);
          if (from && to) {
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            svg += '<g class="edge">';
            svg += '<line x1="'+from.x+'" y1="'+from.y+'" x2="'+to.x+'" y2="'+to.y+'"/>';
            svg += '<text class="label" x="'+mx+'" y="'+(my-4)+'" text-anchor="middle">'+escapeHtml(e.kind)+'</text>';
            svg += '</g>';
          }
        }
      }

      // Nodes
      for (const n of nodes) {
        const w = Math.max(n.name.length * 7 + 20, 80);
        const h = 36;
        svg += '<g class="node" data-id="'+escapeHtml(n.id)+'" transform="translate('+(n.x - w/2)+','+(n.y - h/2)+')">';
        svg += '<rect width="'+w+'" height="'+h+'" fill="'+n.color+'22" stroke="'+n.color+'"/>';
        svg += '<text class="kind-label" x="'+w/2+'" y="12" text-anchor="middle">'+escapeHtml(n.kind)+'</text>';
        svg += '<text x="'+w/2+'" y="27" text-anchor="middle" font-weight="bold">'+escapeHtml(n.name)+'</text>';
        svg += '</g>';
      }

      svg += '</svg>';
      canvas.innerHTML = svg;

      // Click handler
      canvas.querySelectorAll('.node').forEach(el => {
        el.addEventListener('click', (e) => {
          const id = el.getAttribute('data-id');
          const node = nodeMap.get(id);
          if (node) {
            const incoming = graph.edges.filter(e => e.to === id).length;
            const outgoing = graph.edges.filter(e => e.from === id).length;
            tooltip.innerHTML = '<b>'+escapeHtml(node.name)+'</b><br>Kind: '+escapeHtml(node.kind)+'<br>ID: '+escapeHtml(node.id)+'<br>Incoming: '+incoming+'<br>Outgoing: '+outgoing;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 10) + 'px';
            tooltip.style.top = (e.clientY + 10) + 'px';
            setTimeout(() => { tooltip.style.display = 'none'; }, 3000);
          }
        });
      });
    }

    function resetView() {
      const cols = Math.ceil(Math.sqrt(nodes.length));
      nodes.forEach((n, i) => {
        n.x = 80 + (i % cols) * 160;
        n.y = 60 + Math.floor(i / cols) * 90;
      });
      render();
    }

    function toggleEdges() {
      showEdges = !showEdges;
      render();
    }

    render();
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage('No workspace folder open.');
    return undefined;
  }
  return folders[0].uri.fsPath;
}
