# Secret Resolution

This document defines how symbolic secret declarations are resolved into runtime bindings.

The specification never stores secret values directly. It stores secret identities and source metadata.

## Purpose

Secret resolution exists to:

- map symbolic secrets to runtime secret providers
- support environment-specific bindings
- keep product specs safe for source control

## Resolution flow

1. load secret declaration
2. determine default source metadata
3. apply environment-specific secret override if present
4. produce resolved runtime secret binding

## Examples

A secret declared as:

    secret stripe_api_key {
      source: vault
    }

may resolve in production to:

- provider: vault
- path: vault.prod.stripe

and in local to:

- provider: env
- env: STRIPE_API_KEY

## Failure behavior

Resolution fails when:

- a referenced secret does not exist
- required environment binding is missing
- provider-specific metadata is incomplete
