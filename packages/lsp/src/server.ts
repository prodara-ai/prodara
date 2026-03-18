// ---------------------------------------------------------------------------
// Prodara LSP — Server
// ---------------------------------------------------------------------------
// Language server providing diagnostics, completions, and document symbols
// for .prd specification files.

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionItemKind,
  type InitializeParams,
  type CompletionItem,
  type CompletionParams,
  type DocumentSymbolParams,
  type HoverParams,
  type DefinitionParams,
  type ReferenceParams,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ModuleCache } from './cache.js';
import { PRD_KEYWORDS, PRD_TYPES } from './keywords.js';
import { DEFAULT_LSP_CONFIG } from './types.js';
import { validateText, extractSymbols } from './analysis.js';
import {
  buildSemanticModel,
  getHoverInfo,
  getDefinitionLocation,
  findReferences,
  getSemanticDiagnosticsForFile,
  type SemanticModel,
} from './semantic.js';

// ---------------------------------------------------------------------------
// Connection & document manager
// ---------------------------------------------------------------------------

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const cache = new ModuleCache(DEFAULT_LSP_CONFIG.maxCacheSize);

// Debounce timer for diagnostics
const diagnosticTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Semantic model for cross-file analysis (rebuilt on changes)
let semanticModel: SemanticModel | null = null;
let semanticRebuildTimer: ReturnType<typeof setTimeout> | null = null;
const SEMANTIC_DELAY = 500;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

connection.onInitialize((_params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ['.', ':'],
      },
      documentSymbolProvider: true,
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
    },
  };
});

// ---------------------------------------------------------------------------
// Document events
// ---------------------------------------------------------------------------

documents.onDidChangeContent((change) => {
  const uri = change.document.uri;
  cache.set(uri, change.document.version, change.document.getText());

  // Debounced structural diagnostics (fast)
  const existing = diagnosticTimers.get(uri);
  if (existing) clearTimeout(existing);
  diagnosticTimers.set(
    uri,
    setTimeout(() => {
      diagnosticTimers.delete(uri);
      try {
        const diagnostics = validateText(change.document.getText());
        connection.sendDiagnostics({ uri, diagnostics });
      } catch (err) {
        connection.console.error(`Diagnostic validation failed for ${uri}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, DEFAULT_LSP_CONFIG.diagnosticDelay),
  );

  // Debounced semantic model rebuild (slower, cross-file)
  scheduleSemanticRebuild();
});

documents.onDidClose((event) => {
  const uri = event.document.uri;
  cache.delete(uri);
  const timer = diagnosticTimers.get(uri);
  if (timer) { clearTimeout(timer); diagnosticTimers.delete(uri); }
  connection.sendDiagnostics({ uri, diagnostics: [] });
});

// ---------------------------------------------------------------------------
// Completions
// ---------------------------------------------------------------------------

connection.onCompletion((_params: CompletionParams): CompletionItem[] => {
  const items: CompletionItem[] = [];

  for (const kw of PRD_KEYWORDS) {
    items.push({
      label: kw,
      kind: CompletionItemKind.Keyword,
    });
  }

  for (const t of PRD_TYPES) {
    items.push({
      label: t,
      kind: CompletionItemKind.TypeParameter,
    });
  }

  return items;
});

// ---------------------------------------------------------------------------
// Document symbols
// ---------------------------------------------------------------------------

connection.onDocumentSymbol((params: DocumentSymbolParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  return extractSymbols(doc.getText());
});

// ---------------------------------------------------------------------------
// Hover
// ---------------------------------------------------------------------------

connection.onHover((params: HoverParams) => {
  if (!semanticModel) return null;
  return getHoverInfo(semanticModel, params.textDocument.uri, params.position);
});

// ---------------------------------------------------------------------------
// Go to Definition
// ---------------------------------------------------------------------------

connection.onDefinition((params: DefinitionParams) => {
  if (!semanticModel) return null;
  return getDefinitionLocation(semanticModel, params.textDocument.uri, params.position);
});

// ---------------------------------------------------------------------------
// Find References
// ---------------------------------------------------------------------------

connection.onReferences((params: ReferenceParams) => {
  if (!semanticModel) return [];
  return findReferences(semanticModel, params.textDocument.uri, params.position);
});

// ---------------------------------------------------------------------------
// Semantic model rebuild
// ---------------------------------------------------------------------------

function scheduleSemanticRebuild(): void {
  if (semanticRebuildTimer) clearTimeout(semanticRebuildTimer);
  semanticRebuildTimer = setTimeout(() => {
    semanticRebuildTimer = null;
    try {
      rebuildSemanticModel();
    } catch (err) {
      connection.console.error(`Semantic model rebuild failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, SEMANTIC_DELAY);
}

function rebuildSemanticModel(): void {
  const docs = new Map<string, string>();
  for (const doc of documents.all()) {
    docs.set(doc.uri, doc.getText());
  }
  if (docs.size === 0) {
    semanticModel = null;
    return;
  }
  semanticModel = buildSemanticModel(docs);

  // Push semantic diagnostics to each open document
  for (const doc of documents.all()) {
    const uri = doc.uri;
    const structural = validateText(doc.getText());
    const semantic = getSemanticDiagnosticsForFile(semanticModel, uri);
    connection.sendDiagnostics({ uri, diagnostics: [...structural, ...semantic] });
  }
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

documents.listen(connection);
connection.listen();
