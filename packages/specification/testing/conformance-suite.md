# Prodara Conformance Suite

This document defines the structure and purpose of the Prodara conformance suite.

The conformance suite exists to ensure that different compiler implementations behave consistently.

## Suite contents

A conformance suite should include:

- valid source fixtures
- invalid source fixtures
- expected diagnostics
- expected Product Graph snapshots where appropriate
- expected planning results where appropriate
- expected verification results where appropriate

## Fixture categories

### Lexical fixtures
Examples of valid and invalid tokens.

### Syntax fixtures
Examples of valid and invalid grammar.

### Semantic fixtures
Examples of valid and invalid symbol resolution, typing, and workflow semantics.

### Graph fixtures
Examples used to verify Product Graph shape and stable IDs.

### Planning fixtures
Examples used to verify semantic diff and impacted-task planning.

### Generation fixtures
Examples of graph slices and expected artifact manifests, including extension seam preservation scenarios.

## Recommended repository structure

    testing/
      fixtures/
        valid/
        invalid/
      graph/
      planning/
      generation/

## Included starter fixtures

This repository includes starter valid and invalid fixtures under `testing/fixtures/`.

These fixtures should be expanded over time into a full conformance corpus.

## Goal

The conformance suite should let a new implementation prove that it conforms to the language and compiler contracts.
