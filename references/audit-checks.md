# Audit Checks

Use this file as a lightweight prompt for repo-audit passes.

## Source of truth order
- code
- config
- migrations and bootstrap scripts
- current docs

## Check categories
- runtime modules and route prefixes match current-reality docs
- schema docs match migration runner behavior and preserved SQL history
- deploy and scaffolder notes match `.scaffold/project.json` and `.github/workflows/railway-deploy.yml`
- deleted files or missing references are removed from skills and docs
- validation docs only claim commands that exist

## Reporting format
- current state
- gap
- recommended target
- severity: high, medium, or low
