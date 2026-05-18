# CheckRay — Local Security Setup

This doc covers the local secret-scanning setup. The goal: **no secrets are
ever committed**, even by accident.

## Tools

- [Gitleaks](https://github.com/gitleaks/gitleaks) — scans for hardcoded
  secrets (API keys, tokens, private keys, etc.).
- [pre-commit](https://pre-commit.com/) — runs Gitleaks on staged changes
  every time you `git commit`.

## One-time install (macOS)

```bash
# Install Homebrew formulas
brew install gitleaks pre-commit

# From the repo root, install the git hook
pre-commit install
```

After this, every `git commit` will run Gitleaks against your staged changes.
If a secret is detected the commit is blocked.

> Linux / Windows: install Gitleaks via the [release binaries](https://github.com/gitleaks/gitleaks/releases)
> and `pip install pre-commit` (or `pipx install pre-commit`).

## How the pre-commit hook works

- Configuration lives in `.pre-commit-config.yaml` (repo root).
- It pins `gitleaks` at a specific tag, so everyone scans with the same version.
- Repo-specific allowlist (paths only, never patterns for real secrets) is in
  `.gitleaks.toml`.

The hook only scans **staged** changes for speed. Use the manual scan below for
a full-history check.

## Manual scans

Scan the working tree (uncommitted + tracked files):

```bash
gitleaks detect --source . --config .gitleaks.toml --verbose
```

Scan full git history (slower; good before releases):

```bash
gitleaks detect --source . --config .gitleaks.toml --log-opts="--all" --verbose
```

Scan just staged changes (same thing pre-commit does):

```bash
gitleaks protect --staged --config .gitleaks.toml --verbose
```

Run all pre-commit hooks against every file (not just staged):

```bash
pre-commit run --all-files
```

## What we expect to be clean

The following must **never** appear in committed files:

- `NEXT_PUBLIC_SUPABASE_URL` values that are not the public project URL
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Any value from `.env.local`
- Personal access tokens (GitHub, Vercel, Supabase, etc.)

Public, intentionally-shipped values (e.g. `NEXT_PUBLIC_*` Supabase anon
keys) belong in `.env.local` / Vercel env, not in source.

`.env.example` is allowlisted — it must only contain placeholder values
(`your-key-here`), never real ones.

## If Gitleaks blocks a commit

1. **Stop. Do not bypass.** Read the finding — it points to the file, line,
   and rule.
2. If it's a real secret:
   - Remove it from the file.
   - Rotate the credential immediately (treat it as compromised — git history
     is forever, and pre-commit only catches local commits).
   - Recommit.
3. If it's a false positive:
   - Refactor the code so the pattern doesn't look like a secret (preferred).
   - Or add a narrow path-based allowlist entry to `.gitleaks.toml`.
   - **Never** wildcard-allow real-looking secret patterns.

Avoid `--no-verify` to bypass pre-commit. It defeats the entire point.

## CI (future)

When we wire CI, add a Gitleaks job that runs on every PR:

```yaml
# .github/workflows/gitleaks.yml (example, not yet enabled)
name: gitleaks
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
