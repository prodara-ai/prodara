// ---------------------------------------------------------------------------
// Prodara Compiler — AST Node Definitions
// ---------------------------------------------------------------------------
// Every language construct has a corresponding AST node. All nodes carry
// SourceLocation for diagnostics and future language service features.

import type { SourceLocation, TypeExpr } from '../types.js';

// ---------------------------------------------------------------------------
// File
// ---------------------------------------------------------------------------
export interface AstFile {
  readonly path: string;
  readonly declarations: readonly TopLevelDecl[];
}

export type TopLevelDecl = ProductDecl | ModuleDecl;

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------
export interface ProductDecl {
  readonly kind: 'product';
  readonly name: string;
  readonly title?: string;
  readonly version?: string;
  readonly description?: string;
  readonly modules?: readonly string[];
  readonly publishes?: PublishesBlock;
  readonly location: SourceLocation;
}

export interface PublishesBlock {
  readonly entries: readonly PublishesEntry[];
}

export interface PublishesEntry {
  readonly category: string;
  readonly symbols: readonly string[][];
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------
export interface ModuleDecl {
  readonly kind: 'module';
  readonly name: string;
  readonly items: readonly ModuleItem[];
  readonly location: SourceLocation;
}

export type ModuleItem =
  | ImportDecl
  | EntityDecl
  | ValueDecl
  | EnumDecl
  | RuleDecl
  | ActorDecl
  | CapabilityDecl
  | WorkflowDecl
  | ActionDecl
  | EventDecl
  | ScheduleDecl
  | SurfaceDecl
  | RenderingDecl
  | TokensDecl
  | ThemeDecl
  | StringsDecl
  | SerializationDecl
  | IntegrationDecl
  | TransportDecl
  | StorageDecl
  | ExecutionDecl
  | ExtensionDecl
  | ConstitutionDecl
  | SecurityDecl
  | PrivacyDecl
  | ValidationDecl
  | SecretDecl
  | EnvironmentDecl
  | DeploymentDecl
  | TestDecl
  | ProductRefDecl;

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
export interface ImportDecl {
  readonly kind: 'import';
  readonly symbol: string;
  readonly alias?: string;
  readonly from: string;
  readonly location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------
export interface FieldDecl {
  readonly name: string;
  readonly type: TypeExpr;
  readonly defaultValue?: ValueNode;
  readonly location: SourceLocation;
}

export interface EntityDecl {
  readonly kind: 'entity';
  readonly name: string;
  readonly fields: readonly FieldDecl[];
  readonly location: SourceLocation;
}

export interface ValueDecl {
  readonly kind: 'value';
  readonly name: string;
  readonly fields: readonly FieldDecl[];
  readonly location: SourceLocation;
}

export interface EnumMember {
  readonly name: string;
  readonly metadata?: readonly MetadataProperty[];
  readonly location: SourceLocation;
}

export interface MetadataProperty {
  readonly key: string;
  readonly value: ValueNode;
}

export interface EnumDecl {
  readonly kind: 'enum';
  readonly name: string;
  readonly members: readonly EnumMember[];
  readonly location: SourceLocation;
}

export interface RuleDecl {
  readonly kind: 'rule';
  readonly name: string;
  readonly entity: readonly string[];
  readonly condition: Expression;
  readonly message: readonly string[];
  readonly location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Product structure
// ---------------------------------------------------------------------------
export interface ActorDecl {
  readonly kind: 'actor';
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly location: SourceLocation;
}

export interface CapabilityDecl {
  readonly kind: 'capability';
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly actors?: readonly string[][];
  readonly location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Behavior
// ---------------------------------------------------------------------------
export interface AuthorizationEntry {
  readonly actor: string;
  readonly permissions: readonly string[];
}

export interface StepCall {
  readonly kind: 'call';
  readonly target: readonly string[];
}

export interface StepDecide {
  readonly kind: 'decide';
  readonly name: string;
  readonly branches: readonly WhenBranch[];
}

export interface StepFail {
  readonly kind: 'fail';
  readonly code: string;
}

export type Step = StepCall | StepDecide | StepFail;

export interface WhenBranch {
  readonly when: string;
  readonly action: StepCall | StepFail;
}

export interface TransitionStmt {
  readonly entity: readonly string[];
  readonly field: string;
  readonly from: string;
  readonly to: string;
}

export interface Effect {
  readonly kind: 'audit' | 'notify' | 'emit' | 'ref';
  readonly value: string | readonly string[];
}

export interface ReturnDecl {
  readonly name: string;
  readonly type: TypeExpr;
}

export interface WorkflowDecl {
  readonly kind: 'workflow';
  readonly name: string;
  readonly capability?: readonly string[];
  readonly authorization?: readonly AuthorizationEntry[];
  readonly input?: readonly FieldDecl[];
  readonly reads?: readonly string[][];
  readonly writes?: readonly string[][];
  readonly rules?: readonly string[][];
  readonly steps?: readonly Step[];
  readonly transitions?: readonly TransitionStmt[];
  readonly effects?: readonly Effect[];
  readonly returns?: readonly ReturnDecl[];
  readonly trigger?: readonly string[];
  readonly location: SourceLocation;
}

export interface ActionDecl {
  readonly kind: 'action';
  readonly name: string;
  readonly title?: string;
  readonly workflow?: readonly string[];
  readonly description?: string;
  readonly location: SourceLocation;
}

export interface EventDecl {
  readonly kind: 'event';
  readonly name: string;
  readonly payload?: TypeExpr;
  readonly description?: string;
  readonly location: SourceLocation;
}

export interface ScheduleDecl {
  readonly kind: 'schedule';
  readonly name: string;
  readonly cron?: string;
  readonly description?: string;
  readonly location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------
export interface HookDecl {
  readonly name: string;
  readonly target: readonly string[];
}

export interface SurfaceDecl {
  readonly kind: 'surface';
  readonly name: string;
  readonly surfaceKind?: string;
  readonly title?: string | readonly string[];
  readonly description?: string;
  readonly capability?: readonly string[];
  readonly binds?: readonly string[];
  readonly serialization?: readonly string[];
  readonly surfaces?: readonly string[][];
  readonly actions?: readonly string[][];
  readonly rules?: readonly string[][];
  readonly hooks?: readonly HookDecl[];
  readonly fields?: readonly FieldDecl[];
  readonly location: SourceLocation;
}

export interface RenderingDecl {
  readonly kind: 'rendering';
  readonly name: string;
  readonly target?: readonly string[];
  readonly platform?: string;
  readonly layout?: string;
  readonly grid?: GridBlock;
  readonly placements?: readonly PlacementEntry[];
  readonly styles?: readonly StyleProperty[];
  readonly bindings?: readonly BindEntry[];
  readonly components?: readonly string[][];
  readonly responsive?: readonly ResponsiveBlock[];
  readonly location: SourceLocation;
}

export interface GridBlock {
  readonly columns?: readonly GridTrackValue[];
  readonly rows?: readonly GridTrackValue[];
  readonly gap?: ValueNode;
}

export type GridTrackValue =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'dimension'; readonly value: number; readonly unit: string }
  | { readonly kind: 'auto' };

export interface PlacementEntry {
  readonly name: string;
  readonly row?: number | { from: number; to: number };
  readonly column?: number | { from: number; to: number };
}

export interface StyleProperty {
  readonly name: string;
  readonly value: ValueNode | readonly string[];
}

export interface BindEntry {
  readonly from: readonly string[];
  readonly to: readonly string[];
}

export interface ResponsiveBlock {
  readonly breakpoint: readonly string[];
  readonly properties: readonly RenderingDecl[];
}

// ---------------------------------------------------------------------------
// Design system
// ---------------------------------------------------------------------------
export interface TokenCategoryBlock {
  readonly name: string;
  readonly tokens: readonly TokenEntry[];
}

export interface TokenEntry {
  readonly name: string;
  readonly value: ValueNode;
}

export interface TokensDecl {
  readonly kind: 'tokens';
  readonly name: string;
  readonly categories: readonly TokenCategoryBlock[];
  readonly location: SourceLocation;
}

export interface ThemeDecl {
  readonly kind: 'theme';
  readonly name: string;
  readonly extends: string;
  readonly overrides: readonly TokenCategoryBlock[];
  readonly location: SourceLocation;
}

export interface StringEntry {
  readonly key: string;
  readonly value: string;
}

export interface StringsDecl {
  readonly kind: 'strings';
  readonly name: string;
  readonly entries: readonly StringEntry[];
  readonly location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------
export interface SerializationDecl {
  readonly kind: 'serialization';
  readonly name: string;
  readonly properties: readonly KeyValuePair[];
  readonly location: SourceLocation;
}

export interface KeyValuePair {
  readonly key: string;
  readonly value: ValueNode;
}

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------
export interface IntegrationDecl {
  readonly kind: 'integration';
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly integrationKind?: string;
  readonly protocol?: string;
  readonly serialization?: readonly string[];
  readonly auth?: readonly KeyValuePair[];
  readonly location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Platform refinements
// ---------------------------------------------------------------------------
export interface TransportDecl {
  readonly kind: 'transport';
  readonly name: string;
  readonly target?: readonly string[];
  readonly protocol?: string;
  readonly style?: string;
  readonly description?: string;
  readonly location: SourceLocation;
}

export interface IndexEntry {
  readonly fields: readonly string[];
  readonly unique: boolean;
}

export interface StorageDecl {
  readonly kind: 'storage';
  readonly name: string;
  readonly target?: readonly string[];
  readonly model?: string;
  readonly table?: string;
  readonly indexes?: readonly IndexEntry[];
  readonly description?: string;
  readonly location: SourceLocation;
}

export interface ExecutionDecl {
  readonly kind: 'execution';
  readonly name: string;
  readonly target?: readonly string[];
  readonly mode?: string;
  readonly description?: string;
  readonly location: SourceLocation;
}

export interface ContractBlock {
  readonly input?: TypeExpr;
  readonly output?: TypeExpr;
}

export interface ExtensionDecl {
  readonly kind: 'extension';
  readonly name: string;
  readonly target?: readonly string[];
  readonly extensionKind?: string;
  readonly language?: string;
  readonly description?: string;
  readonly contract?: ContractBlock;
  readonly body?: string;
  readonly location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Governance
// ---------------------------------------------------------------------------
export interface PackageRef {
  readonly path: string;
  readonly version: string;
}

export interface PolicyBlock {
  readonly name: string;
  readonly properties: readonly KeyValuePair[];
}

export interface ConstitutionDecl {
  readonly kind: 'constitution';
  readonly name: string;
  readonly description?: string;
  readonly appliesTo?: readonly string[][];
  readonly packages?: readonly PackageRef[];
  readonly policies?: readonly PolicyBlock[];
  readonly location: SourceLocation;
}

export interface SecurityDecl {
  readonly kind: 'security';
  readonly name: string;
  readonly appliesTo?: readonly string[][];
  readonly requires?: readonly string[][];
  readonly description?: string;
  readonly location: SourceLocation;
}

export interface PrivacyDecl {
  readonly kind: 'privacy';
  readonly name: string;
  readonly appliesTo?: readonly string[][];
  readonly classification?: string;
  readonly retention?: string;
  readonly redactOn?: readonly string[][];
  readonly exportable?: boolean;
  readonly erasable?: boolean;
  readonly description?: string;
  readonly location: SourceLocation;
}

export interface ValidationDecl {
  readonly kind: 'validation';
  readonly name: string;
  readonly appliesTo?: readonly string[][];
  readonly requires?: readonly string[][];
  readonly description?: string;
  readonly location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------
export interface SecretDecl {
  readonly kind: 'secret';
  readonly name: string;
  readonly description?: string;
  readonly source?: string;
  readonly env?: string;
  readonly path?: string;
  readonly scope?: readonly string[][];
  readonly location: SourceLocation;
}

export interface EnvironmentSecretEntry {
  readonly name: string;
  readonly value: ValueNode;
}

export interface EnvironmentIntegrationEntry {
  readonly ref: readonly string[];
  readonly value: ValueNode;
}

export interface EnvironmentDecl {
  readonly kind: 'environment';
  readonly name: string;
  readonly url?: string;
  readonly description?: string;
  readonly secrets?: readonly EnvironmentSecretEntry[];
  readonly integrations?: readonly EnvironmentIntegrationEntry[];
  readonly location: SourceLocation;
}

export interface DeploymentDecl {
  readonly kind: 'deployment';
  readonly name: string;
  readonly environments?: readonly string[][];
  readonly description?: string;
  readonly location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Testing
// ---------------------------------------------------------------------------
export interface GivenEntry {
  readonly ref: readonly string[];
  readonly value: ValueNode;
}

export interface AuthorizationExpectation {
  readonly actor: string;
  readonly expected: string;
}

export interface ExpectEntry {
  readonly key: string;
  readonly value: ValueNode | string | readonly AuthorizationExpectation[];
}

export interface TestDecl {
  readonly kind: 'test';
  readonly name: string;
  readonly target: readonly string[];
  readonly description?: string;
  readonly given?: readonly GivenEntry[];
  readonly expect: readonly ExpectEntry[];
  readonly location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Cross-product
// ---------------------------------------------------------------------------
export interface ConsumesBlock {
  readonly entries: readonly ConsumesEntry[];
}

export interface ConsumesEntry {
  readonly category: string;
  readonly symbols: readonly string[][];
}

export interface ProductRefDecl {
  readonly kind: 'product_ref';
  readonly name: string;
  readonly product?: string;
  readonly version?: string;
  readonly description?: string;
  readonly consumes?: ConsumesBlock;
  readonly auth?: readonly KeyValuePair[];
  readonly location: SourceLocation;
}

// ---------------------------------------------------------------------------
// Values and Expressions
// ---------------------------------------------------------------------------
export type ValueNode =
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'integer'; readonly value: number }
  | { readonly kind: 'decimal'; readonly value: number }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'identifier'; readonly value: string }
  | { readonly kind: 'ref'; readonly segments: readonly string[] }
  | { readonly kind: 'list'; readonly items: readonly ValueNode[] };

export type Expression =
  | { readonly kind: 'binary'; readonly op: string; readonly left: Expression; readonly right: Expression; readonly location: SourceLocation }
  | { readonly kind: 'unary'; readonly op: 'not'; readonly operand: Expression; readonly location: SourceLocation }
  | { readonly kind: 'access'; readonly segments: readonly string[]; readonly location: SourceLocation }
  | { readonly kind: 'literal'; readonly value: string | number | boolean; readonly literalType: 'string' | 'integer' | 'decimal' | 'boolean' | 'identifier'; readonly location: SourceLocation }
  | { readonly kind: 'paren'; readonly inner: Expression; readonly location: SourceLocation };
