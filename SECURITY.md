# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Current |

## Reporting a Vulnerability

If you discover a security vulnerability in Prodara, please report it responsibly:

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Email **security@prodara.net** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. You will receive an acknowledgment within 48 hours
4. We will work with you to understand and address the issue before any public disclosure

## Security Considerations

### Compiler

- The compiler processes `.prd` specification files. It does **not** execute arbitrary code.
- File I/O is limited to reading `.prd` files, reading/writing `.prodara/` build state, and reading `prodara.config.json`.
- The `execSync` calls in the validation module execute only commands explicitly configured in `prodara.config.json` by the user.

### CLI

- The global CLI (`@prodara/cli`) delegates to the project-local `@prodara/compiler`. It does **not** download or execute remote code.
- Version compatibility is checked before delegation.

### LSP Server

- The LSP server processes document content received from the editor. It does not access the network or execute external commands.

### Audit Logs

- Audit logs written to `.prodara/runs/` redact sensitive configuration values (API keys, secrets, tokens).
- The `SENSITIVE_KEYS` pattern matching ensures common secret field names are caught.

## Dependencies

We monitor dependencies for known vulnerabilities using `npm audit` and GitHub Dependabot alerts.
