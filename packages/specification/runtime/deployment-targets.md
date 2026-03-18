# Deployment Targets

This document defines the semantic role of deployment declarations.

Deployment declarations group environments into deployable targets.

## Purpose

Deployment targets exist to:

- represent deployable applications or services
- connect environments to a delivery target
- guide generated operational artifacts

## Examples

Examples of deployment targets:

- web_app
- backend_api
- worker_cluster
- admin_console

## Effective deployment model

A resolved deployment target should include:

- target name
- included environments
- relevant runtime references
- relevant constitution/policy overlays if applicable

## Validation

Deployment validation fails when:

- referenced environments do not exist
- duplicate deployment identities exist
- target composition is inconsistent
