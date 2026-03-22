# @prodara/cli

A thin global CLI wrapper that resolves and delegates to the project-local `@prodara/compiler`.

## Installation

```bash
npm install -g @prodara/cli
```

## How It Works

1. Walks up from the current directory to find `node_modules/@prodara/compiler`
2. Checks version compatibility (major versions must match)
3. Delegates all commands to the local compiler's CLI binary via `execFileSync`

This ensures you always run the compiler version pinned in your project's `package.json`.

## Usage

```bash
# Create a new project — automatically installs @prodara/compiler
prodara init my-project

# In a project with @prodara/compiler installed locally
prodara build
prodara validate
prodara graph
prodara plan
prodara test
prodara doctor
```

### Automatic Setup

`prodara init` handles project setup automatically:

1. Runs `npm init -y` if no `package.json` exists
2. Installs `@prodara/compiler` as a dev dependency
3. Scaffolds the `.prd` project structure

Use `--skip-install` to skip the npm init and compiler installation steps.

If no local compiler is found, the CLI prints installation instructions.

## License

MIT
