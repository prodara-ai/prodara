// ---------------------------------------------------------------------------
// Prodara Compiler — Keyword Table
// ---------------------------------------------------------------------------
// Single authoritative list of all Prodara v0.1 keywords.

import { TokenKind } from './tokens.js';

export const KEYWORDS: ReadonlyMap<string, TokenKind> = new Map<string, TokenKind>([
  // Product & module system
  ['product', TokenKind.ProductKw],
  ['module', TokenKind.ModuleKw],
  ['import', TokenKind.ImportKw],
  ['from', TokenKind.FromKw],
  ['as', TokenKind.AsKw],
  ['product_ref', TokenKind.ProductRefKw],
  ['publishes', TokenKind.PublishesKw],
  ['consumes', TokenKind.ConsumesKw],

  // Domain
  ['entity', TokenKind.EntityKw],
  ['enum', TokenKind.EnumKw],
  ['value', TokenKind.ValueKw],
  ['rule', TokenKind.RuleKw],
  ['condition', TokenKind.ConditionKw],
  ['message', TokenKind.MessageKw],

  // Expressions
  ['and', TokenKind.AndKw],
  ['or', TokenKind.OrKw],
  ['not', TokenKind.NotKw],

  // Product structure
  ['actor', TokenKind.ActorKw],
  ['capability', TokenKind.CapabilityKw],
  ['actors', TokenKind.ActorsKw],

  // Behavior
  ['workflow', TokenKind.WorkflowKw],
  ['action', TokenKind.ActionKw],
  ['authorization', TokenKind.AuthorizationKw],
  ['input', TokenKind.InputKw],
  ['reads', TokenKind.ReadsKw],
  ['writes', TokenKind.WritesKw],
  ['rules', TokenKind.RulesKw],
  ['steps', TokenKind.StepsKw],
  ['transitions', TokenKind.TransitionsKw],
  ['effects', TokenKind.EffectsKw],
  ['returns', TokenKind.ReturnsKw],
  ['call', TokenKind.CallKw],
  ['decide', TokenKind.DecideKw],
  ['when', TokenKind.WhenKw],
  ['fail', TokenKind.FailKw],
  ['on', TokenKind.OnKw],

  // Events & schedules
  ['event', TokenKind.EventKw],
  ['payload', TokenKind.PayloadKw],
  ['schedule', TokenKind.ScheduleKw],
  ['cron', TokenKind.CronKw],
  ['emit', TokenKind.EmitKw],

  // Interaction
  ['surface', TokenKind.SurfaceKw],
  ['kind', TokenKind.KindKw],
  ['binds', TokenKind.BindsKw],
  ['actions', TokenKind.ActionsKw],
  ['title', TokenKind.TitleKw],
  ['description', TokenKind.DescriptionKw],
  ['hooks', TokenKind.HooksKw],
  ['fields', TokenKind.FieldsKw],
  ['serialization', TokenKind.SerializationKw],

  // Rendering
  ['rendering', TokenKind.RenderingKw],
  ['target', TokenKind.TargetKw],
  ['platform', TokenKind.PlatformKw],
  ['layout', TokenKind.LayoutKw],
  ['grid', TokenKind.GridKw],
  ['placement', TokenKind.PlacementKw],
  ['style', TokenKind.StyleKw],
  ['bind', TokenKind.BindKw],
  ['components', TokenKind.ComponentsKw],
  ['at', TokenKind.AtKw],
  ['columns', TokenKind.ColumnsKw],
  ['rows', TokenKind.RowsKw],
  ['gap', TokenKind.GapKw],
  ['row', TokenKind.RowKw],
  ['column', TokenKind.ColumnKw],
  ['auto', TokenKind.AutoKw],

  // Design system
  ['tokens', TokenKind.TokensKw],
  ['theme', TokenKind.ThemeKw],
  ['extends', TokenKind.ExtendsKw],
  ['strings', TokenKind.StringsKw],

  // Governance
  ['constitution', TokenKind.ConstitutionKw],
  ['use', TokenKind.UseKw],
  ['policies', TokenKind.PoliciesKw],
  ['applies_to', TokenKind.AppliesToKw],
  ['security', TokenKind.SecurityKw],
  ['requires', TokenKind.RequiresKw],
  ['privacy', TokenKind.PrivacyKw],
  ['classification', TokenKind.ClassificationKw],
  ['retention', TokenKind.RetentionKw],
  ['redact_on', TokenKind.RedactOnKw],
  ['exportable', TokenKind.ExportableKw],
  ['erasable', TokenKind.ErasableKw],
  ['validation', TokenKind.ValidationKw],

  // Platform
  ['integration', TokenKind.IntegrationKw],
  ['protocol', TokenKind.ProtocolKw],
  ['auth', TokenKind.AuthKw],
  ['transport', TokenKind.TransportKw],
  ['storage', TokenKind.StorageKw],
  ['model', TokenKind.ModelKw],
  ['table', TokenKind.TableKw],
  ['indexes', TokenKind.IndexesKw],
  ['execution', TokenKind.ExecutionKw],
  ['mode', TokenKind.ModeKw],
  ['extension', TokenKind.ExtensionKw],
  ['contract', TokenKind.ContractKw],
  ['body', TokenKind.BodyKw],
  ['language', TokenKind.LanguageKw],
  ['unique', TokenKind.UniqueKw],

  // Runtime
  ['secret', TokenKind.SecretKw],
  ['source', TokenKind.SourceKw],
  ['env', TokenKind.EnvKw],
  ['path', TokenKind.PathKw],
  ['scope', TokenKind.ScopeKw],
  ['environment', TokenKind.EnvironmentKw],
  ['url', TokenKind.UrlKw],
  ['secrets', TokenKind.SecretsKw],
  ['integrations', TokenKind.IntegrationsKw],
  ['environments', TokenKind.EnvironmentsKw],
  ['deployment', TokenKind.DeploymentKw],

  // Testing
  ['test', TokenKind.TestKw],
  ['given', TokenKind.GivenKw],
  ['expect', TokenKind.ExpectKw],

  // Effects
  ['audit', TokenKind.AuditKw],
  ['notify', TokenKind.NotifyKw],

  // Product metadata
  ['version', TokenKind.VersionKw],
  ['modules', TokenKind.ModulesKw],

  // Boolean literals (handled as keywords for lookup)
  ['true', TokenKind.BooleanTrue],
  ['false', TokenKind.BooleanFalse],
]);
