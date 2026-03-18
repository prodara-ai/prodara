# Environment Resolution

This document defines how environment-specific configuration is resolved.

Environment resolution maps abstract environment declarations to effective runtime configuration.

## Purpose

Environment resolution exists to:

- bind secrets to environments
- apply integration overrides
- compute effective runtime values
- support local/dev/staging/production deployment flows

## Resolution order

Recommended resolution order:

1. product/default runtime values
2. environment declaration values
3. environment secret bindings
4. environment integration overrides
5. deployment-target-specific runtime augmentation

## Effective environment model

The result of environment resolution should include:

- environment identity
- URLs and endpoints
- bound secret references
- integration overrides
- resolved deployment target references

## Diagnostics

Environment resolution should fail when:

- an environment references an unknown secret
- an environment references an unknown integration
- duplicate overrides conflict ambiguously
