---
name: deploy
description: Pre-deployment checklist that enforces lint, type-check, and tests before any push to main
trigger: When the user asks to deploy, push to main, or release code
---

# Deployment Skill -- Pre-Deployment Checklist

You MUST run every step below **in order** before executing `git push` to the `main` branch.
If ANY step fails, STOP immediately, report the failure, and fix the issue before retrying.

## Checklist

### Step 1: Lint Check
```bash
npm run lint
```
- **Requirement:** Zero warnings, zero errors.
- If warnings exist, fix them before proceeding.

### Step 2: TypeScript Compilation Check
```bash
npx tsc --noEmit
```
- **Requirement:** Zero TypeScript errors.
- Do NOT use `// @ts-ignore` or `any` types to bypass errors.

### Step 3: Test Suite
```bash
npm test
```
- **Requirement:** All tests pass. Zero failures.
- If tests fail, diagnose the root cause and fix before proceeding.

### Step 4: Build Verification
```bash
npm run build
```
- **Requirement:** Build completes successfully with no errors.

### Step 5: Push to Main
Only after Steps 1-4 pass with zero errors:
```bash
git add -A
git commit -m "deploy: <concise description of changes>"
git push origin main
```

## Post-Deploy Verification
After pushing, confirm:
- [ ] GitHub Actions CI pipeline passes (check `.github/workflows/ci.yml`)
- [ ] No broken links on live pages
- [ ] All placeholder IDs documented in CLAUDE.md are flagged if still present

## Abort Conditions
- NEVER push if any lint error, type error, or test failure exists
- NEVER use `--force` push to main
- NEVER skip the test step, even for "small" changes
