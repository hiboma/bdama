# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it via [GitHub Security Advisories](https://github.com/hiboma/bdama/security/advisories/new).

Please do **not** open a public issue for security vulnerabilities.

## Security Measures

This project uses the following security measures:

- **Pinned Actions**: All GitHub Actions are pinned to SHA hashes to prevent supply chain attacks
- **Dependabot**: Automated dependency updates for npm packages and GitHub Actions
- **npm audit**: CI pipeline fails on high-severity vulnerabilities
- **Minimal Permissions**: GitHub Actions workflows use least-privilege permissions
