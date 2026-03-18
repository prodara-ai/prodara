// ---------------------------------------------------------------------------
// Prodara Compiler — Recursive Descent Parser
// ---------------------------------------------------------------------------

import type { SourceLocation, TypeExpr, PrimitiveTypeName } from '../types.js';
import { PRIMITIVE_TYPES } from '../types.js';
import { DiagnosticBag } from '../diagnostics/diagnostic.js';
import { TokenKind, type Token } from '../lexer/tokens.js';
import type { SourceFile } from '../lexer/source.js';
import { Lexer } from '../lexer/lexer.js';
import { parseExpression } from './expressions.js';
import type {
  AstFile, TopLevelDecl, ModuleDecl, ModuleItem, ProductDecl,
  ImportDecl, EntityDecl, ValueDecl, EnumDecl, EnumMember,
  RuleDecl, ActorDecl, CapabilityDecl, WorkflowDecl, ActionDecl,
  EventDecl, ScheduleDecl, SurfaceDecl, RenderingDecl,
  TokensDecl, ThemeDecl, StringsDecl, SerializationDecl,
  IntegrationDecl, TransportDecl, StorageDecl, ExecutionDecl,
  ExtensionDecl, ConstitutionDecl, SecurityDecl, PrivacyDecl,
  ValidationDecl, SecretDecl, EnvironmentDecl, DeploymentDecl,
  TestDecl, ProductRefDecl,
  FieldDecl, ValueNode, AuthorizationEntry, Step, StepCall, TransitionStmt,
  Effect, ReturnDecl, HookDecl, TokenCategoryBlock, TokenEntry,
  StringEntry, KeyValuePair, PolicyBlock, PackageRef, IndexEntry,
  ContractBlock, GivenEntry, ExpectEntry, AuthorizationExpectation,
  PublishesBlock, PublishesEntry, ConsumesBlock, ConsumesEntry,
  StyleProperty, BindEntry, PlacementEntry, GridBlock, GridTrackValue,
  MetadataProperty, WhenBranch,
  EnvironmentSecretEntry, EnvironmentIntegrationEntry, Expression,
} from './ast.js';

export class Parser {
  private readonly tokens: readonly Token[];
  private readonly bag: DiagnosticBag;
  private readonly file: string;
  private pos = 0;

  constructor(source: SourceFile, bag: DiagnosticBag) {
    this.file = source.path;
    this.bag = bag;
    const lexer = new Lexer(source, bag);
    this.tokens = lexer.tokenize();
  }

  parse(): AstFile {
    const declarations: TopLevelDecl[] = [];
    while (!this.isEof()) {
      const decl = this.parseTopLevel();
      if (decl) declarations.push(decl);
      else this.advance(); // recovery: skip token
    }
    return { path: this.file, declarations };
  }

  // -----------------------------------------------------------------------
  // Top-level
  // -----------------------------------------------------------------------
  private parseTopLevel(): TopLevelDecl | null {
    const tok = this.peek();
    if (tok.kind === TokenKind.ProductKw) return this.parseProduct();
    if (tok.kind === TokenKind.ModuleKw) return this.parseModule();
    this.error(tok, `Expected 'product' or 'module', got '${tok.text}'`);
    return null;
  }

  // -----------------------------------------------------------------------
  // Product
  // -----------------------------------------------------------------------
  private parseProduct(): ProductDecl {
    const start = this.expect(TokenKind.ProductKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let title: string | undefined;
    let version: string | undefined;
    let description: string | undefined;
    let modules: string[] | undefined;
    let publishes: PublishesBlock | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const prop = this.peek();
      if (prop.kind === TokenKind.TitleKw) {
        this.advance(); this.expect(TokenKind.Colon);
        title = this.expectStringValue();
      } else if (prop.kind === TokenKind.VersionKw) {
        this.advance(); this.expect(TokenKind.Colon);
        version = this.expectStringValue();
      } else if (prop.kind === TokenKind.DescriptionKw) {
        this.advance(); this.expect(TokenKind.Colon);
        description = this.expectStringValue();
      } else if (prop.kind === TokenKind.ModulesKw) {
        this.advance(); this.expect(TokenKind.Colon);
        modules = this.parseIdentList();
      } else if (prop.kind === TokenKind.PublishesKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        const entries: PublishesEntry[] = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const cat = this.expectIdentText();
          this.expect(TokenKind.Colon);
          const syms = this.parseSymbolRefList();
          entries.push({ category: cat, symbols: syms });
        }
        this.expect(TokenKind.CloseBrace);
        publishes = { entries };
      } else {
        this.error(prop, `Unexpected property in product: '${prop.text}'`);
        this.advance();
      }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'product', name, title, version, description, modules, publishes, location: this.loc(start) };
  }

  // -----------------------------------------------------------------------
  // Module
  // -----------------------------------------------------------------------
  private parseModule(): ModuleDecl {
    const start = this.expect(TokenKind.ModuleKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    const items: ModuleItem[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const item = this.parseModuleItem();
      if (item) items.push(item);
      else this.advance();
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'module', name, items, location: this.loc(start) };
  }

  private parseModuleItem(): ModuleItem | null {
    const tok = this.peek();
    switch (tok.kind) {
      case TokenKind.ImportKw: return this.parseImport();
      case TokenKind.EntityKw: return this.parseEntity();
      case TokenKind.ValueKw: return this.parseValue();
      case TokenKind.EnumKw: return this.parseEnum();
      case TokenKind.RuleKw: return this.parseRule();
      case TokenKind.ActorKw: return this.parseActor();
      case TokenKind.CapabilityKw: return this.parseCapability();
      case TokenKind.WorkflowKw: return this.parseWorkflow();
      case TokenKind.ActionKw: return this.parseAction();
      case TokenKind.EventKw: return this.parseEvent();
      case TokenKind.ScheduleKw: return this.parseSchedule();
      case TokenKind.SurfaceKw: return this.parseSurface();
      case TokenKind.RenderingKw: return this.parseRendering();
      case TokenKind.TokensKw: return this.parseTokens();
      case TokenKind.ThemeKw: return this.parseTheme();
      case TokenKind.StringsKw: return this.parseStrings();
      case TokenKind.SerializationKw: return this.parseSerialization();
      case TokenKind.IntegrationKw: return this.parseIntegration();
      case TokenKind.TransportKw: return this.parseTransport();
      case TokenKind.StorageKw: return this.parseStorage();
      case TokenKind.ExecutionKw: return this.parseExecution();
      case TokenKind.ExtensionKw: return this.parseExtension();
      case TokenKind.ConstitutionKw: return this.parseConstitution();
      case TokenKind.SecurityKw: return this.parseSecurity();
      case TokenKind.PrivacyKw: return this.parsePrivacy();
      case TokenKind.ValidationKw: return this.parseValidation();
      case TokenKind.SecretKw: return this.parseSecret();
      case TokenKind.EnvironmentKw: return this.parseEnvironment();
      case TokenKind.DeploymentKw: return this.parseDeployment();
      case TokenKind.TestKw: return this.parseTest();
      case TokenKind.ProductRefKw: return this.parseProductRef();
      default:
        this.error(tok, `Expected module item, got '${tok.text}'`);
        return null;
    }
  }

  // -----------------------------------------------------------------------
  // Import
  // -----------------------------------------------------------------------
  private parseImport(): ImportDecl {
    const start = this.expect(TokenKind.ImportKw);
    const symbol = this.expectIdentText();
    let alias: string | undefined;
    if (this.check(TokenKind.AsKw)) {
      this.advance();
      alias = this.expectIdentText();
    }
    this.expect(TokenKind.FromKw);
    const from = this.expectIdentText();
    return { kind: 'import', symbol, alias, from, location: this.loc(start) };
  }

  // -----------------------------------------------------------------------
  // Domain: entity, value, enum, rule
  // -----------------------------------------------------------------------
  private parseEntity(): EntityDecl {
    const start = this.expect(TokenKind.EntityKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    const fields = this.parseFieldList();
    this.expect(TokenKind.CloseBrace);
    return { kind: 'entity', name, fields, location: this.loc(start) };
  }

  private parseValue(): ValueDecl {
    const start = this.expect(TokenKind.ValueKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    const fields = this.parseFieldList();
    this.expect(TokenKind.CloseBrace);
    return { kind: 'value', name, fields, location: this.loc(start) };
  }

  private parseEnum(): EnumDecl {
    const start = this.expect(TokenKind.EnumKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    const members: EnumMember[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const memTok = this.peek();
      const memName = this.expectIdentText();
      let metadata: MetadataProperty[] | undefined;
      if (this.check(TokenKind.OpenBrace)) {
        this.advance();
        metadata = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const key = this.expectIdentText();
          this.expect(TokenKind.Colon);
          const val = this.parseValueNode();
          metadata.push({ key, value: val });
        }
        this.expect(TokenKind.CloseBrace);
      }
      members.push({ name: memName, metadata, location: this.loc(memTok) });
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'enum', name, members, location: this.loc(start) };
  }

  private parseRule(): RuleDecl {
    const start = this.expect(TokenKind.RuleKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let entity: readonly string[] = [];
    let condition: Expression | undefined;
    let message: readonly string[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const prop = this.peek();
      if (prop.kind === TokenKind.EntityKw) {
        this.advance(); this.expect(TokenKind.Colon);
        entity = this.parseSymbolRef();
      } else if (prop.kind === TokenKind.ConditionKw) {
        this.advance(); this.expect(TokenKind.Colon);
        condition = this.parseExpressionUntilNewline();
      } else if (prop.kind === TokenKind.MessageKw) {
        this.advance(); this.expect(TokenKind.Colon);
        message = this.parseSymbolRef();
      } else {
        this.error(prop, `Unexpected property in rule: '${prop.text}'`);
        this.advance();
      }
    }
    this.expect(TokenKind.CloseBrace);
    const fallbackCondition: Expression = condition ?? {
      kind: 'literal', value: true, literalType: 'boolean',
      location: this.loc(start),
    };
    return { kind: 'rule', name, entity, condition: fallbackCondition, message, location: this.loc(start) };
  }

  // -----------------------------------------------------------------------
  // Actors / Capabilities
  // -----------------------------------------------------------------------
  private parseActor(): ActorDecl {
    const start = this.expect(TokenKind.ActorKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let title: string | undefined;
    let description: string | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.TitleKw) { this.advance(); this.expect(TokenKind.Colon); title = this.expectStringValue(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else { this.error(p, `Unexpected property in actor: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'actor', name, title, description, location: this.loc(start) };
  }

  private parseCapability(): CapabilityDecl {
    const start = this.expect(TokenKind.CapabilityKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let title: string | undefined;
    let description: string | undefined;
    let actors: string[][] | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.TitleKw) { this.advance(); this.expect(TokenKind.Colon); title = this.expectStringValue(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else if (p.kind === TokenKind.ActorsKw) { this.advance(); this.expect(TokenKind.Colon); actors = this.parseSymbolRefList(); }
      else { this.error(p, `Unexpected property in capability: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'capability', name, title, description, actors, location: this.loc(start) };
  }

  // -----------------------------------------------------------------------
  // Workflow
  // -----------------------------------------------------------------------
  private parseWorkflow(): WorkflowDecl {
    const start = this.expect(TokenKind.WorkflowKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);

    let capability: readonly string[] | undefined;
    let authorization: AuthorizationEntry[] | undefined;
    let input: FieldDecl[] | undefined;
    let reads: string[][] | undefined;
    let writes: string[][] | undefined;
    let rules: string[][] | undefined;
    let steps: Step[] | undefined;
    let transitions: TransitionStmt[] | undefined;
    let effects: Effect[] | undefined;
    let returns: ReturnDecl[] | undefined;
    let trigger: readonly string[] | undefined;

    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.CapabilityKw) {
        this.advance(); this.expect(TokenKind.Colon);
        capability = this.parseSymbolRef();
      } else if (p.kind === TokenKind.AuthorizationKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        authorization = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const actor = this.expectIdentText();
          this.expect(TokenKind.Colon);
          const perms = this.parsePermissionList();
          authorization.push({ actor, permissions: perms });
        }
        this.expect(TokenKind.CloseBrace);
      } else if (p.kind === TokenKind.InputKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        input = [...this.parseFieldList()];
        this.expect(TokenKind.CloseBrace);
      } else if (p.kind === TokenKind.ReadsKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        reads = this.parseSymbolRefBlock();
        this.expect(TokenKind.CloseBrace);
      } else if (p.kind === TokenKind.WritesKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        writes = this.parseSymbolRefBlock();
        this.expect(TokenKind.CloseBrace);
      } else if (p.kind === TokenKind.RulesKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        rules = this.parseSymbolRefBlock();
        this.expect(TokenKind.CloseBrace);
      } else if (p.kind === TokenKind.StepsKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        steps = this.parseSteps();
        this.expect(TokenKind.CloseBrace);
      } else if (p.kind === TokenKind.TransitionsKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        transitions = this.parseTransitions();
        this.expect(TokenKind.CloseBrace);
      } else if (p.kind === TokenKind.EffectsKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        effects = this.parseEffects();
        this.expect(TokenKind.CloseBrace);
      } else if (p.kind === TokenKind.ReturnsKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        returns = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const rname = this.expectIdentText();
          this.expect(TokenKind.Colon);
          const rtype = this.parseType();
          returns.push({ name: rname, type: rtype });
        }
        this.expect(TokenKind.CloseBrace);
      } else if (p.kind === TokenKind.OnKw) {
        this.advance(); this.expect(TokenKind.Colon);
        trigger = this.parseSymbolRef();
      } else {
        this.error(p, `Unexpected property in workflow: '${p.text}'`);
        this.advance();
      }
    }
    this.expect(TokenKind.CloseBrace);
    return {
      kind: 'workflow', name, capability, authorization, input, reads, writes,
      rules, steps, transitions, effects, returns, trigger,
      location: this.loc(start),
    };
  }

  // -----------------------------------------------------------------------
  // Action / Event / Schedule
  // -----------------------------------------------------------------------
  private parseAction(): ActionDecl {
    const start = this.expect(TokenKind.ActionKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let title: string | undefined;
    let workflow: readonly string[] | undefined;
    let description: string | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.TitleKw) { this.advance(); this.expect(TokenKind.Colon); title = this.expectStringValue(); }
      else if (p.kind === TokenKind.WorkflowKw) { this.advance(); this.expect(TokenKind.Colon); workflow = this.parseSymbolRef(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else { this.error(p, `Unexpected property in action: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'action', name, title, workflow, description, location: this.loc(start) };
  }

  private parseEvent(): EventDecl {
    const start = this.expect(TokenKind.EventKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let payload: TypeExpr | undefined;
    let description: string | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.PayloadKw) { this.advance(); this.expect(TokenKind.Colon); payload = this.parseType(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else { this.error(p, `Unexpected property in event: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'event', name, payload, description, location: this.loc(start) };
  }

  private parseSchedule(): ScheduleDecl {
    const start = this.expect(TokenKind.ScheduleKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let cron: string | undefined;
    let description: string | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.CronKw) { this.advance(); this.expect(TokenKind.Colon); cron = this.expectStringValue(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else { this.error(p, `Unexpected property in schedule: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'schedule', name, cron, description, location: this.loc(start) };
  }

  // -----------------------------------------------------------------------
  // Surface
  // -----------------------------------------------------------------------
  private parseSurface(): SurfaceDecl {
    const start = this.expect(TokenKind.SurfaceKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let surfaceKind: string | undefined;
    let title: string | readonly string[] | undefined;
    let description: string | undefined;
    let capability: readonly string[] | undefined;
    let binds: readonly string[] | undefined;
    let serialization: readonly string[] | undefined;
    let surfaces: string[][] | undefined;
    let actions: string[][] | undefined;
    let rules: string[][] | undefined;
    let hooks: HookDecl[] | undefined;
    let fields: FieldDecl[] | undefined;

    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.KindKw) { this.advance(); this.expect(TokenKind.Colon); surfaceKind = this.expectIdentText(); }
      else if (p.kind === TokenKind.TitleKw) {
        this.advance(); this.expect(TokenKind.Colon);
        if (this.check(TokenKind.StringLiteral)) { title = this.expectStringValue(); }
        else { title = this.parseSymbolRef(); }
      }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else if (p.kind === TokenKind.CapabilityKw) { this.advance(); this.expect(TokenKind.Colon); capability = this.parseSymbolRef(); }
      else if (p.kind === TokenKind.BindsKw) { this.advance(); this.expect(TokenKind.Colon); binds = this.parseSymbolRef(); }
      else if (p.kind === TokenKind.SerializationKw) { this.advance(); this.expect(TokenKind.Colon); serialization = this.parseSymbolRef(); }
      else if (p.kind === TokenKind.SurfaceKw) { /* nested 'surfaces' is a keyword collision — use plural */ this.advance(); this.expect(TokenKind.Colon); surfaces = this.parseSymbolRefList(); }
      else if (p.kind === TokenKind.ActionsKw) { this.advance(); this.expect(TokenKind.Colon); actions = this.parseSymbolRefList(); }
      else if (p.kind === TokenKind.RulesKw) { this.advance(); this.expect(TokenKind.Colon); rules = this.parseSymbolRefList(); }
      else if (p.kind === TokenKind.HooksKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        hooks = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const hname = this.expectIdentText();
          this.expect(TokenKind.Colon);
          const htarget = this.parseSymbolRef();
          hooks.push({ name: hname, target: htarget });
        }
        this.expect(TokenKind.CloseBrace);
      }
      else if (p.kind === TokenKind.FieldsKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        fields = [...this.parseFieldList()];
        this.expect(TokenKind.CloseBrace);
      }
      else { this.error(p, `Unexpected property in surface: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return {
      kind: 'surface', name, surfaceKind, title, description, capability,
      binds, serialization, surfaces, actions, rules, hooks, fields,
      location: this.loc(start),
    };
  }

  // -----------------------------------------------------------------------
  // Rendering (simplified — handles target, platform, layout, grid, placement, style)
  // -----------------------------------------------------------------------
  private parseRendering(): RenderingDecl {
    const start = this.expect(TokenKind.RenderingKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let target: readonly string[] | undefined;
    let platform: string | undefined;
    let layout: string | undefined;
    let grid: GridBlock | undefined;
    let placements: PlacementEntry[] | undefined;
    let styles: StyleProperty[] | undefined;
    let bindings: BindEntry[] | undefined;
    let components: string[][] | undefined;

    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.TargetKw) { this.advance(); this.expect(TokenKind.Colon); target = this.parseSymbolRef(); }
      else if (p.kind === TokenKind.PlatformKw) { this.advance(); this.expect(TokenKind.Colon); platform = this.expectIdentText(); }
      else if (p.kind === TokenKind.LayoutKw) { this.advance(); this.expect(TokenKind.Colon); layout = this.expectIdentText(); }
      else if (p.kind === TokenKind.GridKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        grid = this.parseGridBlock();
        this.expect(TokenKind.CloseBrace);
      }
      else if (p.kind === TokenKind.PlacementKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        placements = this.parsePlacementBlock();
        this.expect(TokenKind.CloseBrace);
      }
      else if (p.kind === TokenKind.StyleKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        styles = this.parseStyleBlock();
        this.expect(TokenKind.CloseBrace);
      }
      else if (p.kind === TokenKind.BindKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        bindings = this.parseBindBlock();
        this.expect(TokenKind.CloseBrace);
      }
      else if (p.kind === TokenKind.ComponentsKw) {
        this.advance(); this.expect(TokenKind.Colon);
        components = this.parseSymbolRefList();
      }
      else { this.error(p, `Unexpected property in rendering: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return {
      kind: 'rendering', name, target, platform, layout, grid, placements,
      styles, bindings, components, location: this.loc(start),
    };
  }

  // -----------------------------------------------------------------------
  // Design: tokens, theme, strings
  // -----------------------------------------------------------------------
  private parseTokens(): TokensDecl {
    const start = this.expect(TokenKind.TokensKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    const categories: TokenCategoryBlock[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const catName = this.expectIdentText();
      this.expect(TokenKind.Colon);
      this.expect(TokenKind.OpenBrace);
      const tokens: TokenEntry[] = [];
      while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
        const tName = this.expectIdentText();
        this.expect(TokenKind.Colon);
        const tVal = this.parseValueNode();
        tokens.push({ name: tName, value: tVal });
      }
      this.expect(TokenKind.CloseBrace);
      categories.push({ name: catName, tokens });
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'tokens', name, categories, location: this.loc(start) };
  }

  private parseTheme(): ThemeDecl {
    const start = this.expect(TokenKind.ThemeKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let extendsName = '';
    if (this.check(TokenKind.ExtendsKw)) {
      this.advance(); this.expect(TokenKind.Colon);
      extendsName = this.expectIdentText();
    }
    const overrides: TokenCategoryBlock[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const catName = this.expectIdentText();
      this.expect(TokenKind.Colon);
      this.expect(TokenKind.OpenBrace);
      const tokens: TokenEntry[] = [];
      while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
        const tName = this.expectIdentText();
        this.expect(TokenKind.Colon);
        const tVal = this.parseValueNode();
        tokens.push({ name: tName, value: tVal });
      }
      this.expect(TokenKind.CloseBrace);
      overrides.push({ name: catName, tokens });
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'theme', name, extends: extendsName, overrides, location: this.loc(start) };
  }

  private parseStrings(): StringsDecl {
    const start = this.expect(TokenKind.StringsKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    const entries: StringEntry[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const key = this.expectIdentText();
      this.expect(TokenKind.Colon);
      const val = this.expectStringValue();
      entries.push({ key, value: val });
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'strings', name, entries, location: this.loc(start) };
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------
  private parseSerialization(): SerializationDecl {
    const start = this.expect(TokenKind.SerializationKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    const properties: KeyValuePair[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const key = this.expectIdentText();
      this.expect(TokenKind.Colon);
      const val = this.parseValueNode();
      properties.push({ key, value: val });
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'serialization', name, properties, location: this.loc(start) };
  }

  // -----------------------------------------------------------------------
  // Integration
  // -----------------------------------------------------------------------
  private parseIntegration(): IntegrationDecl {
    const start = this.expect(TokenKind.IntegrationKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let title: string | undefined;
    let description: string | undefined;
    let integrationKind: string | undefined;
    let protocol: string | undefined;
    let ser: readonly string[] | undefined;
    let auth: KeyValuePair[] | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.TitleKw) { this.advance(); this.expect(TokenKind.Colon); title = this.expectStringValue(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else if (p.kind === TokenKind.KindKw) { this.advance(); this.expect(TokenKind.Colon); integrationKind = this.expectIdentText(); }
      else if (p.kind === TokenKind.ProtocolKw) { this.advance(); this.expect(TokenKind.Colon); protocol = this.expectIdentText(); }
      else if (p.kind === TokenKind.SerializationKw) { this.advance(); this.expect(TokenKind.Colon); ser = this.parseSymbolRef(); }
      else if (p.kind === TokenKind.AuthKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        auth = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const k = this.expectIdentText();
          this.expect(TokenKind.Colon);
          const v = this.parseValueNode();
          auth.push({ key: k, value: v });
        }
        this.expect(TokenKind.CloseBrace);
      }
      else { this.error(p, `Unexpected property in integration: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'integration', name, title, description, integrationKind, protocol, serialization: ser, auth, location: this.loc(start) };
  }

  // -----------------------------------------------------------------------
  // Platform: transport, storage, execution, extension
  // -----------------------------------------------------------------------
  private parseTransport(): TransportDecl {
    const start = this.expect(TokenKind.TransportKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let target: readonly string[] | undefined;
    let protocol: string | undefined;
    let style: string | undefined;
    let description: string | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.TargetKw) { this.advance(); this.expect(TokenKind.Colon); target = this.parseSymbolRef(); }
      else if (p.kind === TokenKind.ProtocolKw) { this.advance(); this.expect(TokenKind.Colon); protocol = this.expectIdentText(); }
      else if (p.kind === TokenKind.StyleKw) { this.advance(); this.expect(TokenKind.Colon); style = this.expectIdentText(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else { this.error(p, `Unexpected in transport: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'transport', name, target, protocol, style, description, location: this.loc(start) };
  }

  private parseStorage(): StorageDecl {
    const start = this.expect(TokenKind.StorageKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let target: readonly string[] | undefined;
    let model: string | undefined;
    let table: string | undefined;
    let indexes: IndexEntry[] | undefined;
    let description: string | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.TargetKw) { this.advance(); this.expect(TokenKind.Colon); target = this.parseSymbolRef(); }
      else if (p.kind === TokenKind.ModelKw) { this.advance(); this.expect(TokenKind.Colon); model = this.expectIdentText(); }
      else if (p.kind === TokenKind.TableKw) { this.advance(); this.expect(TokenKind.Colon); table = this.expectStringValue(); }
      else if (p.kind === TokenKind.IndexesKw) {
        this.advance(); this.expect(TokenKind.Colon);
        indexes = this.parseIndexList();
      }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else { this.error(p, `Unexpected in storage: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'storage', name, target, model, table, indexes, description, location: this.loc(start) };
  }

  private parseExecution(): ExecutionDecl {
    const start = this.expect(TokenKind.ExecutionKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let target: readonly string[] | undefined;
    let mode: string | undefined;
    let description: string | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.TargetKw) { this.advance(); this.expect(TokenKind.Colon); target = this.parseSymbolRef(); }
      else if (p.kind === TokenKind.ModeKw) { this.advance(); this.expect(TokenKind.Colon); mode = this.expectIdentText(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else { this.error(p, `Unexpected in execution: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'execution', name, target, mode, description, location: this.loc(start) };
  }

  private parseExtension(): ExtensionDecl {
    const start = this.expect(TokenKind.ExtensionKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let target: readonly string[] | undefined;
    let extensionKind: string | undefined;
    let language: string | undefined;
    let description: string | undefined;
    let contract: ContractBlock | undefined;
    let body: string | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.TargetKw) { this.advance(); this.expect(TokenKind.Colon); target = this.parseSymbolRef(); }
      else if (p.kind === TokenKind.KindKw) { this.advance(); this.expect(TokenKind.Colon); extensionKind = this.expectIdentText(); }
      else if (p.kind === TokenKind.LanguageKw) { this.advance(); this.expect(TokenKind.Colon); language = this.expectStringValue(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else if (p.kind === TokenKind.ContractKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        contract = this.parseContractBlock();
        this.expect(TokenKind.CloseBrace);
      }
      else if (p.kind === TokenKind.BodyKw) {
        this.advance();
        body = this.expectCodeLiteral();
      }
      else { this.error(p, `Unexpected in extension: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'extension', name, target, extensionKind, language, description, contract, body, location: this.loc(start) };
  }

  // -----------------------------------------------------------------------
  // Governance
  // -----------------------------------------------------------------------
  private parseConstitution(): ConstitutionDecl {
    const start = this.expect(TokenKind.ConstitutionKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let description: string | undefined;
    let appliesTo: string[][] | undefined;
    let packages: PackageRef[] | undefined;
    let policies: PolicyBlock[] | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else if (p.kind === TokenKind.AppliesToKw) { this.advance(); this.expect(TokenKind.Colon); appliesTo = this.parseSymbolRefList(); }
      else if (p.kind === TokenKind.UseKw) {
        this.advance(); this.expect(TokenKind.Colon);
        packages = this.parsePackageRefList();
      }
      else if (p.kind === TokenKind.PoliciesKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        policies = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const pName = this.expectIdentText();
          this.expect(TokenKind.OpenBrace);
          const props: KeyValuePair[] = [];
          while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
            const k = this.expectIdentText();
            this.expect(TokenKind.Colon);
            const v = this.parseValueNode();
            props.push({ key: k, value: v });
          }
          this.expect(TokenKind.CloseBrace);
          policies.push({ name: pName, properties: props });
        }
        this.expect(TokenKind.CloseBrace);
      }
      else { this.error(p, `Unexpected in constitution: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'constitution', name, description, appliesTo, packages, policies, location: this.loc(start) };
  }

  private parseSecurity(): SecurityDecl {
    const start = this.expect(TokenKind.SecurityKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let appliesTo: string[][] | undefined;
    let requires: string[][] | undefined;
    let description: string | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.AppliesToKw) { this.advance(); this.expect(TokenKind.Colon); appliesTo = this.parseSymbolRefList(); }
      else if (p.kind === TokenKind.RequiresKw) { this.advance(); this.expect(TokenKind.Colon); requires = this.parseSymbolRefList(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else { this.error(p, `Unexpected in security: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'security', name, appliesTo, requires, description, location: this.loc(start) };
  }

  private parsePrivacy(): PrivacyDecl {
    const start = this.expect(TokenKind.PrivacyKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let appliesTo: string[][] | undefined;
    let classification: string | undefined;
    let retention: string | undefined;
    let redactOn: string[][] | undefined;
    let exportable: boolean | undefined;
    let erasable: boolean | undefined;
    let description: string | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.AppliesToKw) { this.advance(); this.expect(TokenKind.Colon); appliesTo = this.parseSymbolRefList(); }
      else if (p.kind === TokenKind.ClassificationKw) { this.advance(); this.expect(TokenKind.Colon); classification = this.expectIdentText(); }
      else if (p.kind === TokenKind.RetentionKw) { this.advance(); this.expect(TokenKind.Colon); retention = this.expectStringValue(); }
      else if (p.kind === TokenKind.RedactOnKw) { this.advance(); this.expect(TokenKind.Colon); redactOn = this.parseSymbolRefList(); }
      else if (p.kind === TokenKind.ExportableKw) { this.advance(); this.expect(TokenKind.Colon); exportable = this.expectBooleanValue(); }
      else if (p.kind === TokenKind.ErasableKw) { this.advance(); this.expect(TokenKind.Colon); erasable = this.expectBooleanValue(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else { this.error(p, `Unexpected in privacy: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'privacy', name, appliesTo, classification, retention, redactOn, exportable, erasable, description, location: this.loc(start) };
  }

  private parseValidation(): ValidationDecl {
    const start = this.expect(TokenKind.ValidationKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let appliesTo: string[][] | undefined;
    let requires: string[][] | undefined;
    let description: string | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.AppliesToKw) { this.advance(); this.expect(TokenKind.Colon); appliesTo = this.parseSymbolRefList(); }
      else if (p.kind === TokenKind.RequiresKw) { this.advance(); this.expect(TokenKind.Colon); requires = this.parseSymbolRefList(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else { this.error(p, `Unexpected in validation: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'validation', name, appliesTo, requires, description, location: this.loc(start) };
  }

  // -----------------------------------------------------------------------
  // Runtime
  // -----------------------------------------------------------------------
  private parseSecret(): SecretDecl {
    const start = this.expect(TokenKind.SecretKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let description: string | undefined;
    let source: string | undefined;
    let env: string | undefined;
    let path: string | undefined;
    let scope: string[][] | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else if (p.kind === TokenKind.SourceKw) { this.advance(); this.expect(TokenKind.Colon); source = this.expectIdentText(); }
      else if (p.kind === TokenKind.EnvKw) { this.advance(); this.expect(TokenKind.Colon); env = this.expectStringValue(); }
      else if (p.kind === TokenKind.PathKw) { this.advance(); this.expect(TokenKind.Colon); path = this.expectStringValue(); }
      else if (p.kind === TokenKind.ScopeKw) { this.advance(); this.expect(TokenKind.Colon); scope = this.parseSymbolRefList(); }
      else { this.error(p, `Unexpected in secret: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'secret', name, description, source, env, path, scope, location: this.loc(start) };
  }

  private parseEnvironment(): EnvironmentDecl {
    const start = this.expect(TokenKind.EnvironmentKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let url: string | undefined;
    let description: string | undefined;
    let secrets: EnvironmentSecretEntry[] | undefined;
    let integrations: EnvironmentIntegrationEntry[] | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.UrlKw) { this.advance(); this.expect(TokenKind.Colon); url = this.expectStringValue(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else if (p.kind === TokenKind.SecretsKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        secrets = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const sn = this.expectIdentText();
          this.expect(TokenKind.Colon);
          const sv = this.parseValueNode();
          secrets.push({ name: sn, value: sv });
        }
        this.expect(TokenKind.CloseBrace);
      }
      else if (p.kind === TokenKind.IntegrationsKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        integrations = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const ref = this.parseSymbolRef();
          this.expect(TokenKind.Colon);
          const iv = this.parseValueNode();
          integrations.push({ ref, value: iv });
        }
        this.expect(TokenKind.CloseBrace);
      }
      else { this.error(p, `Unexpected in environment: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'environment', name, url, description, secrets, integrations, location: this.loc(start) };
  }

  private parseDeployment(): DeploymentDecl {
    const start = this.expect(TokenKind.DeploymentKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let environments: string[][] | undefined;
    let description: string | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.EnvironmentsKw) { this.advance(); this.expect(TokenKind.Colon); environments = this.parseSymbolRefList(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else { this.error(p, `Unexpected in deployment: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'deployment', name, environments, description, location: this.loc(start) };
  }

  // -----------------------------------------------------------------------
  // Test
  // -----------------------------------------------------------------------
  private parseTest(): TestDecl {
    const start = this.expect(TokenKind.TestKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let target: readonly string[] = [];
    let description: string | undefined;
    let given: GivenEntry[] | undefined;
    let expect: ExpectEntry[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.TargetKw) { this.advance(); this.expect(TokenKind.Colon); target = this.parseSymbolRef(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else if (p.kind === TokenKind.GivenKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        given = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const ref = this.parseSymbolRef();
          this.expect(TokenKind.Colon);
          const val = this.parseValueNode();
          given.push({ ref, value: val });
        }
        this.expect(TokenKind.CloseBrace);
      }
      else if (p.kind === TokenKind.ExpectKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        expect = this.parseExpectBlock();
        this.expect(TokenKind.CloseBrace);
      }
      else { this.error(p, `Unexpected in test: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'test', name, target, description, given, expect, location: this.loc(start) };
  }

  // -----------------------------------------------------------------------
  // Product ref
  // -----------------------------------------------------------------------
  private parseProductRef(): ProductRefDecl {
    const start = this.expect(TokenKind.ProductRefKw);
    const name = this.expectIdentText();
    this.expect(TokenKind.OpenBrace);
    let product: string | undefined;
    let version: string | undefined;
    let description: string | undefined;
    let consumes: ConsumesBlock | undefined;
    let auth: KeyValuePair[] | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.ProductKw) { this.advance(); this.expect(TokenKind.Colon); product = this.expectStringValue(); }
      else if (p.kind === TokenKind.VersionKw) { this.advance(); this.expect(TokenKind.Colon); version = this.expectStringValue(); }
      else if (p.kind === TokenKind.DescriptionKw) { this.advance(); this.expect(TokenKind.Colon); description = this.expectStringValue(); }
      else if (p.kind === TokenKind.ConsumesKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        const entries: ConsumesEntry[] = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const cat = this.expectIdentText();
          this.expect(TokenKind.Colon);
          const syms = this.parseSymbolRefList();
          entries.push({ category: cat, symbols: syms });
        }
        this.expect(TokenKind.CloseBrace);
        consumes = { entries };
      }
      else if (p.kind === TokenKind.AuthKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        auth = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const k = this.expectIdentText();
          this.expect(TokenKind.Colon);
          const v = this.parseValueNode();
          auth.push({ key: k, value: v });
        }
        this.expect(TokenKind.CloseBrace);
      }
      else { this.error(p, `Unexpected in product_ref: '${p.text}'`); this.advance(); }
    }
    this.expect(TokenKind.CloseBrace);
    return { kind: 'product_ref', name, product, version, description, consumes, auth, location: this.loc(start) };
  }

  // =======================================================================
  // Helper parsers
  // =======================================================================

  private parseFieldList(): FieldDecl[] {
    const fields: FieldDecl[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const tok = this.peek();
      if (!this.isIdentLike(tok)) break;
      const fname = this.expectIdentText();
      this.expect(TokenKind.Colon);
      const ftype = this.parseType();
      let defaultValue: ValueNode | undefined;
      if (this.check(TokenKind.Equals)) {
        this.advance();
        defaultValue = this.parseValueNode();
      }
      fields.push({ name: fname, type: ftype, defaultValue, location: this.loc(tok) });
    }
    return fields;
  }

  private parseType(): TypeExpr {
    const tok = this.peek();
    const loc = this.loc(tok);

    // Check for primitive
    if (tok.kind === TokenKind.Identifier || this.isIdentLike(tok)) {
      const name = tok.text;
      if ((PRIMITIVE_TYPES as readonly string[]).includes(name)) {
        this.advance();
        return { kind: 'primitive', name: name as PrimitiveTypeName, location: loc };
      }
      // Generic: optional<T> or list<T>
      if ((name === 'optional' || name === 'list') && this.tokens[this.pos + 1]?.kind === TokenKind.LessThan) {
        this.advance(); // skip wrapper name
        this.advance(); // skip <
        const inner = this.parseType();
        if (this.check(TokenKind.GreaterThan)) this.advance();
        return { kind: 'generic', wrapper: name, inner, location: loc };
      }
      // Domain reference (possibly qualified)
      return this.parseTypeRef();
    }
    // Fallback
    this.error(tok, `Expected type, got '${tok.text}'`);
    this.advance();
    return { kind: 'primitive', name: 'string', location: loc };
  }

  private parseTypeRef(): TypeExpr {
    const segments = this.parseSymbolRef();
    /* v8 ignore start */
    const loc: SourceLocation = segments.length > 0
      ? this.loc(this.tokens[this.pos - 1]!)
      : { file: this.file, line: 1, column: 1, endLine: 1, endColumn: 1 };
    /* v8 ignore stop */
    return { kind: 'ref', segments, location: loc };
  }

  private parseSymbolRef(): string[] {
    const segments: string[] = [];
    const tok = this.peek();
    if (this.isIdentLike(tok)) {
      segments.push(this.expectIdentText());
      while (this.check(TokenKind.Dot)) {
        this.advance();
        segments.push(this.expectIdentText());
      }
    }
    return segments;
  }

  private parseSymbolRefList(): string[][] {
    this.expect(TokenKind.OpenBracket);
    const refs: string[][] = [];
    while (!this.check(TokenKind.CloseBracket) && !this.isEof()) {
      refs.push(this.parseSymbolRef());
      if (this.check(TokenKind.Comma)) this.advance(); // allow trailing comma
    }
    this.expect(TokenKind.CloseBracket);
    return refs;
  }

  private parseIdentList(): string[] {
    this.expect(TokenKind.OpenBracket);
    const items: string[] = [];
    while (!this.check(TokenKind.CloseBracket) && !this.isEof()) {
      items.push(this.expectIdentText());
      if (this.check(TokenKind.Comma)) this.advance();
    }
    this.expect(TokenKind.CloseBracket);
    return items;
  }

  private parseSymbolRefBlock(): string[][] {
    const refs: string[][] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      refs.push(this.parseSymbolRef());
    }
    return refs;
  }

  private parsePermissionList(): string[] {
    this.expect(TokenKind.OpenBracket);
    const perms: string[] = [];
    while (!this.check(TokenKind.CloseBracket) && !this.isEof()) {
      // permissions can be dotted: invoice.create
      const segments = this.parseSymbolRef();
      perms.push(segments.join('.'));
      if (this.check(TokenKind.Comma)) this.advance();
    }
    this.expect(TokenKind.CloseBracket);
    return perms;
  }

  private parseSteps(): Step[] {
    const steps: Step[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.CallKw) {
        this.advance();
        const target = this.parseSymbolRef();
        steps.push({ kind: 'call', target });
      } else if (p.kind === TokenKind.DecideKw) {
        this.advance();
        const decideName = this.expectIdentText();
        this.expect(TokenKind.OpenBrace);
        const branches: WhenBranch[] = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          this.expect(TokenKind.WhenKw);
          const whenName = this.expectIdentText();
          this.expect(TokenKind.Arrow);
          const bp = this.peek();
          let branchAction: StepCall | { kind: 'fail'; code: string };
          if (bp.kind === TokenKind.CallKw) {
            this.advance();
            branchAction = { kind: 'call', target: this.parseSymbolRef() };
          } else if (bp.kind === TokenKind.FailKw) {
            this.advance();
            branchAction = { kind: 'fail', code: this.expectIdentText() };
          } else {
            this.error(bp, `Expected 'call' or 'fail' in when branch`);
            branchAction = { kind: 'fail', code: 'error' };
            this.advance();
          }
          branches.push({ when: whenName, action: branchAction });
        }
        this.expect(TokenKind.CloseBrace);
        steps.push({ kind: 'decide', name: decideName, branches });
      } else if (p.kind === TokenKind.FailKw) {
        this.advance();
        const code = this.expectIdentText();
        steps.push({ kind: 'fail', code });
      } else {
        this.error(p, `Expected step ('call', 'decide', or 'fail'), got '${p.text}'`);
        this.advance();
      }
    }
    return steps;
  }

  private parseTransitions(): TransitionStmt[] {
    const transitions: TransitionStmt[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      // Parse full dotted path: Entity.field or module.Entity.field
      // parseSymbolRef greedily consumes dots, so we split: last segment = field, rest = entity ref
      const fullRef = this.parseSymbolRef();
      /* v8 ignore start */
      if (fullRef.length < 2) {
        this.error(this.peek(), `Expected Entity.field in transition, got '${fullRef.join('.')}'`);
        break;
      }
      /* v8 ignore stop */
      const field = fullRef.pop()!;
      const entityRef = fullRef;
      this.expect(TokenKind.Colon);
      const from = this.expectIdentText();
      this.expect(TokenKind.Arrow);
      const to = this.expectIdentText();
      transitions.push({ entity: entityRef, field, from, to });
    }
    return transitions;
  }

  private parseEffects(): Effect[] {
    const effects: Effect[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.AuditKw) {
        this.advance();
        const msg = this.expectStringValue();
        effects.push({ kind: 'audit', value: msg });
      } else if (p.kind === TokenKind.NotifyKw) {
        this.advance();
        effects.push({ kind: 'notify', value: this.parseSymbolRef() });
      } else if (p.kind === TokenKind.EmitKw) {
        this.advance();
        effects.push({ kind: 'emit', value: this.parseSymbolRef() });
      /* v8 ignore start */
      } else {
        // generic symbol ref effect
        effects.push({ kind: 'ref', value: this.parseSymbolRef() });
      }
      /* v8 ignore stop */
    }
    return effects;
  }

  private parseExpectBlock(): ExpectEntry[] {
    const entries: ExpectEntry[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.AuthorizationKw) {
        this.advance(); this.expect(TokenKind.OpenBrace);
        const auths: AuthorizationExpectation[] = [];
        while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
          const actor = this.expectIdentText();
          this.expect(TokenKind.Colon);
          const expected = this.expectIdentText();
          auths.push({ actor, expected });
        }
        this.expect(TokenKind.CloseBrace);
        entries.push({ key: 'authorization', value: auths });
      } else {
        const key = this.expectIdentText();
        this.expect(TokenKind.Colon);
        if (this.check(TokenKind.StringLiteral)) {
          entries.push({ key, value: this.expectStringValue() });
        } else {
          const v = this.parseValueNode();
          entries.push({ key, value: v });
        }
      }
    }
    return entries;
  }

  private parseValueNode(): ValueNode {
    const tok = this.peek();
    if (tok.kind === TokenKind.StringLiteral) {
      this.advance();
      return { kind: 'string', value: unquote(tok.text) };
    }
    if (tok.kind === TokenKind.IntegerLiteral) {
      this.advance();
      return { kind: 'integer', value: parseInt(tok.text, 10) };
    }
    if (tok.kind === TokenKind.DecimalLiteral) {
      this.advance();
      return { kind: 'decimal', value: parseFloat(tok.text) };
    }
    if (tok.kind === TokenKind.BooleanTrue) { this.advance(); return { kind: 'boolean', value: true }; }
    if (tok.kind === TokenKind.BooleanFalse) { this.advance(); return { kind: 'boolean', value: false }; }
    if (tok.kind === TokenKind.OpenBracket) {
      this.advance();
      const items: ValueNode[] = [];
      while (!this.check(TokenKind.CloseBracket) && !this.isEof()) {
        items.push(this.parseValueNode());
        if (this.check(TokenKind.Comma)) this.advance();
      }
      this.expect(TokenKind.CloseBracket);
      return { kind: 'list', items };
    }
    // Identifier or dotted ref
    /* v8 ignore start */
    if (this.isIdentLike(tok)) {
      /* v8 ignore stop */
      const segments = this.parseSymbolRef();
      if (segments.length === 1) {
        return { kind: 'identifier', value: segments[0]! };
      }
      return { kind: 'ref', segments };
    /* v8 ignore start */
    }
    this.error(tok, `Expected value, got '${tok.text}'`);
    this.advance();
    return { kind: 'string', value: '' };
    /* v8 ignore stop */
  }

  private parseExpressionUntilNewline(): Expression {
    // Collect tokens until we hit a keyword that starts a new property,
    // a closing brace, or EOF
    const exprTokens: Token[] = [];
    while (!this.isEof()) {
      const t = this.peek();
      if (t.kind === TokenKind.CloseBrace) break;
      // Stop at property-starting keywords only when followed by ':'
      // (a bare keyword like 'title' can also be a field reference in an expression)
      if (isPropertyKeyword(t.kind) && this.tokens[this.pos + 1]?.kind === TokenKind.Colon) break;
      exprTokens.push(t);
      this.advance();
    }
    exprTokens.push({
      kind: TokenKind.EOF, text: '', pos: 0, line: 0, column: 0, end: 0,
    });
    const pos = { value: 0 };
    return parseExpression(exprTokens, pos, this.file);
  }

  private parseGridBlock(): GridBlock {
    let columns: GridTrackValue[] | undefined;
    let rows: GridTrackValue[] | undefined;
    let gap: ValueNode | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.ColumnsKw) {
        this.advance(); this.expect(TokenKind.Colon);
        columns = this.parseGridTrackList();
      } else if (p.kind === TokenKind.RowsKw) {
        this.advance(); this.expect(TokenKind.Colon);
        rows = this.parseGridTrackList();
      } else if (p.kind === TokenKind.GapKw) {
        this.advance(); this.expect(TokenKind.Colon);
        gap = this.parseValueNode();
      } else {
        this.error(p, `Unexpected in grid: '${p.text}'`);
        this.advance();
      }
    }
    return { columns, rows, gap };
  }

  private parseGridTrackList(): GridTrackValue[] {
    this.expect(TokenKind.OpenBracket);
    const tracks: GridTrackValue[] = [];
    while (!this.check(TokenKind.CloseBracket) && !this.isEof()) {
      const t = this.peek();
      if (t.kind === TokenKind.AutoKw) {
        this.advance();
        tracks.push({ kind: 'auto' });
      } else if (t.kind === TokenKind.DimensionLiteral) {
        this.advance();
        const match = t.text.match(/^(\d+(?:\.\d+)?)(.+)$/);
        if (match) {
          tracks.push({ kind: 'dimension', value: parseFloat(match[1]!), unit: match[2]! });
        }
      /* v8 ignore start */
      } else if (t.kind === TokenKind.IntegerLiteral || t.kind === TokenKind.DecimalLiteral) {
        this.advance();
        tracks.push({ kind: 'number', value: parseFloat(t.text) });
      } else {
        this.advance();
      }
      /* v8 ignore stop */
      if (this.check(TokenKind.Comma)) this.advance();
    }
    this.expect(TokenKind.CloseBracket);
    return tracks;
  }

  private parsePlacementBlock(): PlacementEntry[] {
    const placements: PlacementEntry[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const name = this.expectIdentText();
      this.expect(TokenKind.Colon);
      this.expect(TokenKind.OpenBrace);
      let row: number | { from: number; to: number } | undefined;
      let column: number | { from: number; to: number } | undefined;
      while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
        const pp = this.peek();
        /* v8 ignore start */
        if (pp.kind === TokenKind.RowKw) {
          this.advance(); this.expect(TokenKind.Colon);
          row = this.parseGridValue();
        } else if (pp.kind === TokenKind.ColumnKw) {
          this.advance(); this.expect(TokenKind.Colon);
          column = this.parseGridValue();
        } else {
          this.advance();
        }
        /* v8 ignore stop */
      }
      this.expect(TokenKind.CloseBrace);
      placements.push({ name, row, column });
    }
    return placements;
  }

  /* v8 ignore start */
  private parseGridValue(): number | { from: number; to: number } {
    const tok = this.peek();
    if (tok.kind === TokenKind.IntegerLiteral) {
      const val = parseInt(tok.text, 10);
      this.advance();
      if (this.check(TokenKind.DotDot)) {
        this.advance();
        const end = parseInt(this.expectIntText(), 10);
        return { from: val, to: end };
      }
      return val;
    }
    this.advance();
    return 1;
  }
  /* v8 ignore stop */

  private parseStyleBlock(): StyleProperty[] {
    const props: StyleProperty[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const pname = this.expectIdentText();
      this.expect(TokenKind.Colon);
      if (this.isIdentLike(this.peek()) && this.tokens[this.pos + 1]?.kind === TokenKind.Dot) {
        props.push({ name: pname, value: this.parseSymbolRef() });
      } else {
        props.push({ name: pname, value: this.parseValueNode() });
      }
    }
    return props;
  }

  private parseBindBlock(): BindEntry[] {
    const entries: BindEntry[] = [];
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const from = this.parseSymbolRef();
      this.expect(TokenKind.Colon);
      const to = this.parseSymbolRef();
      entries.push({ from, to });
    }
    return entries;
  }

  private parseContractBlock(): ContractBlock {
    let input: TypeExpr | undefined;
    let output: TypeExpr | undefined;
    while (!this.check(TokenKind.CloseBrace) && !this.isEof()) {
      const p = this.peek();
      if (p.kind === TokenKind.InputKw) { this.advance(); this.expect(TokenKind.Colon); input = this.parseType(); }
      else if (p.text === 'output') { this.advance(); this.expect(TokenKind.Colon); output = this.parseType(); }
      else { this.error(p, `Unexpected in contract: '${p.text}'`); this.advance(); }
    }
    return { input, output };
  }

  private parseIndexList(): IndexEntry[] {
    this.expect(TokenKind.OpenBracket);
    const indexes: IndexEntry[] = [];
    while (!this.check(TokenKind.CloseBracket) && !this.isEof()) {
      let unique = false;
      if (this.check(TokenKind.UniqueKw)) {
        this.advance();
        unique = true;
      }
      this.expect(TokenKind.OpenBracket);
      const fields: string[] = [];
      while (!this.check(TokenKind.CloseBracket) && !this.isEof()) {
        fields.push(this.expectIdentText());
        if (this.check(TokenKind.Comma)) this.advance();
      }
      this.expect(TokenKind.CloseBracket);
      indexes.push({ fields, unique });
      if (this.check(TokenKind.Comma)) this.advance();
    }
    this.expect(TokenKind.CloseBracket);
    return indexes;
  }

  private parsePackageRefList(): PackageRef[] {
    this.expect(TokenKind.OpenBracket);
    const refs: PackageRef[] = [];
    while (!this.check(TokenKind.CloseBracket) && !this.isEof()) {
      // Parse: registry/backend/nestjs@1.1
      let path = '';
      while (!this.isEof()) {
        const t = this.peek();
        if (t.kind === TokenKind.AtSign) break;
        /* v8 ignore next */
        if (t.kind === TokenKind.Comma || t.kind === TokenKind.CloseBracket) break;
        path += t.text;
        this.advance();
      }
      let version = '';
      if (this.check(TokenKind.AtSign)) {
        this.advance();
        // version: could be number, decimal, or string
        while (!this.isEof()) {
          const t = this.peek();
          if (t.kind === TokenKind.Comma || t.kind === TokenKind.CloseBracket) break;
          version += t.text;
          this.advance();
        }
      }
      refs.push({ path: path.trim(), version: version.trim() });
      if (this.check(TokenKind.Comma)) this.advance();
    }
    this.expect(TokenKind.CloseBracket);
    return refs;
  }

  // =======================================================================
  // Token helpers
  // =======================================================================

  private peek(): Token {
    /* v8 ignore next */
    return this.tokens[this.pos] ?? { kind: TokenKind.EOF, text: '', pos: 0, line: 0, column: 0, end: 0 };
  }

  private advance(): Token {
    const tok = this.peek();
    if (tok.kind !== TokenKind.EOF) this.pos++;
    return tok;
  }

  private check(kind: TokenKind): boolean {
    return this.peek().kind === kind;
  }

  private isEof(): boolean {
    return this.peek().kind === TokenKind.EOF;
  }

  private expect(kind: TokenKind): Token {
    const tok = this.peek();
    /* v8 ignore start */
    if (tok.kind === kind) {
      return this.advance();
    }
    /* v8 ignore stop */
    /* v8 ignore start */
    this.error(tok, `Expected '${kind}', got '${tok.text || 'EOF'}'`);
    return tok;
    /* v8 ignore stop */
  }

  private expectIdentText(): string {
    const tok = this.peek();
    /* v8 ignore start */
    if (this.isIdentLike(tok)) {
      this.advance();
      return tok.text;
    }
    /* v8 ignore stop */
    this.error(tok, `Expected identifier, got '${tok.text || 'EOF'}'`);
    this.advance();
    return '_error_';
  }

  private expectIntText(): string {
    const tok = this.peek();
    if (tok.kind === TokenKind.IntegerLiteral) {
      this.advance();
      return tok.text;
    }
    this.error(tok, `Expected integer, got '${tok.text}'`);
    this.advance();
    return '0';
  }

  private expectStringValue(): string {
    const tok = this.peek();
    if (tok.kind === TokenKind.StringLiteral) {
      this.advance();
      return unquote(tok.text);
    }
    this.error(tok, `Expected string literal, got '${tok.text}'`);
    this.advance();
    return '';
  }

  private expectBooleanValue(): boolean {
    const tok = this.peek();
    if (tok.kind === TokenKind.BooleanTrue) { this.advance(); return true; }
    if (tok.kind === TokenKind.BooleanFalse) { this.advance(); return false; }
    this.error(tok, `Expected boolean, got '${tok.text}'`);
    this.advance();
    return false;
  }

  private expectCodeLiteral(): string {
    const tok = this.peek();
    if (tok.kind === TokenKind.CodeLiteral) {
      this.advance();
      return extractCodeLiteral(tok.text);
    }
    this.error(tok, `Expected code literal ("""), got '${tok.text}'`);
    this.advance();
    return '';
  }

  private isIdentLike(tok: Token): boolean {
    if (tok.kind === TokenKind.Identifier) return true;
    // Many keywords can appear as identifiers in property/field positions
    // since Prodara has a large keyword set. We allow keywords in identifier
    // positions when they serve as names.
    return isKeywordToken(tok.kind);
  }

  private error(tok: Token, message: string): void {
    this.bag.add({
      phase: 'parser',
      category: 'syntax_error',
      severity: 'error',
      code: 'PRD0100',
      message,
      file: this.file,
      line: tok.line,
      column: tok.column,
    });
  }

  private loc(tok: Token): SourceLocation {
    return {
      file: this.file,
      line: tok.line,
      column: tok.column,
      endLine: tok.line,
      endColumn: tok.column + tok.text.length,
    };
  }
}

// =======================================================================
// Utilities
// =======================================================================

/* v8 ignore start */
function unquote(s: string): string {
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  }
  return s;
}
/* v8 ignore stop */

function extractCodeLiteral(s: string): string {
  // Strip opening/closing """ and dedent
  let inner = s.slice(3);
  if (inner.endsWith('"""')) inner = inner.slice(0, -3);
  // Remove leading newline
  if (inner.startsWith('\n')) inner = inner.slice(1);
  else if (inner.startsWith('\r\n')) inner = inner.slice(2);
  // Remove trailing newline before closing
  /* v8 ignore next */
  if (inner.endsWith('\n')) inner = inner.slice(0, -1);
  // Dedent: find minimum leading whitespace
  const lines = inner.split('\n');
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const indent = line.length - line.trimStart().length;
    /* v8 ignore start */
    if (indent < minIndent) minIndent = indent;
    /* v8 ignore stop */
  }
  /* v8 ignore next */
  if (minIndent === Infinity) minIndent = 0;
  return lines.map((l) => l.slice(minIndent)).join('\n');
}

function isPropertyKeyword(kind: TokenKind): boolean {
  switch (kind) {
    case TokenKind.EntityKw:
    case TokenKind.ConditionKw:
    case TokenKind.MessageKw:
    case TokenKind.CapabilityKw:
    case TokenKind.AuthorizationKw:
    case TokenKind.InputKw:
    case TokenKind.ReadsKw:
    case TokenKind.WritesKw:
    case TokenKind.RulesKw:
    case TokenKind.StepsKw:
    case TokenKind.TransitionsKw:
    case TokenKind.EffectsKw:
    case TokenKind.ReturnsKw:
    case TokenKind.OnKw:
    case TokenKind.TitleKw:
    case TokenKind.DescriptionKw:
    case TokenKind.KindKw:
    case TokenKind.TargetKw:
    /* v8 ignore start */
    case TokenKind.WorkflowKw:
      return true;
    default:
      return false;
  }
}
/* v8 ignore stop */

/** Check if a TokenKind is a keyword (used for allowing keywords-as-identifiers). */
/* v8 ignore start */
function isKeywordToken(kind: TokenKind): boolean {
  switch (kind) {
    case TokenKind.Identifier:
    case TokenKind.StringLiteral:
    case TokenKind.IntegerLiteral:
    case TokenKind.DecimalLiteral:
    case TokenKind.BooleanTrue:
    case TokenKind.BooleanFalse:
    case TokenKind.CodeLiteral:
    case TokenKind.DimensionLiteral:
    case TokenKind.OpenBrace:
    case TokenKind.CloseBrace:
    case TokenKind.OpenBracket:
    case TokenKind.CloseBracket:
    case TokenKind.OpenParen:
    case TokenKind.CloseParen:
    case TokenKind.Colon:
    case TokenKind.Comma:
    case TokenKind.Dot:
    case TokenKind.Equals:
    case TokenKind.LessThan:
    case TokenKind.GreaterThan:
    case TokenKind.Arrow:
    case TokenKind.DotDot:
    case TokenKind.AtSign:
    case TokenKind.Slash:
    case TokenKind.GreaterEqual:
    case TokenKind.LessEqual:
    case TokenKind.EqualsEquals:
    case TokenKind.BangEquals:
    case TokenKind.EOF:
    case TokenKind.Unknown:
      return false;
    default:
      // All keyword tokens return true
      return true;
  }
}
/* v8 ignore stop */
