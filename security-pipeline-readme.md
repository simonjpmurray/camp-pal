# Security Pipeline Setup Guide

## Files to add to your repo

```
.github/
  workflows/
    security-pipeline.yml   ← main workflow
.zap/
  rules.tsv                 ← OWASP ZAP config
```

---

## Required Secrets

Add these in GitHub → Settings → Secrets and variables → Actions:

| Secret | How to get it |
|--------|--------------|
| `SNYK_TOKEN` | Sign up at snyk.io → Account Settings → Auth Token |

## Required Variables

Add these in GitHub → Settings → Secrets and variables → Actions → Variables:

| Variable | Value |
|----------|-------|
| `STAGING_URL` | Your staging app URL e.g. `https://staging.yourapp.com` |

---

## What runs and when

| Check | On push/PR | Weekly (Mon 6am) | Manual |
|-------|-----------|-----------------|--------|
| Gitleaks (secret scan) | ✅ | ✅ | ✅ |
| Snyk (dependencies) | ✅ | ✅ | ✅ |
| CodeQL (static analysis) | ✅ | ✅ | ✅ |
| Auth & share link checks | ✅ | ✅ | ✅ |
| OWASP ZAP (web scan) | ❌ | ✅ | ✅ |

ZAP is excluded from push/PR runs because it needs a live staging URL.

---

## Also enable in GitHub (free, no config needed)

Go to your repo → Settings → Security:

- ✅ **Dependabot alerts** — flags vulnerable dependencies automatically
- ✅ **Dependabot security updates** — auto-raises PRs to fix them  
- ✅ **Secret scanning** — GitHub's built-in key/token detector
- ✅ **Code scanning** — works alongside CodeQL above

---

## Interpreting results

- **Gitleaks fail** → a secret was committed. Rotate that key immediately, then remove from git history
- **Snyk fail** → a high/critical CVE in a dependency. Check the PR Snyk raises and merge it
- **CodeQL alert** → review in the Security tab of your repo under Code Scanning
- **Auth check warnings** → manual review needed on the flagged routes
- **ZAP report** → download the HTML artifact from the Actions run for full detail

---

## Running ZAP manually

Trigger via GitHub Actions → Security Pipeline → Run workflow.
Useful before a release or after significant auth/routing changes.
