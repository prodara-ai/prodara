// ---------------------------------------------------------------------------
// Prodara Compiler — Token Model
// ---------------------------------------------------------------------------

export enum TokenKind {
  // Literals
  StringLiteral = 'StringLiteral',
  IntegerLiteral = 'IntegerLiteral',
  DecimalLiteral = 'DecimalLiteral',
  BooleanTrue = 'BooleanTrue',
  BooleanFalse = 'BooleanFalse',
  CodeLiteral = 'CodeLiteral',
  DimensionLiteral = 'DimensionLiteral',

  // Identifier
  Identifier = 'Identifier',

  // Keywords — Product & module system
  ProductKw = 'ProductKw',
  ModuleKw = 'ModuleKw',
  ImportKw = 'ImportKw',
  FromKw = 'FromKw',
  AsKw = 'AsKw',
  ProductRefKw = 'ProductRefKw',
  PublishesKw = 'PublishesKw',
  ConsumesKw = 'ConsumesKw',

  // Keywords — Domain
  EntityKw = 'EntityKw',
  EnumKw = 'EnumKw',
  ValueKw = 'ValueKw',
  RuleKw = 'RuleKw',
  ConditionKw = 'ConditionKw',
  MessageKw = 'MessageKw',

  // Keywords — Expressions
  AndKw = 'AndKw',
  OrKw = 'OrKw',
  NotKw = 'NotKw',

  // Keywords — Product structure
  ActorKw = 'ActorKw',
  CapabilityKw = 'CapabilityKw',
  ActorsKw = 'ActorsKw',

  // Keywords — Behavior
  WorkflowKw = 'WorkflowKw',
  ActionKw = 'ActionKw',
  AuthorizationKw = 'AuthorizationKw',
  InputKw = 'InputKw',
  ReadsKw = 'ReadsKw',
  WritesKw = 'WritesKw',
  RulesKw = 'RulesKw',
  StepsKw = 'StepsKw',
  TransitionsKw = 'TransitionsKw',
  EffectsKw = 'EffectsKw',
  ReturnsKw = 'ReturnsKw',
  CallKw = 'CallKw',
  DecideKw = 'DecideKw',
  WhenKw = 'WhenKw',
  FailKw = 'FailKw',
  OnKw = 'OnKw',

  // Keywords — Events & schedules
  EventKw = 'EventKw',
  PayloadKw = 'PayloadKw',
  ScheduleKw = 'ScheduleKw',
  CronKw = 'CronKw',
  EmitKw = 'EmitKw',

  // Keywords — Interaction
  SurfaceKw = 'SurfaceKw',
  KindKw = 'KindKw',
  BindsKw = 'BindsKw',
  ActionsKw = 'ActionsKw',
  TitleKw = 'TitleKw',
  DescriptionKw = 'DescriptionKw',
  HooksKw = 'HooksKw',
  FieldsKw = 'FieldsKw',
  SerializationKw = 'SerializationKw',

  // Keywords — Rendering
  RenderingKw = 'RenderingKw',
  TargetKw = 'TargetKw',
  PlatformKw = 'PlatformKw',
  LayoutKw = 'LayoutKw',
  GridKw = 'GridKw',
  PlacementKw = 'PlacementKw',
  StyleKw = 'StyleKw',
  BindKw = 'BindKw',
  ComponentsKw = 'ComponentsKw',
  AtKw = 'AtKw',
  ColumnsKw = 'ColumnsKw',
  RowsKw = 'RowsKw',
  GapKw = 'GapKw',
  RowKw = 'RowKw',
  ColumnKw = 'ColumnKw',
  AutoKw = 'AutoKw',

  // Keywords — Design system
  TokensKw = 'TokensKw',
  ThemeKw = 'ThemeKw',
  ExtendsKw = 'ExtendsKw',
  StringsKw = 'StringsKw',

  // Keywords — Governance
  ConstitutionKw = 'ConstitutionKw',
  UseKw = 'UseKw',
  PoliciesKw = 'PoliciesKw',
  AppliesToKw = 'AppliesToKw',
  SecurityKw = 'SecurityKw',
  RequiresKw = 'RequiresKw',
  PrivacyKw = 'PrivacyKw',
  ClassificationKw = 'ClassificationKw',
  RetentionKw = 'RetentionKw',
  RedactOnKw = 'RedactOnKw',
  ExportableKw = 'ExportableKw',
  ErasableKw = 'ErasableKw',
  ValidationKw = 'ValidationKw',

  // Keywords — Platform
  IntegrationKw = 'IntegrationKw',
  ProtocolKw = 'ProtocolKw',
  AuthKw = 'AuthKw',
  TransportKw = 'TransportKw',
  StorageKw = 'StorageKw',
  ModelKw = 'ModelKw',
  TableKw = 'TableKw',
  IndexesKw = 'IndexesKw',
  ExecutionKw = 'ExecutionKw',
  ModeKw = 'ModeKw',
  ExtensionKw = 'ExtensionKw',
  ContractKw = 'ContractKw',
  BodyKw = 'BodyKw',
  LanguageKw = 'LanguageKw',
  UniqueKw = 'UniqueKw',

  // Keywords — Runtime
  SecretKw = 'SecretKw',
  SourceKw = 'SourceKw',
  EnvKw = 'EnvKw',
  PathKw = 'PathKw',
  ScopeKw = 'ScopeKw',
  EnvironmentKw = 'EnvironmentKw',
  UrlKw = 'UrlKw',
  SecretsKw = 'SecretsKw',
  IntegrationsKw = 'IntegrationsKw',
  EnvironmentsKw = 'EnvironmentsKw',
  DeploymentKw = 'DeploymentKw',

  // Keywords — Testing
  TestKw = 'TestKw',
  GivenKw = 'GivenKw',
  ExpectKw = 'ExpectKw',

  // Keywords — Effects
  AuditKw = 'AuditKw',
  NotifyKw = 'NotifyKw',

  // Keywords — Product metadata
  VersionKw = 'VersionKw',
  ModulesKw = 'ModulesKw',

  // Punctuation
  OpenBrace = 'OpenBrace',
  CloseBrace = 'CloseBrace',
  OpenBracket = 'OpenBracket',
  CloseBracket = 'CloseBracket',
  OpenParen = 'OpenParen',
  CloseParen = 'CloseParen',
  Colon = 'Colon',
  Comma = 'Comma',
  Dot = 'Dot',
  Equals = 'Equals',
  LessThan = 'LessThan',
  GreaterThan = 'GreaterThan',
  Arrow = 'Arrow',
  DotDot = 'DotDot',
  AtSign = 'AtSign',
  Slash = 'Slash',

  // Comparison operators
  GreaterEqual = 'GreaterEqual',
  LessEqual = 'LessEqual',
  EqualsEquals = 'EqualsEquals',
  BangEquals = 'BangEquals',

  // Special
  EOF = 'EOF',
  Unknown = 'Unknown',
}

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly pos: number;
  readonly line: number;
  readonly column: number;
  readonly end: number;
}
