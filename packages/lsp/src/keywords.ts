// ---------------------------------------------------------------------------
// Prodara LSP — Keyword Lists
// ---------------------------------------------------------------------------
// Shared keyword and type lists for completions and document analysis.

/** All PRD language keywords used for completions. */
export const PRD_KEYWORDS = [
  'product', 'module', 'import', 'from', 'as', 'product_ref',
  'publishes', 'consumes',
  'entity', 'enum', 'value', 'rule', 'condition', 'message',
  'actor', 'capability', 'actors',
  'workflow', 'action', 'authorization', 'input', 'reads', 'writes',
  'rules', 'steps', 'transitions', 'effects', 'returns',
  'call', 'decide', 'when', 'fail', 'on',
  'event', 'payload', 'schedule', 'cron', 'emit',
  'surface', 'kind', 'binds', 'actions', 'title', 'description',
  'hooks', 'fields', 'serialization',
  'rendering', 'target', 'platform', 'layout', 'grid', 'placement',
  'style', 'bind', 'components', 'at', 'columns', 'rows', 'gap',
  'row', 'column', 'auto',
  'tokens', 'theme', 'extends', 'strings',
  'constitution', 'use', 'policies', 'applies_to', 'security',
  'requires', 'privacy', 'classification', 'retention',
  'redact_on', 'exportable', 'erasable', 'validation',
  'integration', 'protocol', 'auth', 'transport', 'storage',
  'model', 'table', 'indexes', 'execution', 'mode', 'extension',
  'contract', 'body', 'language', 'unique',
  'secret', 'source', 'env', 'path', 'scope', 'environment',
  'url', 'secrets', 'integrations', 'environments', 'deployment',
  'test', 'given', 'expect',
  'audit', 'notify', 'version', 'modules',
] as const;

/** Built-in PRD type names used for completions. */
export const PRD_TYPES = [
  'string', 'integer', 'decimal', 'boolean', 'uuid', 'date', 'datetime',
  'optional', 'list', 'map',
] as const;

/** Block-level keywords that declare named constructs. */
export const BLOCK_DECLARATIONS = [
  'product', 'module', 'entity', 'enum', 'value', 'actor',
  'capability', 'workflow', 'action', 'event', 'schedule',
  'surface', 'rule', 'storage', 'integration', 'execution',
  'extension', 'contract', 'rendering', 'tokens', 'theme',
  'strings', 'constitution', 'policies', 'security', 'privacy',
  'deployment', 'test', 'secret', 'environment',
] as const;
