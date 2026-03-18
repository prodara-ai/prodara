# Prodara Language Specification v0.1
## Formal Grammar

This document defines the formal grammar of the Prodara language (`.prd` files).

The grammar specifies syntax only. Semantic meaning, validation rules, and Product Graph construction are defined elsewhere.

The notation is EBNF-like and is intended to be readable by humans and implementable by tools.

## File

    file
      = { top_level_decl } ;

## Top-level declarations

    top_level_decl
      = product_decl
      | module_decl ;

Prodara v0.1 requires product and language constructs to appear inside modules, except for the single workspace-level `product` declaration.

## Product

    product_decl
      = "product" identifier "{"
          { product_property }
        "}" ;

    product_property
      = "title" ":" string
      | "version" ":" string
      | "description" ":" string
      | "modules" ":" symbol_list
      | publishes_block ;

    publishes_block
      = "publishes" "{"
          { publishes_entry }
        "}" ;

    publishes_entry
      = identifier ":" symbol_list ;

## Module

    module_decl
      = "module" identifier "{"
          { module_item }
        "}" ;

    module_item
      = import_decl
      | actor_decl
      | capability_decl
      | entity_decl
      | value_decl
      | enum_decl
      | rule_decl
      | workflow_decl
      | action_decl
      | surface_decl
      | rendering_decl
      | tokens_decl
      | theme_decl
      | strings_decl
      | serialization_decl
      | integration_decl
      | transport_decl
      | storage_decl
      | execution_decl
      | extension_decl
      | event_decl
      | schedule_decl
      | test_decl
      | constitution_decl
      | security_decl
      | privacy_decl
      | validation_decl
      | secret_decl
      | environment_decl
      | deployment_decl
      | product_ref_decl ;

## Imports

    import_decl
      = "import" identifier [ "as" identifier ] "from" module_path ;

    module_path
      = identifier { "." identifier } ;

## Actors

    actor_decl
      = "actor" identifier "{"
          { actor_property }
        "}" ;

    actor_property
      = "title" ":" string
      | "description" ":" string ;

## Capabilities

    capability_decl
      = "capability" identifier "{"
          { capability_property }
        "}" ;

    capability_property
      = "title" ":" string
      | "description" ":" string
      | "actors" ":" symbol_list ;

## Entities and values

    entity_decl
      = "entity" identifier "{"
          { field_decl }
        "}" ;

    value_decl
      = "value" identifier "{"
          { field_decl }
        "}" ;

    field_decl
      = identifier ":" type [ "=" value ] ;

## Enums

    enum_decl
      = "enum" identifier "{"
          { enum_member }
        "}" ;

    enum_member
      = identifier [ metadata_block ] ;

    metadata_block
      = "{"
          { metadata_property }
        "}" ;

    metadata_property
      = identifier ":" value ;

## Rules

    rule_decl
      = "rule" identifier "{"
          "entity" ":" symbol_ref
          "condition" ":" expression
          "message" ":" symbol_ref
        "}" ;

See the **Expressions** section below for the `expression` production.

## Workflows

    workflow_decl
      = "workflow" identifier "{"
          { workflow_property }
        "}" ;

    workflow_property
      = "capability" ":" symbol_ref
      | authorization_block
      | input_block
      | reads_block
      | writes_block
      | rules_block
      | steps_block
      | transitions_block
      | effects_block
      | returns_block
      | trigger_block ;

    authorization_block
      = "authorization" "{"
          { authorization_entry }
        "}" ;

    authorization_entry
      = identifier ":" permission_list ;

    permission_list
      = "[" [ symbol_ref { "," symbol_ref } ] "]" ;

    input_block
      = "input" "{"
          { field_decl }
        "}" ;

    reads_block
      = "reads" "{"
          { symbol_ref }
        "}" ;

    writes_block
      = "writes" "{"
          { symbol_ref }
        "}" ;

    rules_block
      = "rules" "{"
          { symbol_ref }
        "}" ;

    steps_block
      = "steps" "{"
          { step_stmt }
        "}" ;

    step_stmt
      = call_stmt
      | decide_stmt
      | fail_stmt ;

    call_stmt
      = "call" symbol_ref ;

    decide_stmt
      = "decide" identifier "{"
          { when_branch }
        "}" ;

    when_branch
      = "when" identifier "->" branch_target ;

    branch_target
      = call_stmt
      | fail_stmt ;

    fail_stmt
      = "fail" identifier ;

    transitions_block
      = "transitions" "{"
          { transition_stmt }
        "}" ;

    transition_stmt
      = symbol_ref "." identifier ":" identifier "->" identifier ;

    effects_block
      = "effects" "{"
          { effect_stmt }
        "}" ;

    effect_stmt
      = "audit" string
      | "notify" symbol_ref
      | "emit" symbol_ref
      | symbol_ref ;

    returns_block
      = "returns" "{"
          { return_decl }
        "}" ;

    return_decl
      = identifier ":" type ;

    trigger_block
      = "on" ":" symbol_ref ;

## Actions

    action_decl
      = "action" identifier "{"
          { action_property }
        "}" ;

    action_property
      = "title" ":" string
      | "workflow" ":" symbol_ref
      | "description" ":" string ;

## Surfaces and forms

    surface_decl
      = "surface" identifier "{"
          { surface_property }
        "}" ;

    surface_property
      = "kind" ":" identifier
      | "title" ":" string
      | "title" ":" symbol_ref
      | "description" ":" string
      | "capability" ":" symbol_ref
      | "binds" ":" symbol_ref
      | "serialization" ":" symbol_ref
      | "surfaces" ":" symbol_list
      | "actions" ":" symbol_list
      | "rules" ":" symbol_list
      | hooks_block
      | fields_block ;

    hooks_block
      = "hooks" "{"
          { hook_decl }
        "}" ;

    hook_decl
      = identifier ":" symbol_ref ;

    fields_block
      = "fields" "{"
          { field_decl }
        "}" ;

## Rendering

    rendering_decl
      = "rendering" identifier "{"
          { rendering_property }
        "}" ;

    rendering_property
      = "target" ":" symbol_ref
      | "platform" ":" identifier
      | "layout" ":" identifier
      | grid_block
      | placement_block
      | style_block
      | bind_block
      | components_block
      | responsive_block ;

    grid_block
      = "grid" "{"
          { grid_property }
        "}" ;

    grid_property
      = "columns" ":" grid_track_list
      | "rows" ":" grid_track_list
      | "gap" ":" value ;

    grid_track_list
      = "[" grid_track_value { "," grid_track_value } "]" ;

    grid_track_value
      = number
      | dimension
      | "auto" ;

    placement_block
      = "placement" "{"
          { placement_entry }
        "}" ;

    placement_entry
      = identifier ":" "{"
          { placement_property }
        "}" ;

    placement_property
      = "row" ":" grid_value
      | "column" ":" grid_value ;

    grid_value
      = number
      | number ".." number ;

    style_block
      = "style" "{"
          { style_property }
        "}" ;

    style_property
      = identifier ":" value
      | identifier ":" symbol_ref ;

    bind_block
      = "bind" "{"
          { bind_entry }
        "}" ;

    bind_entry
      = symbol_ref ":" symbol_ref ;

    components_block
      = "components" ":" symbol_list ;

    responsive_block
      = "at" symbol_ref "{"
          { rendering_property }
        "}" ;

## Tokens and themes

    tokens_decl
      = "tokens" identifier "{"
          { token_category_block }
        "}" ;

    token_category_block
      = identifier ":" "{"
          { token_decl }
        "}" ;

    token_decl
      = identifier ":" value ;

    theme_decl
      = "theme" identifier "{"
          "extends" ":" identifier
          { token_category_block }
        "}" ;

## Strings

    strings_decl
      = "strings" identifier "{"
          { string_entry }
        "}" ;

    string_entry
      = identifier ":" string ;

## Serialization

    serialization_decl
      = "serialization" identifier "{"
          { serialization_property }
        "}" ;

    serialization_property
      = identifier ":" value ;

## Integrations

    integration_decl
      = "integration" identifier "{"
          { integration_property }
        "}" ;

    integration_property
      = "title" ":" string
      | "description" ":" string
      | "kind" ":" identifier
      | "protocol" ":" identifier
      | "serialization" ":" symbol_ref
      | auth_block ;

    auth_block
      = "auth" "{"
          { auth_property }
        "}" ;

    auth_property
      = identifier ":" symbol_ref ;

## Platform refinements

    transport_decl
      = "transport" identifier "{"
          { transport_property }
        "}" ;

    transport_property
      = "target" ":" symbol_ref
      | "protocol" ":" identifier
      | "style" ":" identifier
      | "description" ":" string ;

    storage_decl
      = "storage" identifier "{"
          { storage_property }
        "}" ;

    storage_property
      = "target" ":" symbol_ref
      | "model" ":" identifier
      | "table" ":" string
      | "indexes" ":" index_list
      | "description" ":" string ;

    index_list
      = "[" [ index_entry { "," index_entry } ] "]" ;

    index_entry
      = field_name_list
      | "unique" field_name_list ;

    field_name_list
      = "[" identifier { "," identifier } "]" ;

    execution_decl
      = "execution" identifier "{"
          { execution_property }
        "}" ;

    execution_property
      = "target" ":" symbol_ref
      | "mode" ":" identifier
      | "description" ":" string ;

    extension_decl
      = "extension" identifier "{"
          { extension_property }
        "}" ;

    extension_property
      = "target" ":" symbol_ref
      | "kind" ":" identifier
      | "language" ":" string
      | "description" ":" string
      | contract_block
      | body_block ;

    body_block
      = "body" code_literal ;

    contract_block
      = "contract" "{"
          { contract_property }
        "}" ;

    contract_property
      = "input" ":" type
      | "output" ":" type ;

## Events and schedules

    event_decl
      = "event" identifier "{"
          { event_property }
        "}" ;

    event_property
      = "payload" ":" type
      | "description" ":" string ;

    schedule_decl
      = "schedule" identifier "{"
          { schedule_property }
        "}" ;

    schedule_property
      = "cron" ":" string
      | "description" ":" string ;

## Tests

    test_decl
      = "test" identifier "{"
          "target" ":" symbol_ref
          [ "description" ":" string ]
          [ given_block ]
          expect_block
        "}" ;

    given_block
      = "given" "{"
          { given_entry }
        "}" ;

    given_entry
      = symbol_ref ":" value ;

    expect_block
      = "expect" "{"
          { expect_entry }
        "}" ;

    expect_entry
      = identifier ":" value
      | "authorization" "{"
          { authorization_expectation }
        "}" ;

    authorization_expectation
      = identifier ":" identifier ;

## Governance

    constitution_decl
      = "constitution" identifier "{"
          { constitution_property }
        "}" ;

    constitution_property
      = "description" ":" string
      | "applies_to" ":" symbol_list
      | "use" ":" package_ref_list
      | policies_block ;

    package_ref_list
      = "[" [ package_ref { "," package_ref } ] "]" ;

    package_ref
      = package_path "@" version_literal ;

    package_path
      = [ scope_prefix ] identifier { "/" identifier } ;

    scope_prefix
      = "@" identifier "/" ;

    version_literal
      = string | identifier ;

    policies_block
      = "policies" "{"
          { policy_block }
        "}" ;

    policy_block
      = identifier "{"
          { policy_property }
        "}" ;

    policy_property
      = identifier ":" value ;

    security_decl
      = "security" identifier "{"
          { security_property }
        "}" ;

    security_property
      = "applies_to" ":" symbol_list
      | "requires" ":" symbol_list
      | "description" ":" string ;

    privacy_decl
      = "privacy" identifier "{"
          { privacy_property }
        "}" ;

    privacy_property
      = "applies_to" ":" symbol_list
      | "classification" ":" identifier
      | "retention" ":" string
      | "redact_on" ":" symbol_list
      | "exportable" ":" boolean
      | "erasable" ":" boolean
      | "description" ":" string ;

    validation_decl
      = "validation" identifier "{"
          { validation_property }
        "}" ;

    validation_property
      = "applies_to" ":" symbol_list
      | "requires" ":" symbol_list
      | "description" ":" string ;

## Runtime

    secret_decl
      = "secret" identifier "{"
          { secret_property }
        "}" ;

    secret_property
      = "description" ":" string
      | "source" ":" identifier
      | "env" ":" string
      | "path" ":" string
      | "scope" ":" symbol_list ;

    environment_decl
      = "environment" identifier "{"
          { environment_property }
        "}" ;

    environment_property
      = "url" ":" string
      | "description" ":" string
      | environment_secrets_block
      | environment_integrations_block ;

    environment_secrets_block
      = "secrets" "{"
          { environment_secret_entry }
        "}" ;

    environment_secret_entry
      = identifier ":" value ;

    environment_integrations_block
      = "integrations" "{"
          { environment_integration_entry }
        "}" ;

    environment_integration_entry
      = symbol_ref ":" value ;

    deployment_decl
      = "deployment" identifier "{"
          { deployment_property }
        "}" ;

    deployment_property
      = "environments" ":" symbol_list
      | "description" ":" string ;

## Common grammar forms

    symbol_ref
      = identifier { "." identifier } ;

    symbol_list
      = "[" [ symbol_ref { "," symbol_ref } ] "]" ;

    value_list
      = "[" [ value { "," value } ] "]" ;

    type
      = primitive_type
      | symbol_ref
      | generic_type ;

    generic_type
      = identifier "<" type ">" ;

    primitive_type
      = "string"
      | "integer"
      | "decimal"
      | "boolean"
      | "uuid"
      | "date"
      | "datetime" ;

    value
      = string
      | number
      | dimension
      | boolean
      | identifier
      | symbol_ref
      | value_list ;

    boolean
      = "true" | "false" ;

    number
      = integer | decimal ;

    dimension
      = number identifier ;

## Expressions

Expressions are used in rule conditions and test expectations. Prodara v0.1 supports a focused expression language with logical operators and comparisons.

    expression
      = or_expr ;

    or_expr
      = and_expr { "or" and_expr } ;

    and_expr
      = not_expr { "and" not_expr } ;

    not_expr
      = "not" not_expr
      | comparison_expr ;

    comparison_expr
      = access_expr [ comparison_op access_expr ] ;

    comparison_op
      = ">" | "<" | ">=" | "<=" | "==" | "!=" ;

    access_expr
      = atom { "." identifier } ;

    atom
      = identifier
      | number
      | string
      | boolean
      | "(" expression ")" ;

Operator precedence (highest to lowest):

1. Parentheses
2. Field access (`.`)
3. Comparison (`>`, `<`, `>=`, `<=`, `==`, `!=`)
4. `not`
5. `and`
6. `or`

Examples:

    total.amount > 0
    status == draft and total.amount > 0
    role == admin or role == manager
    not status == cancelled
    (status == draft or status == pending) and total.amount > 0

Future versions may expand the expression language to include arithmetic and function calls.

## Product References

    product_ref_decl
      = "product_ref" identifier "{"
          { product_ref_property }
        "}" ;

    product_ref_property
      = "product" ":" string
      | "version" ":" string
      | "description" ":" string
      | consumes_block
      | auth_block ;

    consumes_block
      = "consumes" "{"
          { consumes_entry }
        "}" ;

    consumes_entry
      = identifier ":" symbol_list ;

## Notes

This grammar is authoritative for syntax.

If a construct-specific spec example conflicts with this grammar, the grammar must be updated or the example corrected before the specification is considered stable.
